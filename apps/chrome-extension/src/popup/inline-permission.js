import { SYNC_INLINE_CAPTURE_MESSAGE } from "../api/messages.js";
import { INLINE_CAPTURE_ORIGINS } from "../background/inline-registration.js";


export function createInlinePermissionController({
  permissions = globalThis.chrome?.permissions,
  sendMessageImpl = (message) => chrome.runtime.sendMessage(message),
} = {}) {
  let inFlight = null;

  function contains() {
    return permissions.contains({ origins: [...INLINE_CAPTURE_ORIGINS] });
  }

  async function synchronize() {
    const response = await sendMessageImpl({ type: SYNC_INLINE_CAPTURE_MESSAGE });
    if (response?.ok !== true || typeof response.enabled !== "boolean") {
      throw new Error("inline_registration_failed");
    }
    return response.enabled;
  }

  function setEnabled(enabled) {
    if (inFlight) {
      return inFlight;
    }

    // Call request/remove synchronously from the checkbox event. Deferring an
    // optional permission request to a later task can lose Chrome's user-gesture
    // authorization even when the click was legitimate.
    let permissionChange;
    try {
      permissionChange = enabled
        ? permissions.request({ origins: [...INLINE_CAPTURE_ORIGINS] })
        : permissions.remove({ origins: [...INLINE_CAPTURE_ORIGINS] });
    } catch (error) {
      return Promise.reject(error);
    }

    inFlight = (async () => {
      const changed = await permissionChange;
      if (enabled && !changed && !await contains()) {
        return { enabled: false, reason: "denied" };
      }
      const active = await synchronize();
      return {
        enabled: active,
        reason: active ? "enabled" : "disabled",
      };
    })();
    inFlight = inFlight.finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  return Object.freeze({
    currentEnabled: contains,
    setEnabled,
  });
}
