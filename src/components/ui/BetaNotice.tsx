// Beta notice shown while the platform is running WITHOUT its email backend (pre-Blaze).
// During this window the app is fully usable, but the Cloud Functions that send approval /
// confirmation emails aren't deployed, so testers would otherwise wonder why no email arrives.
// Keyed off VITE_BETA_NO_EMAIL so it vanishes automatically once email goes live — set it in
// the no-functions staging build, remove it when functions deploy. Nothing to rip out later.

/** True when this build is the no-email beta (VITE_BETA_NO_EMAIL === 'true'). */
export const betaNoEmail = import.meta.env.VITE_BETA_NO_EMAIL === 'true'

/**
 * Small inline notice setting honest expectations during the no-email beta. Renders nothing
 * when email is live, so call sites can mount it unconditionally.
 */
export function BetaNotice({ context = 'default' }: { context?: 'signup' | 'holding' | 'default' }) {
  if (!betaNoEmail) return null

  const message =
    context === 'holding'
      ? 'We’re in early beta — we’re not sending emails yet. You don’t need to watch your inbox: this page updates on its own the moment you’re approved.'
      : context === 'signup'
        ? 'We’re in early beta. You won’t receive confirmation emails yet — once you sign up, your status updates right inside the app.'
        : 'We’re in early beta — email notifications aren’t on yet. Status updates appear in the app.'

  return (
    <div
      role="status"
      className="rounded-ll-input border-1.5 border-ll-peri-soft bg-ll-peri-light px-4 py-3 text-sm text-ll-peri-ink"
    >
      {message}
    </div>
  )
}
