# Recall backend

The backend is a local-only FastAPI service. Layers 1–2 provide validated
configuration, `GET /health`, numbered SQLite migrations, and transactional
Capture persistence. HTTP Capture CRUD routes begin in Layer 3.

Run all commands below from `services/backend/`.

## Install

```bash
python3 -m venv .venv
.venv/bin/python -m pip install --upgrade pip
.venv/bin/python -m pip install -r requirements.txt
```

The service reads optional configuration from the repository-root `.env` and
then from the shell environment. It starts safely without `.env` or an OpenAI
key. Copy `.env.example` to `.env` only when local overrides are needed.

`RECALL_HOST` must be `localhost` or a loopback IP address. The default is
`127.0.0.1`; public or LAN binding is rejected.

## Start

```bash
.venv/bin/python -m app
```

In another terminal:

```bash
curl --fail --silent http://127.0.0.1:8765/health
```

Without an API key, the expected response is:

```json
{"status":"ok","database":"ok","openai_configured":false}
```

The health probe creates the configured SQLite file if needed and checks it
with `SELECT 1` and verifies that every known migration is applied.

## Live build checklist

Open [http://127.0.0.1:8765/dev/checklist](http://127.0.0.1:8765/dev/checklist)
while the backend is running. The page rereads
`docs/developer-b-checklist.md` every two seconds, so saved checklist edits
appear without a service restart. The dashboard is read-only and local-only.

## SQLite persistence

Numbered SQL files live in `app/migrations/` and run transactionally during
backend startup and before repository access. The current migration creates the
product-plan `captures` table; FTS5 remains deferred to Layer 5.

Application code accesses Capture records through `app.repository` rather than
issuing SQL from HTTP handlers. Source fields and the user note are not accepted
by the enrichment-update method, preventing an AI update from overwriting them.

## Capture API

Layer 3 exposes create, newest-first list, and detail routes. From
`services/backend/`, create the checked-in example with:

```bash
curl --header 'Content-Type: application/json' \
  --data-binary @../../contracts/examples/capture-request.json \
  http://127.0.0.1:8765/v1/captures
```

The response is HTTP `202` with status `processing`. Enrichment does not run
until Layer 4, so Layer 3 records intentionally remain in that state.

Use the returned `id` in the detail route and list the newest Captures with:

```bash
curl http://127.0.0.1:8765/v1/captures/{id}
curl 'http://127.0.0.1:8765/v1/captures?limit=50&offset=0'
```

Validation failures and unknown Capture IDs use the versioned error envelope
in `contracts/api.md`.

## Test

```bash
.venv/bin/python -m pytest
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | unset | Enables later OpenAI layers when non-empty |
| `OPENAI_MODEL` | `gpt-5.6` | Later enrichment model |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Later embedding model |
| `RECALL_HOST` | `127.0.0.1` | Loopback-only bind host |
| `RECALL_PORT` | `8765` | Backend port, from 1 through 65535 |
| `RECALL_DATABASE_PATH` | `./data/recall.db` | SQLite file, relative to repository root |
| `RECALL_LOG_LEVEL` | `INFO` | Python logging level |
| `RECALL_CORS_ORIGINS` | unset | Comma-separated allowed origins for a later client layer |
