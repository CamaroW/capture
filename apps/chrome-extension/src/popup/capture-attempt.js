/**
 * Freeze the first valid request for the lifetime of an open popup.
 *
 * A retry must reuse both the original payload and client_capture_id because a
 * timed-out POST may already have committed successfully in the backend.
 */
export function createCaptureAttempt(buildRequest) {
  let payload = null;

  return {
    get isLocked() {
      return payload !== null;
    },

    request(extractedCapture, userNote) {
      if (payload === null) {
        payload = buildRequest(extractedCapture, userNote);
      }
      return payload;
    },
  };
}
