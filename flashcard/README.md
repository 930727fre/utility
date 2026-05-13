# Flashcard

A self-hosted spaced repetition flashcard app powered by the [FSRS](https://github.com/open-spaced-repetition/fsrs4anki) algorithm.

## Features

- FSRS algorithm for optimal review scheduling
- Daily cap of 20 new cards
- Streak tracking
- Batch import
- Word list editor
- Per-card updates persisted immediately to backend

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19 + TypeScript + Vite, Mantine 9, TanStack Query, React Router |
| Backend | FastAPI (Python) |
| FSRS | `py-fsrs` for review scheduling |
| Database | SQLite |
| Serving | Nginx |
| Container | Docker Compose |
| Access | Tailscale (or Cloudflare Tunnel) |

## Setup

### Prerequisites

- Docker + Docker Compose
- A Linux machine accessible via Tailscale or Cloudflare Tunnel

### Run

```bash
docker compose up -d
```

The app is served at `http://localhost` (port 80). The SQLite database is persisted at `./data/flashcard.db`.

## Batch Import Format

One card per line, `::` separated:

```
word::note::example sentence
Apple::蘋果::An apple a day keeps the doctor away.
```

## Architecture

```
[Browser]
    |
    | HTTP (Tailscale)
    v
[Nginx :80]
    ├── /        → Vite static build (React SPA)
    └── /api/*   → FastAPI :8000 (internal)
                      └── SQLite (./data/flashcard.db)
```

## API

Nginx maps `/api/*` → backend `/*`.

| Method | Endpoint | Description |
|---|---|---|
| GET    | `/api/health` | Health check |
| GET    | `/api/stats` | `{streak_count, due_count, new_available, ...}` for the dashboard |
| GET    | `/api/cards/queue` | Today's review queue (due + new, capped) |
| GET    | `/api/cards/search?q=...` | Search by word for the Edit page |
| GET    | `/api/cards` | All cards (rare; used by sync) |
| POST   | `/api/cards/batch` | Batch add cards (BatchAdd page) |
| PATCH  | `/api/cards/{id}` | Update a card's sentence / note |
| POST   | `/api/cards/{id}/review` | Submit a rating (1–4) → returns the rescheduled card |
| GET    | `/api/settings` | Fetch settings (runs streak logic) |
| PATCH  | `/api/settings` | Update settings |
| POST   | `/api/sync` | Upsert all cards + settings |

## UI

Follows the [utility repo's design language](../README.md#design-language) — monochrome warm-gray surfaces with one honey accent per page. Review-rating buttons (Again / Hard / Good / Easy) intentionally drop the conventional color coding in favor of position-based muscle memory + keyboard hints `[1] [2] [3] [4]`.
