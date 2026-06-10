// Referral code generation — unguessable-enough short codes for attribution links.
// Not a security boundary; just lightweight growth attribution (CLAUDE.md Part 16).

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous 0/O/1/I

export function generateReferralCode(seed: string): string {
  // Deterministic-ish from uid + a cheap hash so a user keeps one stable code.
  let hash = 2166136261
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  let code = ''
  let n = hash >>> 0
  for (let i = 0; i < 7; i++) {
    code += ALPHABET[n % ALPHABET.length]
    n = Math.floor(n / ALPHABET.length) + (i + 1) * 131
  }
  return code
}

export function referralUrl(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://littlelambnannies.com'
  return `${origin}/?ref=${code}`
}
