import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

import storage
from routers import books, bookmarks, tts

DATA_DIR = storage.DATA_DIR
AUDIO_DIR = os.environ.get("AUDIO_DIR", "/app/audio")


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(os.path.join(DATA_DIR, "cache"), exist_ok=True)
    yield


app = FastAPI(title="TwelveReader API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(books.router)
app.include_router(bookmarks.router)
app.include_router(tts.router)

app.mount("/cache", StaticFiles(directory=os.path.join(DATA_DIR, "cache")), name="cache")
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")


@app.get("/health")
def health():
    return {"ok": True}
