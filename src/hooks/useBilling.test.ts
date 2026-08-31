// The launch card-capture posture (DECISIONS D70).
//
// Little Lamb launches with billing OFF (no EIN → no live Stripe). A publishable key is present
// in .env.production for the later money-path test, so `Boolean(publishableKey)` alone would turn
// on real card capture at launch — mounting Stripe Elements and calling App-Check-enforced
// SetupIntent callables that aren't meant to run yet. David chose the wizard's "add a card later"
// fallback as the launch posture instead. So real card capture must require an EXPLICIT live flag
// (VITE_BILLING_LIVE === 'true'), not merely the presence of a key. This is the one switch flipped
// when billing goes live.
import { describe, it, expect } from 'vitest'
import { computeStripeEnabled } from './useBilling'

describe('computeStripeEnabled — the launch gate', () => {
  it('is OFF when a key is present but the live flag is not set (the launch build)', () => {
    // This is exactly .env.production today: test key present, VITE_BILLING_LIVE unset.
    expect(computeStripeEnabled({ publishableKey: 'pk_test_abc', billingLive: undefined })).toBe(false)
  })

  it('is OFF when the live flag is any value other than the literal "true"', () => {
    expect(computeStripeEnabled({ publishableKey: 'pk_test_abc', billingLive: 'false' })).toBe(false)
    expect(computeStripeEnabled({ publishableKey: 'pk_test_abc', billingLive: '1' })).toBe(false)
    expect(computeStripeEnabled({ publishableKey: 'pk_test_abc', billingLive: 'TRUE' })).toBe(false)
  })

  it('is ON only when a key is present AND the live flag is exactly "true"', () => {
    expect(computeStripeEnabled({ publishableKey: 'pk_live_abc', billingLive: 'true' })).toBe(true)
  })

  it('is OFF when the live flag is set but no key is configured (nothing to load)', () => {
    expect(computeStripeEnabled({ publishableKey: undefined, billingLive: 'true' })).toBe(false)
    expect(computeStripeEnabled({ publishableKey: '', billingLive: 'true' })).toBe(false)
  })
})
