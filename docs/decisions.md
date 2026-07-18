# Recall decision log

This file records important architectural decisions and every clarification or
addition made beyond [`product-plan.md`](product-plan.md).

## Change classification

- **Baseline** — directly required by the product plan.
- **Clarification** — resolves an ambiguity without changing product scope.
- **Addition** — introduces behavior or a constraint not stated in the product
  plan. Additions must include rationale and impact.

## Decision index

| ID | Decision | Classification | Status |
| --- | --- | --- | --- |
| D-001 | Localhost monorepo architecture | Baseline | Accepted |
| D-002 | Separate request, enrichment, and transport contracts | Clarification | Accepted |
| D-003 | Persist before asynchronous enrichment | Baseline | Accepted |
| D-004 | Stable §12.1 embedding projection | Clarification | Accepted |
| D-005 | Versioned API response and error envelopes | Addition | Accepted |
| D-006 | Expose `context_truncated` in the Capture contract | Clarification | Accepted |
| D-007 | JSON Schema Draft 2020-12 for checked-in contracts | Addition | Accepted |

## D-001 — Localhost monorepo architecture

- Classification: Baseline
- Status: Accepted

Use a monorepo containing a SwiftUI/AppKit macOS app, a Manifest V3 Chrome
extension, and a FastAPI backend bound only to `127.0.0.1:8765`. SQLite, FTS5,
OpenAI integration, and search stay behind the backend boundary.

This supports independent work by both developers and the fastest reliable
Build Week demo path.

## D-002 — Separate request, enrichment, and transport contracts

- Classification: Clarification
- Status: Accepted

`capture.schema.json` validates client creation input.
`enriched_capture.schema.json` validates only model-generated Structured Output.
`api.md` owns HTTP envelopes and the complete persisted Capture representation.

This prevents OpenAI field names such as `title` from being confused with API
fields such as `ai_title`, and lets the backend map validated model output into
storage explicitly.

## D-003 — Persist before asynchronous enrichment

- Classification: Baseline
- Status: Accepted

`POST /v1/captures` validates and commits the original Capture before any model
request. It then returns a `processing` representation. AI failure changes
status to `error` without discarding source data or the user note.

## D-004 — Stable §12.1 embedding projection

- Classification: Clarification
- Status: Accepted

The embedding input uses the exact labels and order from product-plan §12.1.
Values are outer-trimmed, line endings are normalized to LF, list fields are
joined with `, ` in stored order, and missing values become empty strings.
Internal whitespace in source and note text is preserved.

Changing labels, order, or normalization requires an `enrichment_version`
increment and regeneration of existing embeddings.

## D-005 — Versioned API response and error envelopes

- Classification: Addition
- Status: Accepted
- Product impact: None; transport consistency only
- Schedule impact: Low

List endpoints return an object envelope rather than a bare array. Errors use a
stable `{ "error": { ... } }` envelope. Asynchronous creation and re-enrichment
return HTTP `202 Accepted`.

These conventions were not specified by the outline. They give the Swift and
extension clients stable parsing and error-display behavior without adding a
feature.

## D-006 — Expose `context_truncated`

- Classification: Clarification
- Status: Accepted

Product-plan §11.2 requires recording when surrounding context is truncated,
but the example request and SQL table omit the field. Layer 0 adds the optional
boolean `context_truncated` to Capture input and output, defaulting to `false`.
The persistence layer must add a matching non-null column with a false default.

This is a reconciliation of two baseline requirements, not new product scope.

## D-007 — JSON Schema Draft 2020-12

- Classification: Addition
- Status: Accepted
- Product impact: None
- Schedule impact: None

The client-input contract declares JSON Schema Draft 2020-12 and rejects
additional properties. The enrichment contract intentionally omits draft
metadata so its root object can be passed directly as the strict Structured
Output schema; it still uses only constructs valid in Draft 2020-12 and in the
subset supported by the OpenAI API. This provides precise contracts for Swift,
Python, and TypeScript consumers without requiring provider-specific wrappers
in the checked-in schema.

## Pending decisions

None for Layer 0. Model snapshots, embedding dimensions, background-task
mechanism, and SQLite migration tooling remain implementation-layer decisions
and must not be silently fixed here.
