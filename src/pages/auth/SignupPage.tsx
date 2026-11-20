import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { FirebaseError } from 'firebase/app'
import { useAuth } from '../../context/AuthContext'
import { createAccount, signInWithGoogle } from '../../lib/auth'
import { homeRouteFor } from '../../lib/routing'
import {
  friendlyAuthError,
  isValidEmail,
  passwordError,
  cleanLine,
  cleanPhone,
} from '../../lib/sanitize'
import { useReferralCapture, clearCapturedReferral } from '../../hooks/useReferralCapture'
import { AuthShell } from '../../components/auth/AuthShell'
import { RoleToggle, type SignupRole } from '../../components/auth/RoleToggle'
import { GoogleButton } from '../../components/auth/GoogleButton'
import { Button, Input, BetaNotice } from '../../components/ui'

/**
 * Account creation. The full application questionnaires (neighborhood, children, experience,
 * etc.) live in the Phase 3 family/nanny application forms; this screen captures the minimum
 * to create the account and place it in the pending state, then routes into the holding page.
 * Referral attribution is captured from the ?ref= link and attached on creation.
 */
export function SignupPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const referralCode = useReferralCapture()

  const [role, setRole] = useState<SignupRole>('family')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user && profile) navigate(homeRouteFor(profile), { replace: true })
  }, [user, profile, navigate])

  if (user && profile) return <Navigate to={homeRouteFor(profile)} replace />

  /**
   * The Terms acknowledgment is a required, affirmative step (D77 / business plan): Little Lamb
   * is a job-LISTING service, so a family must actively accept that THEY choose, vet, and hire
   * sitters before any account is created. Both signup paths run this first, so neither
   * createAccount nor signInWithGoogle fires without an acceptance to record.
   */
  function termsBlock(): boolean {
    if (!agreedToTerms) {
      setError('Please accept the Terms of Service to continue.')
      return true
    }
    return false
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (termsBlock()) return

    const name = cleanLine(fullName, 80)
    const cleanedPhone = cleanPhone(phone)
    if (name.length < 2) return setError('Please enter your full name.')
    if (!isValidEmail(email)) return setError('Please enter a valid email address.')
    const pwErr = passwordError(password)
    if (pwErr) return setError(pwErr)

    setBusy(true)
    try {
      await createAccount({
        email: email.trim().toLowerCase(),
        password,
        fullName: name,
        phone: cleanedPhone,
        role,
        referredBy: referralCode,
        referralSource: referralCode ? 'referral_link' : null,
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
    if (termsBlock()) return
    setBusy(true)
    try {
      await signInWithGoogle(role, {
        referredBy: referralCode,
        referralSource: referralCode ? 'referral_link' : null,
      })
      clearCapturedReferral()
    } catch (err) {
      setError(err instanceof FirebaseError ? friendlyAuthError(err.code) : 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <AuthShell
      footer={
        <p>
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-ll-sage-deep underline-offset-2 hover:underline">
            Log in
          </Link>
        </p>
      }
    >
      <h1 className="text-display-md">Join Little Lamb</h1>
      <p className="mt-2 text-ll-warm-gray">
        {role === 'family'
          ? 'Create your family account. Your first two bookings are free.'
          : 'Create your free sitter account, build a profile, and set your own hours.'}
      </p>

      {referralCode && (
        <p className="mt-4 rounded-ll-input bg-ll-sage-light px-3 py-2 text-sm text-ll-sage-deep border-1.5 border-ll-sage-light">
          You were referred — welcome! We'll note who sent you.
        </p>
      )}

      <div className="mt-4">
        <BetaNotice context="signup" />
      </div>

      <div className="mt-6">
        <RoleToggle value={role} onChange={setRole} />
      </div>

      <form onSubmit={handleSignup} className="mt-6 space-y-4" noValidate>
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
        {/* Affirmative Terms acknowledgment (D77 / business plan). Little Lamb is a job
            LISTING service, not an agency — the family actively accepts that THEY choose, vet,
            and hire sitters. Required: both signup paths are gated on it. The label text after
            "I'm responsible for choosing…" is the checkbox's accessible name. */}
        <label className="flex cursor-pointer items-start gap-3 rounded-ll-input border-1.5 border-ll-sand bg-ll-cream/60 p-3">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded accent-ll-sage-deep"
          />
          <span className="text-sm text-ll-warm-gray">
            {role === 'family'
              ? 'I understand Little Lamb is a listing service, not an agency, and that I’m responsible for choosing, interviewing, and hiring my own sitter. '
              : 'I understand Little Lamb is a listing service, not an agency, and that I’m responsible for choosing which families I work with. '}
            I agree to the{' '}
            <Link to="/terms" className="font-semibold text-ll-sage-deep underline-offset-2 hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="font-semibold text-ll-sage-deep underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {error && (
          <p role="alert" className="text-sm font-semibold text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={busy}>
          Create account
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-ll-warm-gray">
        <span className="h-px flex-1 bg-ll-ink/10" />
        or
        <span className="h-px flex-1 bg-ll-ink/10" />
      </div>

      <GoogleButton onClick={handleGoogle} loading={busy} label="Sign up with Google" />
    </AuthShell>
  )
}
