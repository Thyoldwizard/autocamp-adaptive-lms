/**
 * Thin fetch wrapper for the pace backend.
 *
 * - Base URL comes from NEXT_PUBLIC_API_URL (default: http://localhost:3000/api)
 * - Reads the JWT from localStorage key `pace_token` and sends it as
 *   Authorization: Bearer on every request.
 * - On 401 the token is cleared and the browser is redirected to /login.
 * - Throws a plain Error (with the server's message text) on any other non-OK
 *   response so callers can catch it and display feedback.
 * - When demo mode is active (pace_demo in localStorage), GET calls are
 *   short-circuited to demoData and POSTs return canned no-op responses.
 */

import { getDemoRole } from './demoMode';
import {
  demoStudentDashboard,
  demoSkills,
  demoCheckin,
  demoCheckinResult,
  demoCompanionResponse,
  demoInstructorOverview,
  demoInstructorAtRisk,
  demoInstructorHeatmap,
  demoLearnerDetail,
} from './demoData';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

const TOKEN_KEY = "pace_token";

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

// --- Demo short-circuit maps ---

const DEMO_GET_MAP = {
  '/student/dashboard': demoStudentDashboard,
  '/student/skills': demoSkills,
  '/student/onboarding/status': { completed: true },
  '/instructor/cohort': demoInstructorOverview,
  '/instructor/cohort/at-risk': demoInstructorAtRisk,
  '/instructor/cohort/heatmap': demoInstructorHeatmap,
};

function getDemoGet(path) {
  if (Object.prototype.hasOwnProperty.call(DEMO_GET_MAP, path)) {
    return DEMO_GET_MAP[path];
  }
  if (/^\/instructor\/learner\/[^/]+$/.test(path)) return demoLearnerDetail;
  return undefined;
}

function getDemoPost(path) {
  if (/^\/student\/checkin\/start\//.test(path)) return demoCheckin;
  if (/^\/student\/checkin\/submit\//.test(path)) return demoCheckinResult;
  if (path === '/student/companion') return demoCompanionResponse;
  // No-op POSTs: onboarding complete, flag
  if (
    path === '/student/onboarding/complete' ||
    /^\/instructor\/learner\/[^/]+\/flag$/.test(path)
  ) {
    return {};
  }
  return undefined;
}

export function get(path) {
  if (getDemoRole()) {
    const demoData = getDemoGet(path);
    if (demoData !== undefined) return Promise.resolve(demoData);
  }
  return request(path, { method: "GET" });
}

export function post(path, body) {
  if (getDemoRole()) {
    const demoData = getDemoPost(path);
    if (demoData !== undefined) return Promise.resolve(demoData);
  }
  return request(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}
