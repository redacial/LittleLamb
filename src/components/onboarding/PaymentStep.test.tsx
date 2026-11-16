// Free-launch copy for the wizard's final step. Little Lamb launches FREE: stripeEnabled is
// false (VITE_BILLING_LIVE unset), so this component takes its non-Stripe branch. The old copy
// there said "Secure card capture activates at launch" / "you'll add a card at launch" — which
// is wrong for a free service and primes a parent to expect a bill. This asserts the branch now
// reads as a free service and still lets onboarding finish without a card.
//
// useBilling derives stripeEnabled from import.meta.env at module load; under test that env is
// unset, so stripeEnabled is false and the free-service branch renders. That IS the launch path.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PaymentStep } from './PaymentStep'
import { stripeEnabled } from '../../hooks/useBilling'

describe('PaymentStep — free-launch (billing off) copy', () => {
  it('is in the billing-off branch under the test env (sanity: the launch posture)', () => {
    expect(stripeEnabled).toBe(false)
  })

  it('does not request a card or mention any charge or price', () => {
    render(<PaymentStep onComplete={() => {}} saving={false} />)
    const body = document.body.textContent ?? ''
    // No pricing, no charge, no "activates/add a card at launch" framing. (Saying there is "no
    // card to add" is fine — what we're guarding against is asking for one or promising a bill.)
    expect(body).not.toMatch(/\$25|per quarter|per booking|charge|at launch|add a payment|save card/i)
    // It presents Little Lamb as free.
    expect(body).toMatch(/free/i)
  })

  it('lets the family finish setup immediately — no acknowledgement gate', async () => {
    const onComplete = vi.fn()
    render(<PaymentStep onComplete={onComplete} saving={false} />)
    const finish = screen.getByRole('button', { name: /finish setup/i })
    // No "I understand I'll add a card" checkbox to tick first.
    expect(finish).toBeEnabled()
    await userEvent.click(finish)
    expect(onComplete).toHaveBeenCalledOnce()
  })
})
