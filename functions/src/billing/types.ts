// Shared billing types (kept separate to avoid an import cycle between the charge
// engine and the PDF renderer).

export interface BillingRates {
  subscriptionCents: number
  perBookingCents: number
}

export interface InvoiceLineItem {
  label: string
  quantity: number
  unitCents: number
  amountCents: number
}
