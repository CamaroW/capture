import { DISABLE_INLINE_CAPTURE_MESSAGE } from "../api/messages.js";


export const INLINE_CAPTURE_ORIGINS = Object.freeze([
  "http://*/*",
  "https://*/*",
]);
export const INLINE_CAPTURE_SCRIPT_ID = "recall-inline-capture";
export const INLINE_CAPTURE_SCRIPT_FILES = Object.freeze([
  "src/content/inline-core.js",
  "src/content/inline-capture.js",
]);
export const INLINE_CAPTURE_SCRIPT = Object.freeze({
  id: INLINE_CAPTURE_SCRIPT_ID,
  matches: INLINE_CAPTURE_ORIGINS,
  js: INLINE_CAPTURE_SCRIPT_FILES,
  allFrames: false,
  runAt: "document_idle",
  persistAcrossSessions: true,
  world: "ISOLATED",
});


function registeredScript() {
  return {
    ...INLINE_CAPTURE_SCRIPT,
    matches: [...INLINE_CAPTURE_ORIGINS],
    js: [...INLINE_CAPTURE_SCRIPT_FILES],
  };
}


function resultSummary(results) {
  return {
    attempted: results.length,
    succeeded: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length,
  };
}


export async function inlineCapturePermissionEnabled(
  permissions = globalThis.chrome?.permissions,
) {
  return permissions.contains({ origins: [...INLINE_CAPTURE_ORIGINS] });
}


/** Reconcile only the persistent dynamic content-script registration. */
export async function syncInlineCaptureRegistration({
  permissions = globalThis.chrome?.permissions,
  scripting = globalThis.chrome?.scripting,
} = {}) {
  const enabled = await inlineCapturePermissionEnabled(permissions);
  const registered = await scripting.getRegisteredContentScripts({
    ids: [INLINE_CAPTURE_SCRIPT_ID],
  });
  const exists = Array.isArray(registered) && registered.length > 0;

  if (!enabled) {
    if (exists) {
      await scripting.unregisterContentScripts({
        ids: [INLINE_CAPTURE_SCRIPT_ID],
      });
    }
    return false;
  }

  if (exists) {
    await scripting.updateContentScripts([registeredScript()]);
  } else {
    await scripting.registerContentScripts([registeredScript()]);
  }
  return true;
}


/**
 * Dynamic registrations do not retroactively run on already-loaded pages.
 * Inject every open HTTP(S) tab after opt-in; one restricted/discarded tab must
 * not prevent the remaining tabs from becoming ready.
 */
export async function injectInlineCaptureInOpenTabs({
  tabs = globalThis.chrome?.tabs,
  scripting = globalThis.chrome?.scripting,
} = {}) {
  const openTabs = await tabs.query({ url: [...INLINE_CAPTURE_ORIGINS] });
  const injections = openTabs
    .filter((tab) => Number.isInteger(tab.id))
    .map((tab) => scripting.executeScript({
      target: { tabId: tab.id },
      files: [...INLINE_CAPTURE_SCRIPT_FILES],
    }));
  return resultSummary(await Promise.allSettled(injections));
}


/** Remove controls from scripts that were injected before permission removal. */
export async function disableInlineCaptureInOpenTabs(
  tabs = globalThis.chrome?.tabs,
) {
  const openTabs = await tabs.query({});
  const notifications = openTabs
    .filter((tab) => Number.isInteger(tab.id))
    .map((tab) => tabs.sendMessage(tab.id, {
      type: DISABLE_INLINE_CAPTURE_MESSAGE,
    }));
  return resultSummary(await Promise.allSettled(notifications));
}


/**
 * Create one serialized permission reconciler for the service-worker lifetime.
 * Permission events and popup requests can arrive together; a queue prevents
 * duplicate register/unregister calls from racing on the same script id.
 */
export function createInlineCaptureReconciler({
  permissions = globalThis.chrome?.permissions,
  scripting = globalThis.chrome?.scripting,
  tabs = globalThis.chrome?.tabs,
} = {}) {
  let tail = Promise.resolve();

  async function applyCurrentState() {
    const enabled = await syncInlineCaptureRegistration({
      permissions,
      scripting,
    });
    if (enabled) {
      await injectInlineCaptureInOpenTabs({ tabs, scripting });
    } else {
      await disableInlineCaptureInOpenTabs(tabs);
    }
    return enabled;
  }

  return function reconcileInlineCapture() {
    const current = tail.then(applyCurrentState, applyCurrentState);
    // Keep the queue usable after a transient Chrome API failure while allowing
    // the caller that triggered this pass to observe that failure.
    tail = current.catch(() => undefined);
    return current;
  };
}
