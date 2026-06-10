// Input sanitization + validation. CLAUDE.md: "Sanitize every user input before any
// database write." These helpers run client-side for UX; Firestore rules enforce the
// hard limits server-side (defense in depth).

// C0 control chars except TAB (\x09) and LF (\x0A), plus DEL (\x7F).
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g

/** Strip control characters and trim. Never stores raw, unbounded user text. */
export function cleanText(input: unknown, maxLen = 1000): string {
  if (typeof input !== 'string') return ''
  return input.replace(CONTROL_CHARS, '').trimStart().slice(0, maxLen)
}

/** Single-line field: also removes newlines and collapses whitespace. */
export function cleanLine(input: unknown, maxLen = 200): string {
  return cleanText(input, maxLen)
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(input: string): boolean {
  return input.length <= 254 && EMAIL_RE.test(input.trim())
}

export function normalizeEmail(input: string): string {
  return cleanLine(input, 254).toLowerCase()
}

/** Permissive phone normalization — keeps digits, +, spaces, dashes, parens, dots. */
export function cleanPhone(input: unknown): string {
  if (typeof input !== 'string') return ''
  return input.replace(/[^\d+()\-.\s]/g, '').slice(0, 32).trim()
}

/** Password policy: min 8 chars, at least one letter and one number. Returns error or null. */
export function passwordError(pw: string): string | null {
  if (pw.length < 8) return 'Use at least 8 characters.'
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Include at least one letter and one number.'
  if (pw.length > 128) return 'Password is too long.'
  return null
}

/** Maps Firebase auth error codes to safe, generic, user-facing messages (no system leakage). */
export function friendlyAuthError(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email or password doesn’t match. Please try again.'
    case 'auth/email-already-in-use':
      return 'An account already exists for this email. Try logging in.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/weak-password':
      return 'Please choose a stronger password.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'Sign-in was cancelled.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    default:
      return 'Something went wrong. Please try again.'
  }
}
