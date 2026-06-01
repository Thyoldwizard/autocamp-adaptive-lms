const DEMO_KEY = 'pace_demo';
const DEMO_TOKEN = 'demo';

export function getDemoRole() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DEMO_KEY);
}

export function isDemoActive() {
  return !!getDemoRole();
}

export function setDemoMode(role) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEMO_KEY, role);
  // Non-null token keeps getToken() truthy so auth guards don't redirect.
  // It won't parse as a valid JWT, so getUser() returns null — fine in demo.
  localStorage.setItem('pace_token', DEMO_TOKEN);
}

export function exitDemoMode() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DEMO_KEY);
  localStorage.removeItem('pace_token');
}
