// Payment card capture for the family setup wizard.
//
// When Stripe is configured (publishable key present + functions deployed), this mounts
// Stripe Elements: it fetches a SetupIntent, collects the card via PaymentElement, confirms
// it browser->Stripe (card data never touches our servers — out of PCI scope), then tells
// the server to save it. When Stripe is NOT configured (local dev / pre-Blaze), it shows a
// clear "activates at launch" fallback and lets the family mark the step complete so
// onboarding isn't blocked while the backend is being stood up.
import { useEffect, useState } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { Button, Input } from '../ui'
import {
  stripeEnabled,
  getStripeJs,
  createSetupIntent,
  savePaymentMethod,
} from '../../hooks/useBilling'

interface Props {
  /** Called once a card is saved (real) or the fallback is acknowledged. */
  onComplete: () => void
  saving: boolean
}

function CardForm({ onComplete }: { onComplete: () => void }) {
  const stripe = useStripe()
  const elements = useElements()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (!stripe || !elements) return
    setBusy(true)
    setError(null)
    try {
      const { error: confirmError, setupIntent } = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
      })
      if (confirmError) throw new Error(confirmError.message ?? 'Card could not be saved.')
      const pmId =
        typeof setupIntent?.payment_method === 'string'
          ? setupIntent.payment_method
          : setupIntent?.payment_method?.id
      if (!pmId) throw new Error('No payment method returned.')
      await savePaymentMethod(pmId)
      onComplete()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Card could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      <Button onClick={submit} loading={busy} disabled={!stripe}>
        Save card
      </Button>
    </div>
  )
}

export function PaymentStep({ onComplete, saving }: Props) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [stripeJs, setStripeJs] = useState<Awaited<ReturnType<typeof getStripeJs>>>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [acknowledged, setAcknowledged] = useState(false)

  useEffect(() => {
    if (!stripeEnabled) return
    let cancelled = false
    ;(async () => {
      try {
        const [secret, js] = await Promise.all([createSetupIntent(), getStripeJs()])
        if (cancelled) return
        setClientSecret(secret)
        setStripeJs(js)
      } catch {
        if (!cancelled) setInitError('We couldn’t start card setup. Please try again.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // Fallback path: Stripe not configured yet (local dev / before Blaze go-live).
  if (!stripeEnabled) {
    return (
      <div className="space-y-4">
        <div className="rounded-ll-card border-1.5 border-dashed border-ll-warm-gray bg-white p-5">
          <p className="text-sm text-ll-warm-gray">
            Secure card capture activates at launch. Your card will be added then; you won’t be
            charged today. Continue to finish setting up your account.
          </p>
          <label className="mt-4 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="h-4 w-4 rounded accent-ll-sage"
            />
            I understand I’ll add a card at launch
          </label>
        </div>
        <Button onClick={onComplete} loading={saving} disabled={!acknowledged}>
          Finish setup
        </Button>
      </div>
    )
  }

  if (initError) {
    return <p role="alert" className="text-sm font-semibold text-red-600">{initError}</p>
  }

  if (!clientSecret || !stripeJs) {
    return (
      <div className="rounded-ll-card border-1.5 border-dashed border-ll-warm-gray bg-white p-5">
        <Input label="Card" placeholder="Loading secure card field…" disabled />
      </div>
    )
  }

  return (
    <Elements stripe={stripeJs} options={{ clientSecret }}>
      <CardForm onComplete={onComplete} />
    </Elements>
  )
}
