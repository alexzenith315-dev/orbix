// Single place where the frontend talks to the Orbix API.
// VITE_API_URL is the origin of the API host (for example https://orbix-6q0g.onrender.com).
// Leave it empty to use the same origin as the page, which is the Render single-service setup and
// the Vite dev proxy. Every request sends the session cookie.
const RAW_BASE = import.meta.env.VITE_API_URL || '';
export const API_BASE = RAW_BASE.replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(status, code, body = null) {
    super(code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.body = body;
  }
}

// status 0 means the request never got an answer (API down, offline, CORS, wrong VITE_API_URL).
export function isNetworkError(err) {
  return err instanceof ApiError && err.status === 0;
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`${API_BASE}/api${path}`, {
      method,
      credentials: 'include',
      headers: body !== undefined ? { 'content-type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    throw new ApiError(0, 'network_unreachable');
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) throw new ApiError(res.status, data?.error || `http_${res.status}`, data);
  return data;
}

// Human-readable text for an error. Never shows raw stack traces.
export function describeError(err) {
  if (isNetworkError(err)) {
    return API_BASE
      ? `Can't reach the Orbix API at ${API_BASE}. Try again in a moment.`
      : "Can't reach the Orbix API from this site. Try again in a moment.";
  }
  if (!(err instanceof ApiError)) return 'Something went wrong. Try again.';
  const map = {
    not_signed_in: 'Sign in with your wallet to continue.',
    forbidden: 'Your account does not have permission for this action.',
    not_found: 'Not found.',
    invalid_body: 'Some fields are missing or invalid.',
    invalid_transition: 'This application cannot move to that step from its current state.',
    cannot_follow_self: "You can't follow your own account.",
    nonce_replayed_or_expired: 'That sign-in request expired. Try signing in again.',
    bad_signature: 'The signature did not verify. Try again.',
    domain_mismatch: 'This site is not an allowed sign-in origin for the Orbix API.',
    chain_mismatch: 'Switch your wallet to Ethereum Sepolia and try again.',
    expired: 'That sign-in message expired. Try again.',
    invalid_message: 'The sign-in message was malformed.',
    end_before_launch: 'The end date must be after the launch date.',
  };
  return map[err.code] || `Request failed (${err.code}).`;
}
