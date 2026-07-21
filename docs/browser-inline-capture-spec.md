# Browser inline capture interaction contract

Status: Phase 2 implemented and fixture-verified; real unpacked-Chrome gate
B-014 pending

Owner: Developer B — Chrome extension, localhost delivery, and automated tests

Related decisions: D-018, D-025, D-027, and D-028

Development record:
[`browser-inline-capture-development-record.md`](browser-inline-capture-development-record.md)

## Objective

Make web capture feel immediate without changing or obstructing the page the
user is reading. A completed text selection may reveal a small **Add to
REcall** action. A REcall-initiated browser region screenshot may reveal the
same action after the region is selected. Both paths add an optional personal
comment and then enter the existing Capture, enrichment, storage, and retrieval
pipeline.

The toolbar popup and `Command+Shift+Y` shortcut remain supported. Inline
capture is an additional entry point, not a second notes system.

## Complete proposal coverage and phase mapping

This file is the canonical architecture for the complete improvement proposal.
The implementation consolidated two originally separate steps, so the mapping
below preserves both the original plan and the current build terminology.

| Original proposal | Current build phase | Status | Notes |
| --- | --- | --- | --- |
| Phase 1 — interaction contract | Phase 1 | Complete | States, privacy, permissions, ownership, and gates were committed before runtime work |
| Phase 2 — text-selection vertical slice | Phase 2 | Implemented; B-014 pending | Selection detection, pill, composer, errors, and Capture delivery are code- and fixture-verified |
| Phase 3 — shared capture coordinator | Included in Phase 2 | Complete | Service worker, validation, exact retry identity, and toolbar/inline reuse shipped with the vertical slice instead of being deferred |
| Phase 4 — browser screenshot capture | Phase 3 | Not started | Explicit visible-tab region selection and GPT OCR remain independently gated |
| Phase 5 — hardening | Cross-phase hardening | Partially complete | Automated Phase 2 coverage passes; real Chrome, cross-site, and all screenshot rows remain open |

The original planning estimate was roughly 3–5 engineering days, or 2–3
calendar days if text-selection and screenshot work could proceed in parallel.
That estimate is retained as planning history, not a promise: screenshot work
must not start in parallel if it could destabilize the completed text path.

## Scope boundary

### Phase 2 — selected web text

- Detect a completed, non-empty selection on an ordinary HTTP or HTTPS page.
- Offer one transient **Add to REcall** pill without stealing focus.
- Open a compact, anchored comment composer only after explicit activation.
- Save the selected text, bounded surrounding context, page title, URL, and
  optional user comment through `POST /v1/captures`.
- Preserve the existing idempotent retry behavior.

### Phase 3 — REcall browser region screenshot

- Start capture from an explicit REcall command or extension control.
- Let the user drag over a region of the visible tab.
- Offer **Add to REcall**, **Retake**, and **Cancel** beside the completed
  region.
- Use the existing GPT `/v1/ocr` route, show the cloud boundary before upload,
  and keep the image transient.
- Review extracted text, add an optional personal comment, and save a normal
  Capture with `source_type: screenshot`, `source_app: Google Chrome`, the page
  title, and the page URL.

Chrome cannot observe an arbitrary macOS screenshot. System-wide screenshot
capture and Apple Vision OCR remain owned by the native macOS application. The
browser path does not claim Apple Vision or fully local OCR.

## Interaction principles

1. **Do not interrupt reading.** Appearing controls do not take focus, scroll
   the page, modify selection, or change document layout.
2. **Appear only after intent is clear.** Selection UI appears after `pointerup`
   or a completed keyboard selection, never continuously while dragging.
3. **Stay transient.** The action and composer have explicit dismissal rules
   and leave no artifact after dismissal.
4. **Transmit only after consent.** Selection and page context remain in the
   tab until the user chooses **Save Memory**. Screenshot bytes are sent to GPT
   only after the cloud boundary is shown and the user continues.
5. **Preserve the three data layers.** Source text, the user's comment, and the
   later AI interpretation remain separate.
6. **Reuse one delivery path.** Inline, screenshot, keyboard, and toolbar
   capture share validation, idempotency, error mapping, and localhost API
   behavior.

## Selected-text interaction states

```text
idle
-> eligible selection completed
-> action pill visible
-> composer visible
-> submitting
-> saved confirmation -> dismissed
                    \-> visible error -> retry or cancel
```

### Eligibility

The extension normalizes the selection and shows no action for whitespace-only
text. Phase 2 supports ordinary top-level webpage content. It deliberately does
not promise Chrome internal pages, the built-in PDF viewer, cross-origin frame
contents, canvas-rendered text, Google Docs-style virtual selections, password
fields, form controls, or editable regions.

The action must not appear for selections made inside REcall's own interface.
The selected text and context are snapshotted before the composer opens because
opening an input may collapse the page selection.

### Action pill

- Label: **Add to REcall**
- Visual form: one compact pill with the REcall mark; no persistent toolbar
- Placement: at least 8 points away from the final selection rectangle
- Collision behavior: prefer below the selection, move above when needed, and
  clamp inside the viewport
- Focus: never focus automatically
- Page effect: fixed overlay only; no document-flow element and no layout shift

The pill is dismissed when the selection changes or collapses, the page scrolls,
Escape is pressed, the tab loses focus, the user clicks elsewhere, or four
seconds pass without interaction. Moving the pointer onto the pill pauses the
timeout long enough to activate it.

### Comment composer

The composer appears only after **Add to REcall** is activated. It contains:

- a two-line, read-only selection preview;
- the page title or hostname;
- an optional field labeled **Why are you saving this?**;
- **Cancel** and primary **Save Memory** actions; and
- a short statement that the memory is stored through the local REcall service.

The composer may take focus after explicit activation. `Command+Enter` or
`Control+Enter` saves, and Escape cancels. Clicking outside cancels only before
submission. The composer remains open on a validation, localhost, transport, or
API error so the user's comment is not lost. Later enrichment failure follows
the normal Capture lifecycle and does not turn a successful save into a failed
save.

### Submission feedback

- Pending: disable mutable fields and show **Saving...**.
- Success: show **Saved to REcall** with a checkmark for about 700 milliseconds,
  then remove the complete overlay.
- Backend unavailable: show **REcall is not running. Open the REcall app and
  try again.**
- Ambiguous failure: freeze the original source, comment, and
  `client_capture_id`; **Try again** resends that exact request.
- Enrichment unavailable: saving the raw Capture still succeeds. Feedback must
  not promise AI processing when the provider is not configured.

## Browser screenshot interaction states

```text
idle
-> explicit Capture Region command
-> crosshair selection overlay
-> region selected
-> compact action bar
-> cloud boundary acknowledged
-> OCR processing
-> extracted-text review and comment composer
-> save through the normal Capture API
```

Escape cancels region selection, OCR review, or the composer without saving.
The region overlay exists only during the explicit capture session. After a
region is selected, the action bar provides **Add to REcall**, **Retake**, and
**Cancel**. It must not cover the selected region when an adjacent viewport
position is available.

Before `/v1/ocr` receives image bytes, the UI states: **This image will be sent
to GPT for text extraction.** Browser screenshots do not advertise the native
Apple Vision option. A user who needs on-device screenshot OCR uses the macOS
REcall capture flow.

The crop must account for browser zoom, `devicePixelRatio`, visible-tab bounds,
and selections near each viewport edge. Image bytes are cleared after cancel,
failure abandonment, or successful extraction. The database stores extracted
text and metadata, not the screenshot.

## Permission and privacy contract

The baseline toolbar and shortcut paths inject extraction code only after an
explicit action. Phase 2 adds immediate selection detection only after the user
opts into broader HTTP and HTTPS page access.

REcall will request optional HTTP and HTTPS site access behind a setting labeled
**Show Add to REcall when I select text on websites**. Granting it permits a
lightweight content script to run on supported pages. Revoking it unregisters
inline behavior without disabling the existing toolbar and shortcut path.

The content script may observe the current selection locally to position the
action, but it must not write selected source text to extension storage, send it
to the backend, log it, or transmit it elsewhere before the user saves. Only an
optional comment draft may use extension storage, following the existing D-018
boundary, and it is removed after success.

REcall-owned UI uses isolated styling and text-only DOM assignment. Page text is
never interpreted as HTML. Runtime messages are validated, and page scripts
cannot directly invoke localhost capture operations.

## System boundary and ownership

```text
page selection / region overlay
-> Chrome content script
-> extension service worker
-> existing localhost API
-> SQLite + enrichment + FTS5 + embeddings
```

### Component responsibilities

| Component | Responsibility | Data boundary |
| --- | --- | --- |
| Popup setting | Request or revoke optional HTTP/HTTPS website access from an explicit user gesture | Does not receive selected source merely because access is granted |
| Content script | Observe completed `pointerup` or keyboard selections, reject unsupported targets, snapshot bounded text/context, and render the isolated overlay | Keeps source inside the tab until **Save Memory** |
| Closed Shadow DOM overlay | Render the pill, preview, comment field, actions, and live status without inheriting page CSS or changing document flow | Uses text-only DOM assignment and pointer events only on visible controls |
| Extension service worker | Validate messages, construct the existing request, freeze identity across retry, and map errors while backend idempotency prevents duplicate memories | Only extension-owned runtime messages can reach localhost delivery |
| Localhost Capture API | Persist the original source and personal note before asynchronous enrichment | Reuses `POST /v1/captures`; no inline-specific schema |
| Localhost OCR API | Accept one explicitly approved transient browser crop for GPT text extraction | Reuses `POST /v1/ocr`; image bytes are never stored |
| Existing data pipeline | SQLite persistence, enrichment, embeddings, FTS5, hybrid retrieval, and provider-off keyword fallback | Source, user note, and AI interpretation remain separate |

The two complete pipelines are:

```text
selection + bounded page context + comment
-> POST /v1/captures
-> SQLite source/note commit
-> asynchronous AI enrichment
-> embeddings + FTS5
-> hybrid retrieval
```

```text
explicit visible-tab crop
-> cloud boundary acknowledgement
-> POST /v1/ocr
-> editable extracted text + optional comment
-> POST /v1/captures with source_type=screenshot and source_app=Google Chrome
-> existing storage, enrichment, and retrieval pipeline
```

Developer B owns the content script, service worker, extension permission
flow, browser screenshot crop, shared request coordinator, automated extension
tests, and documentation. The existing backend contract is reused unless an
implementation finding proves a change necessary.

Developer A owns only changes to the native macOS screenshot interface. A
browser limitation must not be worked around by changing Developer A's paths
without an explicit shared decision.

## Accessibility and compatibility

- Controls use native button and textbox semantics with visible focus rings.
- Appearance alone never moves keyboard focus.
- The action and composer support keyboard activation and Escape dismissal.
- Status changes use a polite live region; errors remain visible until acted on.
- UI remains legible in light and dark pages, at 80–200% browser zoom, and near
  every viewport edge.
- Reduced-motion preferences remove nonessential movement.
- The extension must not suppress the website's normal copy command, context
  menu, text selection, link behavior, scrolling, or keyboard shortcuts.

## Complete hardening matrix

`[x]` means deterministic evidence exists, `[~]` means the architecture or a
partial automated check exists but the full matrix remains open, and `[ ]`
means the test belongs to the screenshot phase or has not been run.

| Required case from the proposal | Status | Current evidence or remaining work |
| --- | --- | --- |
| Selection near every viewport edge | `[x]` | Positioning tests cover collision and viewport clamping; fixture confirmed adjacent placement |
| Scrolling and browser zoom | `[~]` | Scroll dismissal is covered in runtime behavior; run the real 80–200% Chrome matrix under B-014 |
| Code blocks | `[ ]` | Run on representative documentation and GitHub pages |
| Emoji and long Unicode selections | `[x]` | Unicode limits and emoji-safe truncation are automated |
| CJK selections | `[ ]` | Add a representative real-page and normalization case |
| Dark and light websites | `[~]` | Isolated colors and focus styling exist; visually verify both in unpacked Chrome |
| Very high page `z-index` elements | `[ ]` | Verify overlay stacking and dismissal without changing page controls |
| Single-page application navigation | `[ ]` | Verify route changes remove stale UI and retain registered behavior |
| Offline backend | `[x]` | Coordinator maps transport failure to the required local recovery message |
| Unavailable GPT | `[~]` | Raw text Capture succeeds without enrichment; browser OCR failure remains a Phase 3 test |
| Double-clicking Save | `[~]` | Submitting state disables mutation; add an explicit rapid-activation regression test |
| Ambiguous timeout and retry | `[x]` | State-machine and coordinator tests preserve the exact timestamp, source, comment, and `client_capture_id` |
| High-DPI screenshot crop | `[ ]` | Phase 3 must test `devicePixelRatio`, zoom, visible-tab bounds, and edge crops |
| Cancellation at every screenshot step | `[ ]` | Phase 3 must cover selection, region, disclosure, OCR review, retry, and composer cancellation |
| Restricted Chrome pages | `[~]` | Declared unsupported; verify no injection/control in unpacked Chrome |
| Built-in PDF viewer | `[~]` | Declared unsupported; verify graceful absence in unpacked Chrome |
| Cross-origin frames | `[~]` | Top-level-only registration is implemented; verify no frame-content claim |
| Toolbar regression | `[x]` | Toolbar fixture uses the shared coordinator and completes a save |
| Keyword retrieval while AI is unavailable | `[x]` | Existing provider-off backend/FTS contract remains unchanged; rerun in final full-stack freeze |

## Phase 1 acceptance gates

- [x] Text-selection states, labels, focus behavior, and dismissal rules are
  specified.
- [x] Browser screenshot initiation, OCR boundary, and cancellation rules are
  specified.
- [x] Optional permission and no-transmission-before-save rules are specified.
- [x] Existing Capture, OCR, idempotency, and lifecycle contracts are reused.
- [x] Browser and native screenshot ownership is explicit.
- [x] Unsupported page types and the macOS screenshot-detection limitation are
  visible rather than hidden.
- [x] Phase 2 and Phase 3 have independent merge gates.

## Runtime merge gates for later phases

Phase 2 cannot merge until the action produces no layout shift, does not steal
focus, transmits nothing before Save, preserves exact retry identity, passes the
extension regression suite, and completes a real unpacked-extension capture.

The implementation passes 30 automated extension tests. The browser fixture
completed selection action → comment → save confirmation → automatic dismissal
and reported identical article bounds before and after the overlay. B-014 still
tracks the real unpacked-Chrome permission, localhost delivery, macOS display,
and permission-revocation proof; the fixture is not a substitute for that gate.

### Complete shared merge-gate checklist

- [x] The action uses a fixed overlay and fixture evidence shows zero page
  layout change.
- [x] The action does not move keyboard focus merely by appearing.
- [x] Selected source and context are neither stored nor transmitted before
  explicit **Save Memory**.
- [~] Closing or revoking removes the overlay without modifying page content;
  deterministic behavior passes, and B-014 retains the real-page proof.
- [~] One logical attempt freezes its identity and disables mutable submission;
  add the explicit rapid-double-click row before final merge.
- [x] Existing toolbar capture remains functional in the regression fixture.
- [x] New permissions, privacy boundaries, unsupported pages, and revocation
  behavior are documented.
- [x] Provider-off keyword retrieval remains part of the unchanged backend
  contract.
- [ ] A real unpacked Chrome selection reaches localhost, appears in the macOS
  card, and survives permission revocation testing under B-014.
- [ ] Screenshot bytes are never persisted in Phase 3 implementation or tests.
- [ ] Phase 3 passes high-DPI crop, every cancellation path, GPT disclosure,
  offline/unavailable GPT, extracted-text limits, and real macOS-card proof.

Phase 3 cannot merge until high-DPI cropping, all cancellation paths, transient
image cleanup, visible GPT disclosure, OCR failure, oversized output, and a real
browser-region-to-macOS-card flow are verified. Failure in Phase 3 must not
delay or destabilize the independently useful Phase 2 selection flow.
