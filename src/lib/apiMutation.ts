export type MutationResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: "http" | "network" | "invalid_response"; message: string; status?: number };

const NETWORK_FAILURE_MESSAGE = "Couldn't reach the server. Check your connection and try again.";
const INVALID_RESPONSE_MESSAGE = "Unexpected response from the server. Please try again.";
const GENERIC_HTTP_FAILURE_MESSAGE = "Something went wrong. Please try again.";

function extractErrorMessage(body: unknown): string | undefined {
  if (body && typeof body === "object" && "error" in body) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
  }
  return undefined;
}

/**
 * Shared client mutation primitive (issue #50): wraps fetch + response
 * parsing so callers never have to hand-roll try/catch + response.ok +
 * json().catch() themselves, and a rejected fetch() (offline, aborted
 * request, transport failure) always resolves to a usable failure outcome
 * instead of throwing past a caller's rollback logic. Generalizes the
 * pattern first proven in technicianAssignment.ts (issue #45/PR #48).
 *
 * `extract` pulls the expected payload out of the parsed JSON body; a 2xx
 * response whose body doesn't contain what the caller needs (missing field,
 * unexpected shape) is treated as a failure rather than a false success.
 */
export async function fetchMutation<T>(
  input: string,
  init: RequestInit,
  extract: (body: unknown) => T | undefined,
): Promise<MutationResult<T>> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch {
    return { ok: false, kind: "network", message: NETWORK_FAILURE_MESSAGE };
  }

  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    return {
      ok: false,
      kind: "http",
      message: extractErrorMessage(body) ?? GENERIC_HTTP_FAILURE_MESSAGE,
      status: response.status,
    };
  }

  const data = extract(body);
  if (data === undefined) {
    return { ok: false, kind: "invalid_response", message: INVALID_RESPONSE_MESSAGE };
  }

  return { ok: true, data };
}
