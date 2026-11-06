import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { sendVerificationEmail, refreshEmailVerified } from '../../lib/mfa'
import { mfaGateRedirect } from '../../lib/mfaGate'
import { AuthShell } from '../../components/auth/AuthShell'
import { Button } from '../../components/ui'

/**
 * Step 1 of mandatory MFA. Firebase refuses to enrol a second factor until the account's email
 * is verified, so every user clears this gate first. We send a verification link, then poll
 * `reload()` so that as soon as they click the link in their inbox they move on to enrollment
 * — no manual re-login. Google sign-ins arrive pre-verified and are bounced straight past this
 * by the gate, so they never see this page.
 */
export function MfaVerifyEmailPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // If a verified+enrolled (or verified-but-unenrolled) user lands here, send them onward.
  useEffect(() => {
    const redirect = mfaGateRedirect(user)
    if (user && redirect !== '/mfa/verify-email') {
      navigate(redirect ?? '/', { replace: true })
    }
  }, [user, navigate])

  // Auto-send once on arrival, then poll for verification every few seconds.
  useEffect(() => {
    if (!user) return
    let active = true
    sendVerificationEmail(user)
      .then(() => active && setSent(true))
      .catch(() => {})
    const poll = setInterval(async () => {
      if (!user) return
      const verified = await refreshEmailVerified(user).catch(() => false)
      if (verified && active) {
        clearInterval(poll)
        navigate('/mfa/enroll', { replace: true })
      }
    }, 4000)
    return () => {
      active = false
      clearInterval(poll)
    }
  }, [user, navigate])

  async function resend() {
    if (!user) return
    setError(null)
    setBusy(true)
    try {
      await sendVerificationEmail(user)
      setSent(true)
    } catch {
      setError('Couldn’t send the email just now. Please try again in a moment.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="text-display-md">Verify your email</h1>
      <p className="mt-2 text-ll-warm-gray">
        For your family’s security, Little Lamb requires an extra sign-in step. First, confirm
        your email: we’ve sent a link to{' '}
        <span className="font-semibold text-ll-ink">{user?.email}</span>. Click it, and this page
        will move you on automatically.
      </p>
      {sent && (
        <p className="mt-4 rounded-ll bg-ll-sage/10 px-4 py-3 text-sm text-ll-sage-deep">
          Verification email sent. Check your inbox (and spam folder).
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm font-semibold text-red-600">
          {error}
        </p>
      )}
      <Button className="mt-6 w-full" variant="secondary" loading={busy} onClick={resend}>
        Resend email
      </Button>
    </AuthShell>
  )
}
