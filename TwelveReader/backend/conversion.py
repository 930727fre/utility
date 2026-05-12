"""
Document conversion pipeline — marker subprocess + per-book folder normalization.

`marker_single` writes `<basename>/<basename>.md`, `<basename>_meta.json`, and
extracted image files inside `--output_dir`. This module shells out to it once
per upload, then flattens marker's subdirectory into the book folder so the
layout matches marker-test's output (everything flat, no `images/` subdir):

    /data/{book_id}/
        {book_id}.{epub|pdf}    ← original source
        {book_id}.md            ← converted markdown
        meta.json               ← marker's metadata (TOC, page stats)
        _page_*.png / .jpg ...  ← extracted figures, flat alongside the md

Markdown image references stay exactly as marker emitted them
(`![alt](_page_3_Figure_1.png)`); the frontend resolves any relative reference
through `/api/books/{id}/assets/<filename>`.
"""

import hashlib
import os
import re
import shutil
import subprocess
import xml.etree.ElementTree as ET
import zipfile
from pathlib import Path

from bs4 import BeautifulSoup
from markdown import markdown as md_to_html

ACCEPTED_EXTENSIONS = {".epub", ".pdf"}


def _extract_pdf_meta(path: Path) -> dict:
    try:
        from pypdf import PdfReader
        reader = PdfReader(str(path))
        m = reader.metadata or {}
        return {
            "title": (m.get("/Title") or "").strip(),
            "author": (m.get("/Author") or "").strip(),
        }
    except Exception as exc:
        print(f"[meta] pdf read failed: {exc}")
        return {"title": "", "author": ""}


def _extract_epub_meta(path: Path) -> dict:
    try:
        with zipfile.ZipFile(path) as z:
            container = ET.fromstring(z.read("META-INF/container.xml"))
            opf_path = container.find(
                ".//{urn:oasis:names:tc:opendocument:xmlns:container}rootfile"
            ).get("full-path")
            opf = ET.fromstring(z.read(opf_path))
            dc = "http://purl.org/dc/elements/1.1/"
            return {
                "title": (opf.findtext(f".//{{{dc}}}title") or "").strip(),
                "author": (opf.findtext(f".//{{{dc}}}creator") or "").strip(),
            }
    except Exception as exc:
        print(f"[meta] epub read failed: {exc}")
        return {"title": "", "author": ""}


def extract_meta(src_path: str) -> dict:
    """Read title/author from a PDF or EPUB. Returns {'title': str, 'author': str}.

    Empty strings on missing metadata or extraction failure — caller should fall
    back to the upload filename's stem.
    """
    p = Path(src_path)
    suffix = p.suffix.lower()
    if suffix == ".pdf":
        return _extract_pdf_meta(p)
    if suffix == ".epub":
        return _extract_epub_meta(p)
    return {"title": "", "author": ""}


def convert_file(book_id: str, src_path: str, book_dir: str) -> None:
    """Run marker on `src_path`, flatten output under `book_dir`."""
    src = Path(src_path)
    book_dir_p = Path(book_dir)
    book_dir_p.mkdir(parents=True, exist_ok=True)

    subprocess.run(
        [
            "marker_single", str(src),
            "--output_dir", str(book_dir_p),
            "--output_format", "markdown",
        ],
        check=True,
    )

    marker_subdir = book_dir_p / src.stem
    if not marker_subdir.is_dir():
        raise RuntimeError(f"marker did not produce expected subdir {marker_subdir}")

    md_src = marker_subdir / f"{src.stem}.md"
    meta_src = marker_subdir / f"{src.stem}_meta.json"
    md_dst = book_dir_p / f"{book_id}.md"
    meta_dst = book_dir_p / "meta.json"

    for item in marker_subdir.iterdir():
        if item == md_src:
            md_dst.write_text(
                _scrub_anchors(item.read_text(encoding="utf-8")),
                encoding="utf-8",
            )
            item.unlink()
        elif item == meta_src:
            shutil.move(str(item), str(meta_dst))
        else:
            shutil.move(str(item), str(book_dir_p / item.name))

    shutil.rmtree(marker_subdir)


_EMPTY_ANCHOR_SPAN_RE = re.compile(r'<span id="[^"]*"></span>')
_FRAGMENT_LINK_RE = re.compile(r'\[[^\]]{1,2}\]\(#[^)]+\)')


def _scrub_anchors(md: str) -> str:
    """Drop marker's cross-reference scaffolding.

    Empty `<span id="...">` anchors and `[text](#fragment)` links exist so that
    HTML-aware renderers can jump between footnote refs and their targets.
    Our paragraph-virtualized reader does neither, and react-markdown without
    rehype-raw renders the spans as literal escaped text. Stripping at
    conversion time keeps both the visible and spoken text clean.
    """
    md = _EMPTY_ANCHOR_SPAN_RE.sub("", md)
    md = _FRAGMENT_LINK_RE.sub("", md)
    return md


def load_md(book_dir: str, book_id: str) -> str:
    md_path = os.path.join(book_dir, f"{book_id}.md")
    with open(md_path, encoding="utf-8") as f:
        return f.read()


_IMAGE_ONLY_RE = re.compile(r"^\s*!\[[^\]]*\]\([^)]+\)\s*$", re.DOTALL)
_TABLE_SEP_RE = re.compile(r"^\s*\|[\s:|-]+\|\s*$", re.M)


def _classify(text: str) -> str:
    if _IMAGE_ONLY_RE.match(text):
        return "image"
    if text.lstrip().startswith("|") and _TABLE_SEP_RE.search(text):
        return "table"
    return "text"


def split_paragraphs(md: str) -> list[dict]:
    """Split markdown into typed paragraphs.

    Each entry: {"kind": "text"|"image"|"table", "text": str}.
    Indices match a naive `md.split(/\\n{2,}/).filter(Boolean)` on the frontend.
    """
    blocks = [b.strip() for b in re.split(r"\n{2,}", md) if b.strip()]
    return [{"kind": _classify(b), "text": b} for b in blocks]


def paragraph_id(book_id: str, index: int, text: str) -> str:
    raw = f"{book_id}|{index}|{text[:100]}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


def to_speech_text(md: str) -> str:
    """Strip markdown formatting so Kokoro doesn't pronounce syntax characters."""
    html = md_to_html(md, extensions=["tables"])
    return BeautifulSoup(html, "html.parser").get_text(separator=" ", strip=True)
