# Recall Chrome extension

This is a build-free Manifest V3 extension. Chrome runs the checked-in ES
modules directly; only Node's built-in test runner is used during development.

## Load unpacked

1. Start the Recall backend at `http://127.0.0.1:8765`.
2. Open `chrome://extensions` in Google Chrome.
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select this `apps/chrome-extension/` directory.
5. Copy the generated extension ID.
6. Add its exact origin to the untracked root `.env`, for example:

   ```text
   RECALL_CORS_ORIGINS=chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
   ```

7. Restart the backend, open an ordinary `http` or `https` page, select text,
   and use the Recall toolbar action.

For the keyboard-first path, press `Command+Shift+Y` on macOS or
`Control+Shift+Y` on other platforms. Chrome may reserve or override suggested
shortcuts; confirm or customize Recall's binding at `chrome://extensions/shortcuts`.
The popup focuses the optional note. Press `Command+Enter` or `Control+Enter` to
save. After a brief **Saved** confirmation, the popup closes automatically.

The extension requests only `activeTab`, `scripting`, `storage`, and access to
the fixed localhost backend. It injects extraction code only after the toolbar
action. `storage` retains an optional note draft for the active tab and removes
it after a successful save; selected source content is not cached.

If no text is selected, the popup warns that it will save limited page context.
If Recall is unavailable, the popup displays the required recovery message
instead of failing silently.

The popup validates the shared Capture limits before submission. If a POST has
an ambiguous failure, **Try again** reuses the original request and
`client_capture_id` while that popup remains open; the source and note are locked
so a retry cannot silently change an already-committed Capture. Successful saves
clear the optional note draft as before.

## Test

From this directory:

```bash
npm test
```

`pnpm test` or `node --test tests/*.test.mjs` runs the same dependency-free
suite when npm is not installed.
