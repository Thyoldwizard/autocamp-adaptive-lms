/**
 * Client-side auth utilities.
 *
 * All functions guard against SSR — localStorage and window.location are only
 * accessed when typeof window !== 'undefined'.
 *
 * JWT payload is decoded by base64-decoding the middle segment.  No signature
 * verification is performed here; the backend validates every request with the
 * real key.  The decoded payload includes app_metadata.role which is set by the
 * backend admin (not editable by the user).
 */

const TOKEN_KEY = "atomcamp_token";

/** Persist the access token returned by /auth/login or /auth/register. */
export function saveToken(token) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
}

/** Read the stored token, or null if absent. */
export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Remove the token (logout / 401 handler). */
export function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Decode the JWT payload without verifying the signature.
 * Returns the parsed payload object, or null on any error.
 *
 * The payload includes, among other things:
 *   { sub, email, app_metadata: { role }, exp, ... }
 */
export function getUser() {
  const token = getToken();
  if (!token) return null;

  try {
    const segments = token.split(".");
    if (segments.length !== 3) return null;

    // JWT uses base64url encoding; convert to standard base64 before decoding.
    const base64 = segments[1].replace(/-/g, "+").replace(/_/g, "/");

    const json =
      typeof window !== "undefined"
        ? atob(base64)
        : Buffer.from(base64, "base64").toString("utf-8");

    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** True when the decoded role claim is 'instructor'. */
export function isInstructor() {
  const user = getUser();
  return user?.app_metadata?.role === "instructor";
}

/**
 * Call at the top of any protected page (inside useEffect or a client component).
 *
 * - If no token exists → redirects to /login and returns null.
 * - If a token exists  → returns the decoded user payload.
 *
 * Note: this does NOT verify token expiry.  The backend will return 401 on the
 * first real API call, which triggers the api.js 401 handler and re-redirects.
 */
export function requireAuth() {
  const token = getToken();
  if (!token) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }
  return getUser();
}
