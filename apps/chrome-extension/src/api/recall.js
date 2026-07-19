export const RECALL_BASE_URL = "http://127.0.0.1:8765";
export const RECALL_UNAVAILABLE_TITLE = "Recall is not running.";
export const RECALL_UNAVAILABLE_DETAIL = "Open the Recall app and try again.";
export const CAPTURE_LIMITS = Object.freeze({
  sourceTitle: 500,
  sourceUrl: 2_048,
  selectedText: 12_000,
  surroundingContext: 20_000,
  userNote: 4_000,
});


export class RecallUnavailableError extends Error {
  constructor() {
    super(RECALL_UNAVAILABLE_TITLE);
    this.name = "RecallUnavailableError";
  }
}


export class RecallApiError extends Error {
  constructor(message, { code = "api_error", status = 0 } = {}) {
    super(message);
    this.name = "RecallApiError";
    this.code = code;
    this.status = status;
  }
}


export class RecallCaptureValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "RecallCaptureValidationError";
  }
}


function unicodeLength(value) {
  return Array.from(String(value ?? "")).length;
}


function truncateUnicode(value, maximum) {
  return Array.from(String(value ?? "")).slice(0, maximum).join("");
}


function requireWithinLimit(value, fieldName, maximum) {
  const length = unicodeLength(value);
  if (length > maximum) {
    throw new RecallCaptureValidationError(
      `${fieldName} can use up to ${maximum.toLocaleString()} characters; this value has ${length.toLocaleString()}.`,
    );
  }
}


export function buildCaptureRequest(
  extracted,
  userNote,
  {
    now = () => new Date(),
    createId = () => crypto.randomUUID(),
  } = {},
) {
  const note = String(userNote ?? "");
  requireWithinLimit(note, "Your note", CAPTURE_LIMITS.userNote);
  requireWithinLimit(
    extracted.selectedText,
    "The selected text",
    CAPTURE_LIMITS.selectedText,
  );
  requireWithinLimit(
    extracted.surroundingContext,
    "The surrounding context",
    CAPTURE_LIMITS.surroundingContext,
  );

  const sourceTitle = String(extracted.sourceTitle ?? "");
  const sourceUrl = String(extracted.sourceUrl ?? "");
  return {
    client_capture_id: createId(),
    source_type: "web",
    source_app: "Google Chrome",
    source_title: sourceTitle
      ? truncateUnicode(sourceTitle, CAPTURE_LIMITS.sourceTitle)
      : null,
    source_url: sourceUrl && unicodeLength(sourceUrl) <= CAPTURE_LIMITS.sourceUrl
      ? sourceUrl
      : null,
    selected_text: extracted.selectedText,
    surrounding_context: extracted.surroundingContext || null,
    context_truncated: Boolean(extracted.contextTruncated),
    user_note: note.trim() ? note : null,
    captured_at: now().toISOString(),
  };
}


export async function createCapture(
  payload,
  {
    fetchImpl = globalThis.fetch,
    timeoutMs = 6_000,
    baseUrl = RECALL_BASE_URL,
  } = {},
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response;
    try {
      response = await fetchImpl(`${baseUrl}/v1/captures`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (_error) {
      throw new RecallUnavailableError();
    }

    let body = null;
    try {
      body = await response.json();
    } catch (_error) {
      body = null;
    }

    if (!response.ok) {
      const apiError = body?.error;
      throw new RecallApiError(
        apiError?.message || "Recall could not save this Capture.",
        {
          code: apiError?.code || "api_error",
          status: response.status,
        },
      );
    }

    if (!body || typeof body.id !== "string" || typeof body.status !== "string") {
      throw new RecallApiError("Recall returned an invalid response.", {
        code: "invalid_response",
        status: response.status,
      });
    }
    return body;
  } finally {
    clearTimeout(timeout);
  }
}
