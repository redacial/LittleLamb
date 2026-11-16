// Where the landing page's "Get Started" CTAs send a visitor to actually sign up. The landing
// site and the app are SEPARATE deployments (different hosting origins), so these must be
// absolute URLs. The base is env-driven (VITE_APP_URL) with a safe default, so the single place
// to update when the domain cuts over is that env var — no code change.
//
// At launch (2026-11): families are auto-approved, so "Get Started" drops a family straight into
// the app's /apply form (role pre-selected) → setup wizard → dashboard. Nannies go to the same
// /apply with role=nanny (they still get vetted after applying).

/** The app's origin. Defaults to the live app host; override with VITE_APP_URL. */
export function appBase(): string {
  const configured = import.meta.env.VITE_APP_URL as string | undefined
  const base = configured && configured.trim() ? configured.trim() : 'https://littlelamb-sb-staging-app.web.app'
  // Normalise: no trailing slash, so appUrl() can always prepend one path segment cleanly.
  return base.replace(/\/+$/, '')
}

/** Absolute URL into the app's signup/application form for a given role. */
export function applyUrl(role: 'family' | 'nanny'): string {
  return `${appBase()}/apply?role=${role}`
}

/** Absolute URL to the app's login page (for returning members). */
export function loginUrl(): string {
  return `${appBase()}/login`
}
