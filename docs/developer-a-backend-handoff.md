# Developer A backend handoff

Status: Layer 3 backend ready for macOS integration

Last verified: 2026-07-18

## Local service

- Base URL: `http://127.0.0.1:8765`
- Health: `GET /health`
- Create: `POST /v1/captures`
- List: `GET /v1/captures?limit=50&offset=0`
- Detail: `GET /v1/captures/{id}`
- Shared response contract: `contracts/api.md`

Start the backend from `services/backend/`:

```bash
.venv/bin/python -m app
```

## Verified curl flow

From the repository root:

```bash
curl --header 'Content-Type: application/json' \
  --data-binary @contracts/examples/capture-request.json \
  http://127.0.0.1:8765/v1/captures
```

The verified response returned HTTP `202`, a server UUID, and status
`processing`. Use that returned UUID for detail:

```bash
curl http://127.0.0.1:8765/v1/captures/{id}
```

List the newest records:

```bash
curl 'http://127.0.0.1:8765/v1/captures?limit=50&offset=0'
```

The live proof created Capture `359d1c47-0190-40c4-8681-d994408860be` and
verified the same record through POST, direct SQLite inspection, detail GET,
and list GET.

## macOS behavior for this layer

- Decode list responses from the `items` array; `limit` and `offset` are
  returned beside it.
- Render source, surrounding context, and `user_note` independently.
- Show `processing` immediately after creation.
- Do not wait for AI fields in this integration pass. They remain null/empty
  until Developer B completes Layer 4 enrichment.
- Display the stable error `message`, but branch behavior on the error `code`.
- Preserve `context_truncated` in Swift request and response models.

## Non-production integration holder

[`examples/macos-layer3-placeholder.swift`](examples/macos-layer3-placeholder.swift)
contains copy-ready `Decodable` DTOs and an async list request. It is deliberately
stored under `docs/`, outside any Xcode target, and is marked `TODO(Developer A)`.
Developer A should adapt it to the app's existing networking and state model,
then remove the holder after the real list and detail views pass.

## Confirmation needed

Developer A should confirm:

1. Swift models decode the checked-in Capture response without invented fields.
2. The macOS list displays the live record returned by the backend.
3. Detail view preserves source and user-note separation.

That confirmation closes the shared Layer 3 vertical-slice gate.
