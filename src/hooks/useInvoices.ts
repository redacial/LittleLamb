// Invoice reads. The `invoices` collection is written ONLY by the billing job
// (functions/src/billing/quarterlyCharge.ts); the client never writes it.
import { useCallback } from 'react'
import {
  collection,
  query,
  orderBy,
  limit,
  type DocumentData,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useGrowingCollection, type GrowingList } from './useGrowingCollection'
import { ADMIN_PAGE_SIZE } from './useAdmin'
import type { Invoice } from '../types'

/**
 * The ONE place cents become dollars.
 *
 * Invoices are stored in cents (`totalCents: 2700` is $27.00). This function exists so that
 * conversion is a single named, tested operation rather than a `/ 100` scattered across
 * render code where one omission is a silent 100× overstatement. Pair it with `money()`:
 * `money(invoiceDollars(inv.totalCents))`.
 *
 * Never feed the result back into anything that stores or re-sums money — convert at the
 * last possible moment, for display only.
 */
export function invoiceDollars(cents: number): number {
  return cents / 100
}

// Module scope: useGrowingCollection takes this as an effect dependency, so an inline
// arrow would resubscribe the listener on every render.
const mapInvoice = (d: QueryDocumentSnapshot<DocumentData>): Invoice => {
  const data = d.data() as Partial<Invoice>
  return {
    ...(data as Invoice),
    // The server writes invoiceId into the body AND uses it as the doc id, but the doc id
    // is the authority — a body written before that field existed would otherwise be
    // undefined and collapse every row onto the same React key.
    invoiceId: data.invoiceId ?? d.id,
    // Defaulted because a missing `dryRun` must never read as "this was really charged".
    dryRun: data.dryRun === true,
  }
}

/**
 * Every invoice on the platform, newest first. Admin-only.
 *
 * Firestore rules allow `list` on `invoices` for admins only (`isAdmin()`), so a
 * non-admin caller gets a permission error surfaced through `error` — which the UI must
 * render as a distinct "couldn't load" state, never as an empty history. An empty invoice
 * list and a failed read look identical otherwise, and "this family has no invoices" is
 * exactly the wrong conclusion to draw from a broken query on a billing page.
 *
 * Paginated like the other admin lists: this collection grows by one document per family
 * per quarter forever, and it is a live listener.
 */
export function useInvoices(): GrowingList<Invoice> {
  const buildQuery = useCallback(
    (n: number) => query(collection(db, 'invoices'), orderBy('createdAt', 'desc'), limit(n)),
    [],
  )
  return useGrowingCollection(buildQuery, mapInvoice, ADMIN_PAGE_SIZE)
}
