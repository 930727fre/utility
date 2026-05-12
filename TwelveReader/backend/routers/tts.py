import os
from fastapi import APIRouter, HTTPException

import storage
from conversion import load_md, split_paragraphs, paragraph_id as make_paragraph_id
from tts_service import tts_service, _cache_path, DING_URL

router = APIRouter(prefix="/api/tts", tags=["tts"])


@router.delete("/{book_id}/cache")
async def clear_cache(book_id: str):
    await tts_service.clear_cache(book_id)
    return {"cleared": book_id}


@router.post("/{book_id}/{index}")
async def generate_tts(book_id: str, index: int):
    book = storage.get_book(book_id)
    if not book:
        raise HTTPException(404, "Book not found")

    book_dir = os.path.join(storage.DATA_DIR, book_id)
    try:
        md = load_md(book_dir, book_id)
    except FileNotFoundError:
        raise HTTPException(404, "Book content not found")

    paragraphs = split_paragraphs(md)
    if index < 0 or index >= len(paragraphs):
        raise HTTPException(404, "Paragraph index out of range")

    para = paragraphs[index]
    if para["kind"] in ("image", "table"):
        return {"url": DING_URL, "stop": True}

    pid = make_paragraph_id(book_id, index, para["text"])
    url, stop = await tts_service.get_or_generate(book_id, pid, para["text"])
    return {"url": url, "stop": stop}


@router.delete("/{book_id}/{index}")
async def evict_cached(book_id: str, index: int):
    book = storage.get_book(book_id)
    if not book:
        raise HTTPException(404, "Book not found")

    book_dir = os.path.join(storage.DATA_DIR, book_id)
    try:
        md = load_md(book_dir, book_id)
    except FileNotFoundError:
        return {"evicted": index}

    paragraphs = split_paragraphs(md)
    if 0 <= index < len(paragraphs):
        pid = make_paragraph_id(book_id, index, paragraphs[index]["text"])
        path = _cache_path(book_id, pid)
        if os.path.exists(path):
            os.remove(path)
    return {"evicted": index}
