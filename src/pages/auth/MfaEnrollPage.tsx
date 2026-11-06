import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import type { TotpSecret } from 'firebase/auth'
import { useAuth } from '../../context/AuthContext'
import { startTotpEnrollment, completeTotpEnrollment } from '../../lib/mfa'
import { mfaGateRedirect } from '../../lib/mfaGate'
import { homeRouteFor } from '../../lib/routing'
import { AuthShell } from '../../components/auth/AuthShell'
import { Button, Input } from '../../components/ui'

/**
 * Step 2 of mandatory MFA: enrol an authenticator-app (TOTP) second factor. Required for every
 * user. We generate the secret, render its QR locally (the secret never leaves the browser —
 * `qrcode` draws to a data URL, no network call), and also show the manual key for users who
 * can't scan. The user confirms by entering the first 6-digit code, which Firebase verifies
 * before the factor is permanently enrolled.
 */
export function MfaEnrollPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [secret, setSecret] = useState<TotpSecret | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [manualKey, setManualKey] = useState<string>('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const started = useRef(false)

  // If the gate says this user shouldn't be enrolling (e.g. unverified email, or already
  // enrolled), send them where they belong instead of showing a QR.
  useEffect(() => {
    const redirect = mfaGateRedirect(user)
    if (user && redirect !== '/mfa/enroll') {
      navigate(redirect ?? homeRouteFor(profile), { replace: true })
    }
  }, [user, profile, navigate])

  // Generate the secret once on mount (guarded against StrictMode double-invoke).
  useEffect(() => {
    if (!user || started.current) return
    started.current = true
    startTotpEnrollment(user)
      .then(async ({ secret, qrUri, sharedSecretKey }) => {
        setSecret(secret)
        setManualKey(sharedSecretKey)
        setQrDataUrl(await QRCode.toDataURL(qrUri, { margin: 1, width: 220 }))
      })
      .catch(() => {
        setError(
          'Couldn’t start setup. Your email may not be verified yet, or two-factor isn’t ' +
            'available on this account. Please try again shortly.',
        )
      })
  }, [user])

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const clean = code.replace(/\s/g, '')
    if (!/^\d{6}$/.test(clean)) {
      setError('Enter the 6-digit code shown in your authenticator app.')
      return
    }
    if (!user || !secret) return
    setBusy(true)
    try {
      await completeTotpEnrollment(user, secret, clean)
      // Enrolled. The gate now passes; route to the user's home.
      navigate(homeRouteFor(profile), { replace: true })
    } catch {
      setError('That code didn’t match. It changes every 30 seconds — try the current one.')
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="text-display-md">Set up two-factor</h1>
      <p className="mt-2 text-ll-warm-gray">
        One last step. Scan this with an authenticator app (Google Authenticator, 1Password,
        Authy…), then enter the 6-digit code it shows. You’ll use that code each time you log in.
      </p>

      <div className="mt-6 flex flex-col items-center gap-4">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR code for authenticator app setup"
            className="rounded-ll border border-ll-ink/10 bg-white p-2"
            width={220}
            height={220}
          />
        ) : (
          <div
            aria-label="Loading setup code"
            className="grid h-[220px] w-[220px] place-items-center rounded-ll border border-dashed border-ll-ink/15"
          >
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-ll-sage border-t-transparent" />
          </div>
        )}
        {manualKey && (
          <details className="w-full text-sm text-ll-warm-gray">
            <summary className="cursor-pointer font-semibold">Can’t scan? Enter a key instead</summary>
            <code className="mt-2 block break-all rounded-ll bg-ll-ink/5 px-3 py-2 font-mono text-ll-ink">
              {manualKey}
            </code>
          </details>
        )}
      </div>

      <form onSubmit={handleConfirm} className="mt-6 space-y-4" noValidate>
        <Input
          label="6-digit code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          disabled={!secret}
          required
        />
        {error && (
          <p role="alert" className="text-sm font-semibold text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" className="w-full" loading={busy} disabled={!secret}>
          Turn on two-factor
        </Button>
      </form>
    </AuthShell>
  )
}
