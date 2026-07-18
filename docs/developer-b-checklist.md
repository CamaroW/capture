# Developer B live build checklist

Owner: Developer B — Intelligence and Data

Project: Recall

Last updated: 2026-07-18

Current phase: Layer 3 backend verified; macOS holder documented; Layer 4 is next

Current branch: `main`

Last verified commit: `0622ad0`

Last baseline cross-check: 2026-07-18 against all sections of
`docs/product-plan.md`

This is the live execution record for the backend, AI/data, retrieval, and
Chrome-extension workstream. Update it before and after meaningful work. Do not
mark a layer complete unless its exit gate has evidence.

## Status rules

- `[ ]` — not started
- `[~]` — in progress
- `[x]` — completed and verified
- `[!]` — blocked or failed; details must appear in the blocker/error log
- `[D]` — deliberately deferred with a documented reason

Update protocol:

1. Mark the active task `[~]` before implementation.
2. Record the command, test, or artifact that proves completion.
3. If a command or test fails, immediately append it to **Errors encountered**.
4. If progress requires another person, credential, hardware, or decision,
   immediately append it to **Open blockers and risks**.
5. Do not convert `[!]` to `[x]`; add a resolution entry, then mark the task.
6. Record every scope addition in `docs/decisions.md` before implementation.
7. Commit after a working vertical slice, not after partially broken work.

## Current status summary

| Layer | Scope | Status | Exit-gate evidence |
| --- | --- | --- | --- |
| 0 | Contracts and documentation | Complete | Schemas and fixtures validated; commit `e75f783` pushed |
| 1 | Backend foundation | Complete | 11 tests passed; live `/health` returned contracted `200` response |
| 2 | SQLite persistence | Complete | Commit `0622ad0` pushed; 30 tests and restart proof passed |
| 3 | Capture CRUD and first integration | Backend complete / integration deferred | 55 tests and live POST/SQLite/GET/list proof passed; D-013 holder awaits Developer A |
| 4 | OpenAI enrichment | Pending | Not started |
| 5 | FTS5 keyword retrieval | Pending | Not started |
| 6 | Chrome capture | Pending | Not started |
| 7 | Embeddings and hybrid retrieval | Pending | Not started |
| 8 | Reliability and demo readiness | Pending | Not started |
| 9 | Optional Apple on-device path | Gated | Decision D-008 accepted; prerequisites unmet |
| 10 | Final freeze and submission | Pending | Not started |

No hard blocker prevents Layer 3 work on the current branch. Layers 0–2 are
verified in `origin/main` at `0622ad0`; D-012 remains explicitly outside
product scope.

## Scope, schedule, and collaboration guardrails

These are baseline requirements, not optional process suggestions:

- P0 requires both Chrome web capture and clipboard/local-app capture, even
  though the minimum submission threshold says at least one stable capture
  path.
- P1 work must not begin before all three vertical slices pass. P2 remains out
  of the submission entirely; the only approved exception is the separately
  gated Apple experiment in D-008, which still cannot begin before Layers 1–8
  pass.
- `main` must remain runnable; merge small batches and require both developers
  to agree before changing a shared contract.
- Run at least two end-to-end integration checks each day.
- Freeze major features for the final half-day. On July 21, add no new platform,
  technology stack, database rewrite, complex agent, Safari extension, OCR,
  infrastructure, or major navigation change unless the main flow is broken.
- Priority order is:
  `stable real capture > AI contextual understanding > reliable retrieval > clear demo > visual polish > additional features`.

Sprint targets from the product plan:

| Date | Required target |
| --- | --- |
| July 18 | Contracts, FastAPI/health, SQLite, Capture CRUD, curl proof, and first macOS list integration |
| July 19 | Clipboard capture, OpenAI enrichment, FTS5/basic search, and keyword retrieval |
| July 20 | Complete Chrome context capture, embeddings/hybrid search, three clean demo passes, and first recording |
| July 21 | Fixes, polish, documentation, recordings, verification, and submission only |

Any schedule variance belongs in the blocker/risk log rather than being hidden
by layer completion percentages.

## Baseline versus implementation safeguards

The following checklist items are useful safeguards but are not product-plan
features or reasons to delay a vertical slice:

- structured operational logs and request identifiers;
- duplicate-submission/idempotency hardening beyond storing
  `client_capture_id`;
- stale-processing recovery beyond a visible error and manual retry;
- semantic non-empty post-validation and explicit refusal classification;
- embedding dimension/version migration policies beyond the configured MVP
  model.

Implement them only when they reduce demo risk, and document any contract or
storage impact first.

---

# Layer 0 — Contracts and documentation

Status: `[x]` complete

## Deliverables

- [x] Copy the authoritative outline to `docs/product-plan.md` without edits.
- [x] Create `docs/architecture.md` with boundaries and work ownership.
- [x] Create `docs/decisions.md` with baseline/addition classifications.
- [x] Create `contracts/capture.schema.json`.
- [x] Create `contracts/enriched_capture.schema.json`.
- [x] Create `contracts/api.md`.
- [x] Define the exact product-plan §12.1 embedding projection.
- [x] Create request, enrichment, ready-response, and embedding fixtures.
- [x] Create `.env.example` without a key.
- [x] Ignore `.env`, databases, build output, and developer-local files.
- [x] Add the optional Apple path as gated decision D-008.

## Validation evidence

- [x] JSON syntax validated with `jq`.
- [x] Schemas and positive fixtures validated with Draft 2020-12 tooling.
- [x] Negative fixtures rejected for missing fields, extra fields, and empty
  source content.
- [x] Generated §12.1 embedding input exactly matches the checked-in fixture.
- [x] `docs/product-plan.md` exactly matches the original outline.
- [x] Secret-pattern scan found no API key.
- [x] Git whitespace audit passed before commit.
- [x] Commit `e75f783` pushed to `origin/agent/layer-0-contracts`.

## Exit gate

- [x] Developer A can implement Swift request/response models from checked-in
  contracts without inventing field names.
- [x] All additions to the outline are visible in the decision log.

---

# Layer 1 — Backend foundation

Status: `[x]` complete

## Prerequisites

- [x] Confirm Layer 0 is merged before both developers branch. Verified in
  `origin/main` at merge commit `9c08243` on 2026-07-18.
- [x] Confirm the local Python version and package tooling. Found Python 3.10.1
  and pip 21.2.4; `uv` is absent. Layer 1 uses a standard-library `venv` and
  project-declared, constrained dependencies so no global package install is
  required.
- [x] Confirm no repo-level `AGENTS.md` or toolchain constraint is missing. No
  `AGENTS.md` was found in the repository hierarchy on 2026-07-18.

## Build tasks

- [x] Create `services/backend/` package structure.
- [x] Define backend dependencies and a reproducible install command.
- [x] Create environment-based configuration for:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
  - `OPENAI_EMBEDDING_MODEL`
  - `RECALL_HOST`
  - `RECALL_PORT`
  - `RECALL_DATABASE_PATH`
  - `RECALL_LOG_LEVEL`
  - `RECALL_CORS_ORIGINS`
- [x] Refuse non-loopback binding by default.
- [x] Create one minimal, documented FastAPI entry point. An application-factory
  pattern is optional and must not delay the health endpoint.
- [x] Implement `GET /health`.
- [x] Report process, database, and OpenAI-configuration state separately.
- [x] Allow the backend to start without an OpenAI key.
- [x] Add only the logging needed to diagnose startup and requests. Never log
  API keys; avoiding full captured text in default logs is an engineering
  safeguard, not a new product feature.
- [x] Add backend test configuration and the first health test.
- [x] Document one command to start and one command to test the backend.

## Required tests

- [x] Backend starts on `127.0.0.1:8765`.
- [x] `/health` returns `200` with database status.
- [x] `/health` reports `openai_configured: false` when the key is absent.
- [x] A missing `.env` does not crash the service.
- [x] An invalid port or database path fails with a visible configuration error.

## Validation evidence

- [x] Created a fresh `.venv`, upgraded its pip, and installed with
  `.venv/bin/python -m pip install -r requirements.txt`.
- [x] `.venv/bin/python -m pip check` reported no broken requirements.
- [x] `.venv/bin/python -m pytest` passed all 11 tests without warnings.
- [x] A live `.venv/bin/python -m app` run bound to `127.0.0.1:8765`; curl
  returned `{"status":"ok","database":"ok","openai_configured":false}`.
- [x] Live startup with `RECALL_HOST=0.0.0.0` exited `1` with a loopback
  validation error.
- [x] Live startup with `RECALL_DATABASE_PATH=/tmp` exited `1` with a database
  file-path validation error; invalid ports are also covered by tests.
- [x] `git diff --check` passed after implementation.

## Exit gate

- [x] A new developer can install dependencies, start the backend, call
  `/health`, and run tests from README instructions.

---

# Developer status dashboard — addition D-012

Status: `[x]` complete

## Build tasks

- [x] Add a local HTML dashboard at `/dev/checklist`.
- [x] Generate dashboard data directly from this Markdown file on every
  request; do not create a second status source.
- [x] Refresh the browser view every two seconds without a server restart.
- [x] Show layer progress, active tasks, blockers, resolved errors, and the last
  successful refresh time.
- [x] Make refresh failures visible and preserve the last successful view.
- [x] Keep the dashboard read-only, dependency-free, and loopback-only.
- [x] Add parser and endpoint tests.
- [x] Preserve each layer's expanded or collapsed state across the two-second
  live refresh.

## Exit gate

- [x] A checklist file change appears in an already-open dashboard within two
  seconds, without restarting the backend.

## Validation evidence

- [x] The live HTML route returned HTTP `200` with a self-contained 17,368-byte
  dashboard and no external asset dependency.
- [x] While the backend process remained running, this checklist's phase and
  Layer 2 status were edited; the next JSON request returned the new phase and
  `Layer 2: complete` without a restart.
- [x] Endpoint tests verify `Cache-Control: no-store`, direct Markdown rereads,
  the two-second poll interval, and the read-only HTML/JSON routes.
- [x] Stable stream keys and in-memory open-state capture preserve user choices
  across repeated live renders; a regression test guards the mechanism.

---

# Layer 2 — SQLite persistence

Status: `[x]` complete

## Decisions required before implementation

- [x] Select and record migration tooling. D-011 uses numbered SQL files and a
  standard-library transactional migration runner.
- [x] Persist optional `client_capture_id`. Do not make uniqueness or full
  idempotency a Layer 2 requirement unless duplicate submissions are observed
  or both developers approve and document the behavior. D-011 keeps the column
  nullable and non-unique.

## Build tasks

- [x] Create the SQLite database at the configured path.
- [x] Add a migration or initialization mechanism; do not create tables ad hoc
  inside request handlers.
- [x] Implement the `captures` table from the product plan.
- [x] Add the D-006 `context_truncated` column with false default.
- [x] Preserve `source`, `user_note`, and AI fields in separate columns.
- [x] Store array fields as JSON arrays, never comma-concatenated storage.
- [x] Store embeddings as nullable JSON arrays for the MVP.
- [x] Implement UTC `created_at` and `updated_at` behavior.
- [x] Implement the four states: `captured`, `processing`, `ready`, `error`.
- [x] Create a repository/data-access boundary independent of FastAPI routes.
- [x] Use transactions for initial Capture persistence and enrichment updates.

## Required tests

- [x] Create and read English, Chinese, and mixed-language Captures.
- [x] Round-trip `null` URL, title, context, app, and note values.
- [x] Round-trip arrays without type or order loss.
- [x] Persist `context_truncated` correctly.
- [x] Verify data survives service restart.
- [x] Verify an invalid status cannot be stored.
- [x] Verify no AI field update modifies source or user-note fields.

## Exit gate

- [x] A Capture survives process restart with byte-equivalent source and user
  content.

## Validation evidence

- [x] `.venv/bin/python -m pytest` passed all 30 tests after Layer 2 and the
  dashboard were implemented.
- [x] The migration runner applied `001_initial_captures.sql` twice
  idempotently in tests and recorded `1:initial_captures` in live SQLite.
- [x] A live backend created and reported a current database at a temporary
  configured path without an OpenAI key.
- [x] A separate process persisted Capture
  `5bf83e79-5364-464a-aef9-779f9e51f3a0`; after a full backend stop/start, a
  new process read matching UTF-8 hex for source and user-note bytes.
- [x] Direct SQLite inspection returned `captured:clipboard:0` for the restart
  fixture, confirming status, source type, and the default context flag.
- [x] A release-wheel build included the numbered SQL migration and the live
  dashboard HTML as package data.

---

# Layer 3 — Capture CRUD and first vertical slice

Status: `[~]` backend complete; macOS integration deferred under D-013

## Build tasks

- [x] Map the checked-in Capture schema to backend validation models.
- [x] Implement `POST /v1/captures`.
- [x] Persist the original request before any enrichment attempt.
- [x] Return `202 Accepted` with status `processing`.
- [x] Implement `GET /v1/captures?limit=&offset=`.
- [x] Implement `GET /v1/captures/{id}`.
- [x] Use the documented response envelope and error envelope.
- [x] Validate character limits and the D-009 at-least-one-content-field
  clarification.
- [x] Return stable codes for validation and not-found errors.
- [x] Write verified curl examples using the checked-in fixture.
- [x] Give Developer A the live base URL and curl evidence in
  `docs/developer-a-backend-handoff.md`.
- [x] Add a non-production Swift decoding/list holder under `docs/examples/`
  without modifying Developer A's Xcode project.

## Required tests

- [x] Valid web Capture returns `202` and a server UUID.
- [x] Valid clipboard Capture without a URL succeeds.
- [x] Empty and long user notes round-trip without source-data loss.
- [x] Missing URL and missing page title are accepted when other content exists.
- [x] Empty selection succeeds only when title or context contains text.
- [x] Unknown fields fail.
- [x] Overlong selection and context fail visibly.
- [x] List ordering is `created_at DESC`.
- [x] Pagination limits are enforced.
- [x] Unknown UUID returns the documented `404` envelope.

## Validation evidence

- [x] `.venv/bin/python -m pytest` passes all 55 tests without warnings.
- [x] A drift test matches request-model fields and required fields to
  `capture.schema.json`, and response-model fields to the ready fixture.
- [x] API responses exclude internal `embedding`/`embedding_json` storage fields.
- [x] Validation errors contain the stable `validation_error` code and a UUID
  request ID without echoing captured source text.
- [x] Unexpected API failures use the documented `internal_error` envelope and
  log only method/path plus the exception, not the request body.
- [x] Live fixture POST returned HTTP `202` and Capture
  `359d1c47-0190-40c4-8681-d994408860be` with status `processing`.
- [x] Direct SQLite inspection found the same UUID with source type `web`, 146
  selected characters, and 162 user-note characters.
- [x] Live detail and list GETs returned the persisted fixture; live unknown-ID
  and empty-content requests returned the documented `404` and `422` envelopes.

## Vertical-slice exit gate

```text
curl POST Capture
→ SQLite persistence
→ GET returns the Capture
→ Developer A's macOS app displays the real Capture
```

- [x] Backend portion passes.
- [D] Developer A confirms macOS display integration. Deferred under D-013;
  the placeholder does not satisfy the shared exit gate. See blocker B-006.
- [x] Commit and push the verified backend slice and documented holder.

---

# Layer 4 — OpenAI enrichment

Status: `[ ]` pending

## Prerequisites

- [ ] Confirm `OPENAI_API_KEY` is available without committing it.
- [ ] Confirm the configured GPT-5.6 model is accessible to the project.
- [ ] Choose and record the background-execution mechanism.
- [ ] Agree with Developer A on baseline polling: every 1–2 seconds, stop on
  `ready`/`error`, and cap polling at roughly 30–60 seconds. Do not add
  WebSockets for P0.

## Build tasks

- [ ] Keep OpenAI calls behind a small enrichment service boundary. Do not build
  a generalized provider/plugin system in P0; only preserve a clean seam for
  the separately gated D-008 experiment.
- [ ] Keep the model name in environment configuration only.
- [ ] Build the system instructions from product-plan §11.5.
- [ ] Build the user input from product-plan §11.6.
- [ ] Send only source type/app, page title, URL/domain, selected text, limited
  surrounding context, and user note—never full page HTML.
- [ ] Normalize inputs without modifying persisted originals.
- [ ] Preserve the complete user note.
- [ ] Enforce the selected/context length rules.
- [ ] Use one Responses API request per enrichment.
- [ ] Use strict Structured Outputs with
  `contracts/enriched_capture.schema.json`.
- [ ] Treat refusal detection and semantic non-empty checks as small reliability
  safeguards; do not redesign the baseline schema around them.
- [ ] Map `title → ai_title` and `summary → ai_summary` explicitly.
- [ ] Store all enrichment fields in one transaction.
- [ ] Implement `POST /v1/captures/{id}/enrich`.
- [ ] Reject concurrent enrichment with the documented `409` response.
- [ ] Persist a safe `error_message`; never expose credentials or raw provider
  traces to clients.
- [ ] Increment and persist `enrichment_version` when prompts or projections
  change incompatibly.

## Prompt-quality requirements

- [ ] Distinguish source facts, explicit user context, and cautious inference.
- [ ] Do not invent technical details.
- [ ] Do not claim a saved method worked unless the user note says it worked.
- [ ] Preserve exact error codes, commands, product names, APIs, libraries, and
  technical entities.
- [ ] Make `why_saved` primarily grounded in the user note; acknowledge when no
  personal reason was supplied.
- [ ] Use the language most appropriate to the note and captured content.
- [ ] Reject generic titles such as “Interesting Note,” “Linux Information,” or
  “A Useful Solution.”
- [ ] Ensure the summary reflects the user's situation rather than merely
  summarizing the source.

## Required test fixtures

- [ ] Stack Overflow-style technical solution.
- [ ] General article insight.
- [ ] Exact error code, command, or file path.
- [ ] English source with Chinese user note.
- [ ] Capture with no user note.
- [ ] Long but valid context.

## Failure tests

- [ ] Missing API key.
- [ ] Unavailable or unauthorized model.
- [ ] Timeout or connection failure.
- [ ] Refusal.
- [ ] Structurally invalid output.
- [ ] Semantically empty output.
- [ ] Retry succeeds without duplicating or modifying source data.

## Vertical-slice exit gate

```text
macOS Clipboard Capture
→ raw Capture persists
→ OpenAI enrichment runs
→ status changes from processing to ready
→ macOS card updates without data loss
```

- [ ] Backend portion passes.
- [ ] Developer A confirms polling and state UI.
- [ ] Commit and push the working slice.

---

# Layer 5 — FTS5 keyword retrieval

Status: `[ ]` pending

## Build tasks

- [ ] Create the `captures_fts` table from the product plan.
- [ ] Define one synchronization path for insert, enrichment update, retry, and
  future deletion.
- [ ] Index source, user-note, and AI fields independently but query together.
- [ ] Include tags, entities, and search aliases in FTS text.
- [ ] Implement empty-query recent-Capture behavior.
- [ ] Implement keyword search in `GET /v1/search`.
- [ ] Normalize keyword scores to `0...1`.
- [ ] Preserve exact error codes, commands, paths, versions, and URLs.
- [ ] Ensure FTS works when OpenAI and embeddings are unavailable.

## Required tests

- [ ] Exact title term.
- [ ] Original selection term.
- [ ] User-note phrase.
- [ ] AI tag/entity/alias.
- [ ] Error code and file path.
- [ ] Chinese query and mixed-language content.
- [ ] Empty query and no-result query.
- [ ] Failed-enrichment Capture remains searchable from raw fields.

## Exit gate

- [ ] Every representative fixture is retrievable through at least one exact
  keyword or phrase, even with OpenAI disabled.

---

# Layer 6 — Chrome extension capture

Status: `[ ]` pending

## Build tasks

- [ ] Create a Manifest V3 extension under `apps/chrome-extension/`.
- [ ] Request only `activeTab`, `scripting`, `storage`, and required localhost
  host permission.
- [ ] Extract page title, URL, selected text, and nearby context.
- [ ] Locate the selection's `commonAncestorContainer`, then prefer `article`,
  `[role="main"]`, `.answer`, `.post-text`, `main`, or the nearest `p`, `div`,
  or `section` without site-specific parsers.
- [ ] If no useful container exists, fall back to a truncated portion of
  `document.body.innerText`.
- [ ] Enforce context limits and set `context_truncated`.
- [ ] Support no-selection page-context capture with a clear warning.
- [ ] Build popup page title, selection preview, optional note, Save, `Saved`,
  and `Processing with AI` states.
- [ ] Send the exact Capture contract to the backend.
- [ ] Show `Recall is not running` when localhost is unreachable.
- [ ] Configure narrow CORS origins; never submit with `*`.

## Required browser tests

- [ ] Stack Overflow.
- [ ] GitHub Issue.
- [ ] Ordinary article/blog.
- [ ] OpenAI documentation.
- [ ] Code block selection.
- [ ] No selection.
- [ ] Long context.
- [ ] Backend stopped.

## Exit gate

```text
Chrome selection
→ popup preview and note
→ POST Capture
→ original persists
→ card appears in macOS app
```

- [ ] Complete workflow passes without developer database edits.

---

# Layer 7 — Embeddings and hybrid retrieval

Status: `[ ]` pending

## Decisions required before implementation

- [ ] Confirm embedding model access.
- [ ] Use the configured model's default dimensions for the MVP. Only introduce
  reduced dimensions or version migration if a tested constraint requires it,
  and document that change first.

## Build tasks

- [ ] Implement the exact §12.1 embedding-input builder.
- [ ] Keep labels, order, LF normalization, joining, and final newline stable.
- [ ] Test the builder against `contracts/examples/embedding-input.txt`.
- [ ] Generate an embedding only after successful enrichment.
- [ ] Store vectors as JSON arrays in SQLite.
- [ ] Do not introduce Pinecone, Weaviate, Milvus, Redis Vector, or a complex
  SQLite vector extension for the Build Week dataset.
- [ ] Embed the search query using the same model and dimensions.
- [ ] Calculate cosine similarity in Python.
- [ ] Implement normal weights:
  `0.55 semantic + 0.35 keyword + 0.10 metadata`.
- [ ] Implement technical-query weights:
  `0.45 semantic + 0.50 keyword + 0.05 metadata`.
- [ ] Calculate metadata bonuses from URL-domain, source-app, exact-tag, and
  exact error-code matches.
- [ ] Detect technical identifiers using digits, paths, hyphens, underscores,
  hexadecimal prefixes, URLs, and mixed-case identifiers.
- [ ] Return final, keyword, and nullable semantic scores.
- [ ] Fall back to FTS if Capture embedding or query embedding is unavailable.

## Required tests

- [ ] Exact query still ranks correctly.
- [ ] Vague personal description retrieves the intended Capture.
- [ ] Technical identifier query favors exact text.
- [ ] Chinese query retrieves relevant English source with Chinese note.
- [ ] Missing Capture embedding does not crash search.
- [ ] Query embedding failure returns FTS results.
- [ ] Score ordering is deterministic for fixed fixtures.

## Vertical-slice exit gate

```text
Chrome selection
→ OpenAI enrichment
→ §12.1 embedding
→ vague natural-language query
→ intended Capture ranks near the top
```

- [ ] Complete workflow passes three times with representative data.
- [ ] Commit and push the working slice.

---

# Layer 8 — Reliability and demo readiness

Status: `[ ]` pending

## Build tasks

- [ ] Recover or visibly mark stale `processing` records after restart.
- [ ] Make repeated client submissions safe according to the recorded
  `client_capture_id` decision.
- [ ] Separate enrichment failure from embedding failure.
- [ ] Add safe retry and prevent concurrent duplicate work.
- [ ] Add request/Capture IDs to logs only if they materially improve demo
  debugging; this is an engineering safeguard, not a P0 feature.
- [ ] Never log API keys or complete private captured text by default.
- [ ] Create deterministic demo seed data from contract fixtures.
- [ ] Create `scripts/dev.sh` or an equally simple documented clean-start
  backend command.
- [ ] Document backend-connected/disconnected behavior for Developer A.
- [ ] Record expected limitations in README.

## Shared P0 integration checks

- [ ] Chrome capture and macOS clipboard capture both work; one stable path is
  not enough for the P0 scope.
- [ ] Developer A verifies the app can start, list Captures, search, show detail,
  show `processing`/`ready`/`error`, display source/user/AI sections separately,
  and open the original URL.
- [ ] Developer A verifies Chrome, Preview, Word or TextEdit, and a chat app.
- [ ] Developer A verifies empty and overlong clipboard behavior, backend-offline
  behavior, API failure, and persistence after app restart.
- [ ] Run and record at least two end-to-end integration checks per day.

## Demo reliability preparation

- [ ] Use a known, stable public web page for the primary recording.
- [ ] Prepare a local fallback HTML page.
- [ ] Prepare an already-enriched note matching the live demo scenario.
- [ ] Verify API quota, network connectivity, and model access before recording.
- [ ] Avoid dependency upgrades immediately before recording.
- [ ] Disable unrelated notifications.
- [ ] Record both a continuous live version and an edited version if AI latency
  makes the continuous version weak.
- [ ] Preserve the original recording files.

## Failure matrix

- [ ] Database unavailable.
- [ ] OpenAI key missing.
- [ ] Model unavailable.
- [ ] Enrichment timeout/refusal/invalid output.
- [ ] Embedding failure.
- [ ] Chrome extension cannot reach backend.
- [ ] Backend restart during processing.
- [ ] macOS app restarts after data creation.

## Exit gate

- [ ] Main demo succeeds three consecutive times from a documented clean start.
- [ ] A failed AI call leaves a visible, persistent, keyword-searchable Capture.
- [ ] No manual database modification is needed during the demo.
- [ ] First backup recording is completed before optional Apple work begins.

---

# Layer 9 — Optional Apple on-device intelligence

Status: `[D]` gated; do not start yet

This is decision D-008 and an addition to the product baseline.

## Activation gate

- [ ] Layers 1–8 are complete.
- [ ] All three vertical slices pass.
- [ ] OpenAI remains the primary judged workflow.
- [ ] A backup demo recording exists.
- [ ] Target Mac hardware and OS support Apple Foundation Models.
- [ ] Apple Intelligence/model availability is confirmed at runtime.
- [ ] Remaining schedule can absorb the experiment without risking submission.
- [ ] The experiment begins before the July 21 feature freeze; otherwise it is
  automatically deferred.

If any activation item fails, leave this layer `[D]`, document why, and proceed
to Layer 10. Deferral is the intended safe outcome, not a project failure.

## Contract and architecture tasks

- [ ] Define and record provider metadata fields before schema/database edits.
- [ ] Keep one enrichment output contract for OpenAI and Apple.
- [ ] Ensure provider identity never changes source/user-note semantics.
- [ ] Define behavior when Apple Foundation Models is unavailable.
- [ ] Define whether Apple output is stored as an alternative version or
  replaces only the active AI interpretation.

## Developer B tasks

- [ ] Provide a provider-neutral enrichment interface.
- [ ] Persist provider/model/version metadata.
- [ ] Accept validated Apple enrichment results from the macOS client through a
  narrowly scoped local API contract.
- [ ] Keep the OpenAI provider and retrieval path unchanged.
- [ ] Compare outputs using the same fixtures and quality criteria.

## Developer A tasks

- [ ] Add Foundation Models capability and availability checks.
- [ ] Generate the common enrichment structure with guided generation.
- [ ] Add a clearly labeled local/provider demonstration control.
- [ ] Show unavailable/error states without blocking normal capture.

## Optional local retrieval experiment

- [ ] Obtain separate approval after local enrichment works; Apple retrieval is
  not implied by approval of the enrichment demonstration.
- [ ] Evaluate `NLEmbedding` sentence support for required demo languages.
- [ ] Measure retrieval quality against the OpenAI embedding fixtures.
- [ ] Keep vector spaces completely separate; never compare Apple and OpenAI
  vectors directly.
- [ ] Do not replace baseline hybrid search unless separately approved and
  documented.

## Exit gate

- [ ] The same Capture can be enriched locally into the common contract.
- [ ] Provider identity is visible and stored.
- [ ] OpenAI demo behavior is unchanged when Apple support is absent.
- [ ] The optional path adds no manual setup to the primary demo.

---

# Layer 10 — Final freeze and submission

Status: `[ ]` pending

## Engineering freeze

- [ ] Stop feature work.
- [ ] Merge only verified fixes.
- [ ] Keep the last known working commit available for immediate rollback.
- [ ] Confirm `main` is runnable.
- [ ] Run backend tests and contract validation.
- [ ] Run Chrome and macOS manual test matrices.
- [ ] Confirm `.env` and API keys are absent from Git history and tracked files.
- [ ] Tag the verified version `demo-stable`.

## Documentation and handoff

- [ ] Complete backend setup and troubleshooting instructions.
- [ ] Complete Chrome extension installation instructions.
- [ ] Complete README sections for Problem, Solution, Demo, Key Features, How It
  Works, Architecture, OpenAI Usage, Repository Structure, Setup, Environment,
  Development, Known Limitations, Future Work, Team, and License.
- [ ] Add an architecture diagram, screenshots, and an open-source license.
- [ ] Document OpenAI usage and failure fallback.
- [ ] Explain how Codex was used for planning, scaffolding, debugging, and
  delivery.
- [ ] Document Apple path as implemented, deferred, or unavailable—never imply
  it exists if it was not completed.
- [ ] List known limitations.
- [ ] Verify another machine/person can follow setup instructions.

## Shared submission gate

- [ ] Final demo video.
- [ ] Backup demo video.
- [ ] Screenshots and cover image.
- [ ] Devpost description.
- [ ] Devpost accurately covers OpenAI capabilities, challenges,
  accomplishments, lessons, and next steps.
- [ ] Repository visibility and links verified.
- [ ] Video links and all submission materials verified from a logged-out or
  independent view where practical.
- [ ] Confirm the exact Devpost timezone and deadline rather than relying only
  on the planning document.
- [ ] Submission completed before the official deadline.

---

# Open blockers and risks

Use IDs `B-###`. Never delete an entry; append resolution and date.

## B-001 — Layer 0 branch is not integrated into `main`

- Opened: 2026-07-18
- Severity: Coordination
- Status: Resolved 2026-07-18
- Impact: Developer A may build against older or absent contracts if working
  from `main`.
- Resolution: Pull request #1 was merged. `origin/main` is at merge commit
  `9c08243`, which contains Layer 0 commit `e75f783`.
- Does it block Layer 1 locally? No.

## B-002 — OpenAI credentials and model access are unverified

- Opened: 2026-07-18
- Severity: Future Layer 4 blocker
- Status: Open
- Impact: Real enrichment and embedding tests cannot run until project-scoped
  credentials and model access are available.
- Resolution needed: Configure `OPENAI_API_KEY` outside Git and verify the
  configured models when Layer 4 begins.
- Does it block Layers 1–3? No.

## B-003 — Apple runtime capability is unverified

- Opened: 2026-07-18
- Severity: Optional-path risk
- Status: Open / gated
- Impact: Target hardware, OS, Apple Intelligence configuration, language, or
  model availability may prevent the local demonstration.
- Resolution needed: Run capability checks on the exact demo Mac after the
  baseline workflow is stable.
- Does it block P0? No.

## B-004 — Day 0 backend target is not yet complete

- Opened: 2026-07-18
- Severity: Schedule risk
- Status: Open
- Impact: The product plan's July 18 target includes FastAPI, health, SQLite,
  Capture CRUD, curl proof, and macOS list integration. Layers 1–3 backend work
  and curl proof are complete; macOS integration remains.
- Resolution needed: Developer A completes the first macOS vertical-slice gate
  using the checked-in handoff.
- Does it block later backend work? No, but it blocks the shared vertical slice
  and reduces buffer before the July 21 deadline.

## B-005 — Uncommitted documentation prevents a clean Layer 1 branch

- Opened: 2026-07-18
- Severity: Workflow
- Status: Resolved 2026-07-18
- Impact: README, architecture, decisions, and the live checklist are modified
  on `agent/layer-0-contracts`. Starting backend code now would mix planning
  changes with the Layer 1 implementation or carry uncommitted changes across a
  branch switch.
- Resolution: Documentation was committed and pushed in `926655c`. Layer 1
  started from clean `main`, with local `HEAD` equal to `origin/main`.
- Does it block writing code? No technically; yes for the recommended clean
  branch and commit history.

## B-006 — Developer A macOS display confirmation is pending

- Opened: 2026-07-18
- Severity: Coordination / Layer 3 exit gate
- Status: Open / deferred to Developer A under D-013
- Impact: Developer B's POST → SQLite → GET/list flow passes, but the first
  shared vertical slice is not complete until the macOS app displays the live
  backend Capture.
- Resolution needed: Developer A follows
  `docs/developer-a-backend-handoff.md`, adapts or replaces the documented Swift
  holder, confirms live list/detail display, and reports contract mismatches.
- Does it block Layer 4 backend work? No under D-013. It still blocks marking
  the shared Layer 3 vertical slice complete.

# Errors encountered

Use IDs `E-###`. Record the original symptom and the resolution. Do not erase
resolved errors.

## E-001 — Official OpenAI docs MCP could not initially install

- Date: 2026-07-18
- Status: Resolved
- Symptom: Codex lacked permission to write the MCP configuration.
- Resolution: Retried after filesystem permissions were expanded; installation
  succeeded. Official OpenAI web documentation was used in the existing task
  because newly installed MCP tools require a restart to appear.
- Project impact: None.

## E-002 — Python `jsonschema` was not installed globally

- Date: 2026-07-18
- Status: Resolved for Layer 0 validation
- Symptom: `ModuleNotFoundError: No module named 'jsonschema'`.
- Resolution: Used an isolated temporary installation for validation; no
  project dependency was added because backend tooling had not been chosen.
- Follow-up: Add schema validation through the selected backend test dependency
  in Layer 1.

## E-003 — Initial staged whitespace audit failed

- Date: 2026-07-18
- Status: Resolved
- Symptom: Extra EOF blank lines and Markdown trailing spaces in new files.
- Resolution: Corrected the files, restaged, and reran `git diff --cached
  --check` successfully before commit.
- Project impact: None.

## E-004 — GitHub CLI was unavailable during the first publish attempt

- Date: 2026-07-18
- Status: Resolved
- Symptom: `gh: command not found`.
- Resolution: GitHub CLI was installed and authenticated; Layer 0 was committed
  and pushed successfully.
- Project impact: Initial publishing was delayed; no partial commit was made.

## E-005 — Initial checklist cross-check found omissions and overstatements

- Date: 2026-07-18
- Status: Resolved in checklist documentation
- Missing baseline items found: sprint dates, integration cadence, feature
  freeze, prompt-quality rules, exact Chrome context fallback, shared macOS
  tests, demo reliability, README/license requirements, and submission checks.
- Overstated items found: application-factory architecture, mandatory
  idempotency, mandatory detailed logging, embedding-dimension/version policy,
  and Apple local retrieval implied by Apple enrichment approval.
- Resolution: Added the missing baseline requirements, downgraded implementation
  preferences to non-blocking safeguards, and documented D-009 for the
  no-selection page-context clarification.
- Project impact: No code impact; future scope and exit gates are now more
  faithful to the product plan.

## E-006 — FastAPI runtime dependencies are not installed

- Date: 2026-07-18
- Status: Resolved
- Symptom: Importing `fastapi`, `pydantic`, and `uvicorn` fails at `fastapi`
  with `ModuleNotFoundError`.
- Resolution: Added constrained dependencies and the standard-library `venv`
  setup in `services/backend/`; the documented install succeeded and
  `.venv/bin/python -m pip check` found no broken requirements.
- Project impact: None after resolution.

## E-007 — Initial test run emitted a deprecated test-client warning

- Date: 2026-07-18
- Status: Resolved
- Symptom: All 11 tests passed, but Starlette warned that its fallback to the
  legacy `httpx` package is deprecated and requested `httpx2`.
- Resolution: Replaced the development dependency with `httpx2`, reinstalled
  from `requirements.txt`, removed the legacy fallback packages from the test
  environment, and reran the suite: 11 tests passed without warnings.
- Project impact: None after resolution.

## E-008 — Editable install generated an unignored metadata directory

- Date: 2026-07-18
- Status: Resolved
- Symptom: The final status review showed `services/backend/recall_backend.egg-info/`
  as untracked after the editable development install.
- Resolution: Added the standard `*.egg-info/` rule to `.gitignore`; the local
  metadata remains available to the environment but is no longer a candidate
  for source control.
- Project impact: None after resolution.

## E-009 — Named SQLite rows broke the healthy probe comparison

- Date: 2026-07-18
- Status: Resolved
- Symptom: The first Layer 2 test run passed 24 tests but failed two health
  tests because healthy databases returned HTTP `503` instead of `200`.
- Cause: Layer 2 enabled `sqlite3.Row` for schema-version reads, while the
  Layer 1 probe still compared `SELECT 1` to the tuple `(1,)`.
- Resolution: Changed the probe to compare the first returned column by value;
  the next complete run passed all 29 tests.
- Project impact: Local regression detected before commit; no remote impact.

## E-010 — Forced temporary-directory cleanup was rejected

- Date: 2026-07-18
- Status: Resolved
- Symptom: The environment rejected `rm -rf` for the isolated Layer 2 restart
  proof directory under `/tmp`.
- Resolution: Listed the exact isolated directory and its single database file,
  then removed it successfully with non-force `rm -r`.
- Project impact: None; the command ran after all proofs and did not touch the
  repository.

## E-011 — Wheel verification generated an unignored build directory

- Date: 2026-07-18
- Status: Resolved
- Symptom: `pip wheel` correctly packaged the migration and dashboard assets but
  left `services/backend/build/` visible as untracked output.
- Resolution: Added the standard Python `build/` ignore rule, confirmed the
  directory contained only generated package copies, and removed it without
  force.
- Project impact: None; final review caught the artifact before staging.

## E-012 — System `tidy` does not recognize HTML5 semantic elements

- Date: 2026-07-18
- Status: Resolved
- Symptom: `/usr/bin/tidy` exited `2`, reporting standard elements such as
  `<main>`, `<header>`, `<section>`, and `<article>` as unknown and assuming a
  non-UTF-8 character set.
- Cause: The bundled validator targets an older HTML dialect and cannot
  validate the dashboard's HTML5 document accurately.
- Resolution: Preserved semantic HTML5 and added a standard-library parser test
  that verifies balanced elements and unique IDs; all 30 tests pass.
- Project impact: No runtime failure; the dashboard returned HTTP `200` and its
  live JSON behavior already passed.

## E-013 — Layer 3 validation tests emitted deprecated 422 constant warnings

- Date: 2026-07-18
- Status: Resolved
- Symptom: All 51 tests passed, but 13 validation cases warned that the
  installed Starlette release renamed `HTTP_422_UNPROCESSABLE_ENTITY` to
  `HTTP_422_UNPROCESSABLE_CONTENT`.
- Resolution: Switched to the supported constant while preserving numeric HTTP
  status `422`; the complete suite now passes 53 tests without warnings.
- Project impact: No response-code failure; detected before commit.

## E-014 — Live refresh collapses user-expanded dashboard layers

- Date: 2026-07-18
- Status: Resolved
- Symptom: A layer expanded by the user stays open only until the next
  two-second checklist refresh, then collapses.
- Cause: Every refresh replaces all `<details>` elements and reapplies only the
  default active-layer state, discarding the user's current open/closed state.
- Resolution: Each panel now has a stable stream key. The renderer captures all
  open keys before replacement and restores those keys on the fresh elements;
  toggle events retain both expanded and explicitly collapsed choices in
  memory. A regression test guards the state-preservation mechanism.
- Project impact: Checklist data remains correct, but inspection is disruptive.

## E-015 — Dashboard status update initially targeted Layer 0

- Date: 2026-07-18
- Status: Resolved
- Symptom: A broad patch changed Layer 0's generic `Status: [x] complete` line
  instead of the identically formatted dashboard status line.
- Resolution: The immediate checklist inspection caught the mismatch; Layer 0
  was restored to complete and the dashboard alone was marked in progress using
  section-specific patch context.
- Project impact: No code or historical evidence changed; the incorrect live
  status existed only during this edit cycle.

## E-016 — Dashboard verification command used the wrong relative path

- Date: 2026-07-18
- Status: Resolved
- Symptom: The combined source-inspection and test command stopped at `sed`
  because it referenced `services/backend/...` while its working directory was
  already `services/backend`.
- Resolution: Reran the inspection and test suite from the repository root with
  paths relative to that directory.
- Project impact: No implementation or test failure; the first verification
  command exited before tests started.

## E-017 — Dashboard snapshot test observed the live in-progress status

- Date: 2026-07-18
- Status: Resolved
- Symptom: The full suite reported 54 passes and one failure because the
  dashboard snapshot test expects its status to be complete while this fix had
  intentionally marked it in progress.
- Cause: The live checklist is the test fixture and accurately exposed the
  temporary implementation status.
- Resolution: Marked the verified dashboard task complete, resolved E-014, and
  reran the full suite successfully with 55 tests passing.
- Project impact: No product-code assertion failed; final verification is
  complete.
