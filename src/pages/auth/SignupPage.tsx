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
import { Button, Input } from '../../components/ui'

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
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user && profile) navigate(homeRouteFor(profile), { replace: true })
  }, [user, profile, navigate])

  if (user && profile) return <Navigate to={homeRouteFor(profile)} replace />

  async function handleSignup(e: React.FormEvent) {
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
          <Link to="/login" className="font-bold text-sage-600 underline-offset-2 hover:underline">
            Log in
          </Link>
        </p>
      }
    >
      <h1 className="text-display-md">Join Little Lamb</h1>
      <p className="mt-2 text-charcoal-muted">
        {role === 'family'
          ? 'Create your family account. We review every application before your account goes live.'
          : 'Apply to join the nanny network. We review and interview before approval.'}
      </p>

      {referralCode && (
        <p className="mt-4 rounded-xl bg-sage-50 px-3 py-2 text-sm text-sage-700 ring-1 ring-sage-200">
          You were referred — welcome! We'll note who sent you.
        </p>
      )}

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
        {error && (
          <p role="alert" className="text-sm font-semibold text-terracotta-600">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={busy}>
          Create account
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-charcoal-faint">
        <span className="h-px flex-1 bg-charcoal/10" />
        or
        <span className="h-px flex-1 bg-charcoal/10" />
      </div>

      <GoogleButton onClick={handleGoogle} loading={busy} label="Sign up with Google" />
    </AuthShell>
  )
}
