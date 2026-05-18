/**
 * Thin fetch wrapper for the autocamp backend.
 *
 * - Base URL comes from NEXT_PUBLIC_API_URL (default: http://localhost:3000/api)
 * - Reads the JWT from localStorage key `atomcamp_token` and sends it as
 *   Authorization: Bearer on every request.
 * - On 401 the token is cleared and the browser is redirected to /login.
 * - Throws a plain Error (with the server's message text) on any other non-OK
 *   response so callers can catch it and display feedback.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const TOKEN_KEY = "atomcamp_token";

function getStoredToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

function handleUnauthorized() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = "/login?reason=session-expired";
}

async function request(path, options = {}) {
  const token = getStoredToken();

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    handleUnauthorized();
    // Return a never-resolving promise — the page is about to redirect.
    return new Promise(() => {});
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${res.status}`);
  }

  // 204 No Content — return null rather than trying to parse an empty body.
  if (res.status === 204) return null;

  return res.json();
}

export function get(path) {
  return request(path, { method: "GET" });
}

export function post(path, body) {
  return request(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
