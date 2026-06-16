import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { FirebaseError } from 'firebase/app'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { createAccount, signInWithGoogle } from '../../lib/auth'
import { homeRouteFor } from '../../lib/routing'
import {
  friendlyAuthError,
  isValidEmail,
  passwordError,
  cleanLine,
  cleanText,
  cleanPhone,
} from '../../lib/sanitize'
import { useReferralCapture, clearCapturedReferral } from '../../hooks/useReferralCapture'
import { RoleToggle, type SignupRole } from '../../components/auth/RoleToggle'
import { GoogleButton } from '../../components/auth/GoogleButton'
import { Button, Input, Textarea, Select, LambMark } from '../../components/ui'
import { Grain, Blob, StickerBadge, FloatLoop } from '../../components/theme'
import { useTiltHover } from '../../lib/motion'
import type { ReferralSource } from '../../types'
import { PublicShell } from './PublicShell'

/**
 * "/apply" — the combined application + account-creation form (CLAUDE.md §2.1 family /
 * §2.2 nanny). This is the real form the homepage "Get started" points to: it creates the
 * account in the pending state via createAccount(), then the existing auth redirect carries
 * the user to their holding page.
 *
 * Important: createAccount() only persists name/email/phone/role/referral to users/{uid}.
 * The richer application fields (neighborhood, children, experience, statement, notes) are
 * collected here for UX completeness and re-collected by the setup wizard — they are NOT
 * persisted by createAccount, by design. We stash them in sessionStorage (best-effort) so a
 * future wizard can pre-fill, but nothing blocks on it.
 *
 * Theming note: this is a real form, so it stays clean and functional — straight borders on
 * inputs (wobble is marketing-only per DESIGN_SYSTEM.md). Warmth comes from the grain canvas,
 * a friendly blob-masked side panel with a sticker credential, and a tilt on the submit card.
 */
const SOURCE_OPTIONS: { value: ReferralSource; label: string }[] = [
  { value: 'google', label: 'Google' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'friend', label: 'A friend' },
  { value: 'other', label: 'Other' },
]

const STASH_KEY = 'll_application_draft'

export function ApplicationPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const referralCode = useReferralCapture()
  const [searchParams] = useSearchParams()

  const initialRole: SignupRole = searchParams.get('role') === 'nanny' ? 'nanny' : 'family'
  const [role, setRole] = useState<SignupRole>(initialRole)

  // Shared fields
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [source, setSource] = useState<'' | ReferralSource>('')

  // Family-only fields
  const [neighborhood, setNeighborhood] = useState('')
  const [children, setChildren] = useState('')
  const [notes, setNotes] = useState('')

  // Nanny-only fields
  const [experience, setExperience] = useState('')
  const [statement, setStatement] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submitTilt = useTiltHover()

  useEffect(() => {
    if (user && profile) navigate(homeRouteFor(profile), { replace: true })
  }, [user, profile, navigate])

  if (user && profile) return <Navigate to={homeRouteFor(profile)} replace />

  // Suppress the "How did you find us?" dropdown when a referral link was captured —
  // attribution is already known. Otherwise the selected source (or null) is sent.
  const showSourceDropdown = !referralCode
  const referralSource: ReferralSource | null = referralCode
    ? 'referral_link'
    : source === ''
      ? null
      : source

  /** Best-effort stash of the richer fields for the setup wizard to pre-fill later. */
  function stashExtras() {
    try {
      const extras =
        role === 'family'
          ? { role, neighborhood: cleanLine(neighborhood, 120), children: cleanText(children, 500), notes: cleanText(notes, 1000) }
          : { role, experience: cleanLine(experience, 60), statement: cleanText(statement, 1000) }
      sessionStorage.setItem(STASH_KEY, JSON.stringify(extras))
    } catch {
      // Non-blocking — sessionStorage may be unavailable; the wizard re-collects anyway.
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const name = cleanLine(fullName, 80)
    const cleanedPhone = cleanPhone(phone)
    if (name.length < 2) return setError('Please enter your full name.')
    if (!isValidEmail(email)) return setError('Please enter a valid email address.')
    const pwErr = passwordError(password)
    if (pwErr) return setError(pwErr)

    setBusy(true)
    try {
      stashExtras()
      await createAccount({
        email: email.trim().toLowerCase(),
        password,
        fullName: name,
        phone: cleanedPhone,
        role,
        referredBy: referralCode,
        referralSource,
      })
      clearCapturedReferral()
      // Redirect handled by the effect once the new profile snapshot arrives.
    } catch (err) {
      setError(err instanceof FirebaseError ? friendlyAuthError(err.code) : 'Something went wrong.')
      setBusy(false)
    }
  }

  async function handleGoogle() {
    setError(null)
    setBusy(true)
    try {
      stashExtras()
      await signInWithGoogle(role, { referredBy: referralCode, referralSource })
      clearCapturedReferral()
    } catch (err) {
      setError(err instanceof FirebaseError ? friendlyAuthError(err.code) : 'Something went wrong.')
      setBusy(false)
    }
  }

  const isFamily = role === 'family'

  return (
    <PublicShell>
      <section className="relative overflow-hidden">
        <Grain />
        <Blob tone="sage" className="left-[-12%] top-[-6%] h-72 w-72" />
        <Blob tone="peri" className="bottom-[-14%] right-[-10%] h-80 w-80" />

        <div className="mx-auto grid max-w-6xl items-start gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
          {/* Friendly side panel — warmth without touching the form mechanics */}
          <aside className="lg:sticky lg:top-24">
            <p className="eyebrow">Apply to Little Lamb</p>
            <h1 className="mt-3 font-display text-display-lg leading-[0.95] text-ll-ink">
              {isFamily ? 'Find a nanny you trust' : 'Join the nanny network'}
            </h1>
            <p className="mt-4 max-w-md text-body-md text-ll-warm-gray">
              {isFamily
                ? 'Create your family account and tell us a little about your family. We review every application before your account goes live.'
                : 'Create your account and tell us about your experience. We review and interview every nanny before approval.'}
            </p>

            <div className="relative mt-10 hidden max-w-xs lg:block">
              <FloatLoop speed="slow">
                <div className="mask-blob border-1.5 border-ll-peri-soft bg-ll-cream p-9 shadow-lift">
                  <div className="mask-blob-alt grid place-items-center bg-ll-sage-light/50 py-10">
                    <LambMark className="h-32 w-32" />
                  </div>
                </div>
              </FloatLoop>
              <div className="absolute -right-2 top-2">
                <StickerBadge tone="peri" rotate={4} delay={0.2}>
                  <ShieldIcon /> Reviewed by hand
                </StickerBadge>
              </div>
              <div className="absolute -bottom-1 -left-2">
                <StickerBadge tone="sage" rotate={-3} delay={0.4}>
                  Santa Barbara local
                </StickerBadge>
              </div>
            </div>

            <ul className="mt-8 space-y-3 lg:mt-10">
              {(isFamily
                ? ['Free to browse the network', 'Background-checked, interviewed nannies', 'No commitment to apply']
                : ['Always free for nannies', 'Set your own hours', 'Keep what you earn']
              ).map((line) => (
                <li key={line} className="flex gap-2.5 text-sm text-ll-warm-gray">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-ll-sage-deep" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </aside>

          {/* The form — clean, straight-bordered inputs, tilt only on the submit card */}
          <div>
            {referralCode && (
              <p
                role="status"
                className="mb-6 rounded-ll-input border-1.5 border-ll-sage-light bg-ll-sage-light px-3 py-2 text-center text-sm text-ll-sage-deep"
              >
                You were referred. Welcome! We will note who sent you.
              </p>
            )}

            <div className="mx-auto max-w-xs">
              <RoleToggle value={role} onChange={setRole} />
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
              <Input
                label="Full name"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                label="Phone"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <Input
                label="Password"
                type="password"
                autoComplete="new-password"
                hint="At least 8 characters, with a letter and a number."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {isFamily ? (
                <>
                  <Input
                    label="Neighborhood in Santa Barbara"
                    autoComplete="address-level2"
                    placeholder="e.g. Mesa, Riviera, Goleta"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                  />
                  <Textarea
                    label="Number of children and their ages"
                    hint="A quick note is perfect. For example, two kids, ages 3 and 6."
                    value={children}
                    onChange={(e) => setChildren(e.target.value)}
                  />
                  <Textarea
                    label="Special needs or notes (optional)"
                    hint="Anything we should know, like allergies, routines, or preferences."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </>
              ) : (
                <>
                  <Input
                    label="Years of childcare experience"
                    inputMode="numeric"
                    placeholder="e.g. 5"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                  />
                  <Textarea
                    label="Short personal statement"
                    hint="Tell families a little about you and why you love working with kids."
                    value={statement}
                    onChange={(e) => setStatement(e.target.value)}
                  />
                </>
              )}

              {showSourceDropdown && (
                <Select
                  label="How did you find us? (optional)"
                  value={source}
                  onChange={(e) => setSource(e.target.value as '' | ReferralSource)}
                >
                  <option value="">Select one...</option>
                  {SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              )}

              {error && (
                <p role="alert" className="text-sm font-semibold text-red-600">
                  {error}
                </p>
              )}

              {/* Submit card — the one tilt-hover moment, hard offset shadow */}
              <motion.div
                {...submitTilt}
                className="rounded-ll-card border-1.5 border-ll-terra-soft bg-ll-terra-light/40 p-5 shadow-soft transition-shadow hover:shadow-pop-terra"
              >
                <Button type="submit" className="w-full" loading={busy}>
                  {isFamily ? 'Create account & apply' : 'Submit application'}
                </Button>
                <p className="mt-3 text-center text-sm text-ll-warm-gray">
                  We review every application before your account goes live.
                </p>
              </motion.div>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-ll-warm-gray">
              <span className="h-px flex-1 bg-ll-ink/10" />
              or
              <span className="h-px flex-1 bg-ll-ink/10" />
            </div>

            <GoogleButton onClick={handleGoogle} loading={busy} label="Continue with Google" />

            <p className="mt-6 text-center text-sm text-ll-warm-gray">
              You can log in right away. You will see a holding page until you are approved.
            </p>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}

/* ---------------------------------------------------------------------- Icons */
function ShieldIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M8 1l5 2v4c0 3.5-2.3 6.4-5 7.5C5.3 13.4 3 10.5 3 7V3l5-2z" opacity="0.25" />
      <path d="M8 1l5 2v4c0 3.5-2.3 6.4-5 7.5C5.3 13.4 3 10.5 3 7V3l5-2zm0 1.6L4.2 4.1v2.9c0 2.7 1.6 5 3.8 6 2.2-1 3.8-3.3 3.8-6V4.1L8 2.6zm2.3 2.6l.9.9-3.6 3.6-2-2 .9-.9 1.1 1.1 2.7-2.7z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" aria-hidden>
      <path d="M3 8.5l3 3 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
