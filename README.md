# capture
# Recall

Recall is a macOS personal-memory capture tool that preserves source material,
the user's reason for saving it, and an AI-generated contextual interpretation
as separate, searchable layers.

The current repository is at **Layer 0**: product, architecture, and API
contracts are defined; application implementation has not started.

## Product baseline

The authoritative Build Week scope and execution plan is
[`docs/product-plan.md`](docs/product-plan.md). Any requirement or technical
choice introduced beyond that baseline must be highlighted in
[`docs/decisions.md`](docs/decisions.md) before implementation.

## Core workflow

```text
Capture source text and optional user note
→ persist the original Capture immediately
→ enrich it asynchronously with Structured Outputs
→ generate an embedding from the stable §12.1 text projection
→ retrieve it through keyword and semantic search
```

## Layer 0 contracts

- [`contracts/capture.schema.json`](contracts/capture.schema.json): client
  Capture creation payload.
- [`contracts/enriched_capture.schema.json`](contracts/enriched_capture.schema.json):
  model-generated enrichment payload.
- [`contracts/api.md`](contracts/api.md): localhost API, lifecycle, response,
  error, and search contracts.
- [`contracts/examples/`](contracts/examples/): handoff fixtures shared by the
  backend, macOS, and Chrome-extension owners.
- [`docs/architecture.md`](docs/architecture.md): system boundaries, ownership,
  and dependency direction.
- [`docs/decisions.md`](docs/decisions.md): accepted decisions and additions to
  the product baseline.

## Planned stack

- SwiftUI and AppKit macOS application
- Manifest V3 Chrome extension
- Python and FastAPI localhost backend
- SQLite with FTS5
- OpenAI Responses API with Structured Outputs
- OpenAI embeddings with local cosine-similarity search

## Environment

Copy `.env.example` to `.env` when backend work begins. Never commit `.env` or
an API key.

## Status

Layer 0 complete. The next implementation layer is the minimal backend
foundation and `GET /health`.
