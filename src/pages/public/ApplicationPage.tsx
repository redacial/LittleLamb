import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { FirebaseError } from 'firebase/app'
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
import { Button, Input, Textarea, Select } from '../../components/ui'
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

  return (
    <PublicShell>
      <section className="mx-auto max-w-xl px-5 py-12 sm:px-8 lg:py-16">
        <p className="eyebrow text-center">Apply to Little Lamb</p>
        <h1 className="mt-2 text-center font-display text-display-lg text-ll-ink">
          {role === 'family' ? 'Find a nanny you trust' : 'Join the nanny network'}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-center text-body-md text-ll-warm-gray">
          {role === 'family'
            ? 'Create your family account and tell us a little about your family. We review every application before your account goes live.'
            : 'Create your account and tell us about your experience. We review and interview every nanny before approval.'}
        </p>

        {referralCode && (
          <p
            role="status"
            className="mx-auto mt-5 max-w-md rounded-ll-input border-1.5 border-ll-sage-light bg-ll-sage-light px-3 py-2 text-center text-sm text-ll-sage-deep"
          >
            You were referred — welcome! We’ll note who sent you.
          </p>
        )}

        <div className="mx-auto mt-6 max-w-xs">
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

          {role === 'family' ? (
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
                hint="A quick note is perfect — e.g. “Two kids, ages 3 and 6.”"
                value={children}
                onChange={(e) => setChildren(e.target.value)}
              />
              <Textarea
                label="Special needs or notes (optional)"
                hint="Anything we should know — allergies, routines, preferences."
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
              <option value="">Select one…</option>
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

          <Button type="submit" className="w-full" loading={busy}>
            {role === 'family' ? 'Create account & apply' : 'Submit application'}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-ll-warm-gray">
          <span className="h-px flex-1 bg-ll-ink/10" />
          or
          <span className="h-px flex-1 bg-ll-ink/10" />
        </div>

        <GoogleButton onClick={handleGoogle} loading={busy} label="Continue with Google" />

        <p className="mt-6 text-center text-sm text-ll-warm-gray">
          We review every application before your account goes live. You can log in right away —
          you’ll see a holding page until you’re approved.
        </p>
      </section>
    </PublicShell>
  )
}
