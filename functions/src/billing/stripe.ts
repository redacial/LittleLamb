// Lazy Stripe client. Constructed inside handlers so importing this module never
// requires a key — the build and unit tests stay green without STRIPE_SECRET_KEY,
// and the key is read from the bound secret only when a handler actually runs.
//
// This session targets Stripe TEST mode only; nothing charges a real card until the
// live key is set on Blaze day AND config/billing.enabled is flipped true.
import Stripe from 'stripe'
import { STRIPE_SECRET_KEY } from '../config'

let client: Stripe | null = null

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(STRIPE_SECRET_KEY.value(), {
      // Pin the API version for deterministic behavior across deploys. Matches the
      // version the installed stripe SDK is generated against.
      apiVersion: '2025-02-24.acacia',
    })
  }
  return client
}
