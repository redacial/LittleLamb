import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { FirebaseError } from 'firebase/app'
import { useAuth } from '../../context/AuthContext'
import { signInWithEmail, signInWithGoogle } from '../../lib/auth'
import { isTotpChallenge, resolveTotpSignIn } from '../../lib/mfa'
import { homeRouteFor } from '../../lib/routing'
import { friendlyAuthError, isValidEmail } from '../../lib/sanitize'
import { useReferralCapture, clearCapturedReferral } from '../../hooks/useReferralCapture'
import { AuthShell } from '../../components/auth/AuthShell'
import { RoleToggle, type SignupRole } from '../../components/auth/RoleToggle'
import { GoogleButton } from '../../components/auth/GoogleButton'
import { Button, Input } from '../../components/ui'

export function LoginPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const referralCode = useReferralCapture()

  const [role, setRole] = useState<SignupRole>('family')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // When an enrolled user logs in, Firebase demands their TOTP code. We stash the challenge
  // error and show a code field; `resolveTotpSignIn` finishes the sign-in once they enter it.
  const [mfaChallenge, setMfaChallenge] = useState<unknown | null>(null)
  const [mfaCode, setMfaCode] = useState('')

  // Once signed in and the profile resolves, route to where this account belongs.
  useEffect(() => {
    if (user && profile) navigate(homeRouteFor(profile), { replace: true })
  }, [user, profile, navigate])

  // Already signed in (e.g. deep-linked here) — bounce immediately.
  if (user && profile) return <Navigate to={homeRouteFor(profile)} replace />

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setBusy(true)
    try {
      await signInWithEmail(email.trim(), password)
      // Redirect handled by the effect once the profile snapshot arrives.
    } catch (err) {
      // An enrolled user triggers the MFA challenge rather than a plain failure. Switch the
      // form into code-entry mode instead of showing an error.
      if (isTotpChallenge(err)) {
        setMfaChallenge(err)
        setBusy(false)
        return
      }
      setError(err instanceof FirebaseError ? friendlyAuthError(err.code) : 'Something went wrong.')
      setBusy(false)
    }
  }

  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const code = mfaCode.replace(/\s/g, '')
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your authenticator app.')
      return
    }
    setBusy(true)
    try {
      await resolveTotpSignIn(mfaChallenge as never, code)
      // Success — the auth effect routes the now-fully-signed-in user.
    } catch {
      // Wrong/expired code (or no matching factor). Keep them on the challenge, let them retry.
      setError('That code didn’t match. Check your authenticator app and try again.')
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

  // MFA challenge mode: the password was correct, we just need the authenticator code.
  if (mfaChallenge) {
    return (
      <AuthShell>
        <h1 className="text-display-md">One more step</h1>
        <p className="mt-2 text-ll-warm-gray">
          Enter the 6-digit code from your authenticator app to finish logging in.
        </p>
        <form onSubmit={handleMfaSubmit} className="mt-6 space-y-4" noValidate>
          <Input
            label="Authenticator code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            maxLength={7}
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            required
          />
          {error && (
            <p role="alert" className="text-sm font-semibold text-red-600">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" loading={busy}>
            Verify &amp; log in
          </Button>
          <button
            type="button"
            className="w-full text-sm font-semibold text-ll-warm-gray underline-offset-2 hover:underline"
            onClick={() => {
              setMfaChallenge(null)
              setMfaCode('')
              setError(null)
            }}
          >
            Back to login
          </button>
        </form>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      footer={
        <p>
          New here?{' '}
          <Link to="/signup" className="font-bold text-ll-sage-deep underline-offset-2 hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      <h1 className="text-display-md">Welcome back</h1>
      <p className="mt-2 text-ll-warm-gray">Log in to manage your bookings and schedule.</p>

      <div className="mt-7">
        <RoleToggle value={role} onChange={setRole} />
      </div>

      <form onSubmit={handleEmailLogin} className="mt-6 space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && (
          <p role="alert" className="text-sm font-semibold text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={busy}>
          Log in
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-ll-warm-gray">
        <span className="h-px flex-1 bg-ll-ink/10" />
        or
        <span className="h-px flex-1 bg-ll-ink/10" />
      </div>

      <GoogleButton onClick={handleGoogle} loading={busy} />
    </AuthShell>
  )
}
