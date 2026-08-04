// Server-side invoice PDF via pdfkit, stored to Cloud Storage at
// invoices/{familyId}/{invoiceId}.pdf. Mirrors the branded HTML invoice the client
// prints (src/lib/exporters.ts) but is the authoritative, emailable artifact.
//
// The buildInvoicePdfBuffer step is pure (Buffer in, no Firebase) so it can be tested;
// renderInvoicePdf wraps it with the Storage upload.

import PDFDocument from 'pdfkit'
import { storage } from '../firebase'
import type { InvoiceLineItem } from './types'

export interface InvoiceData {
  invoiceId: string
  familyId: string
  familyName: string
  periodStart: string // YYYY-MM-DD
  periodEnd: string // YYYY-MM-DD
  lineItems: InvoiceLineItem[]
  totalCents: number
}

function money(cents: number): string {
  return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

/** Render the invoice to a PDF Buffer. Pure (no Firebase). */
export function buildInvoicePdfBuffer(inv: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 56 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.fontSize(26).fillColor('#c4704f').text('Little Lamb Nannies')
    doc.moveDown(0.2)
    doc.fontSize(11).fillColor('#8a8276').text('Santa Barbara, CA')
    doc.moveDown(1)

    doc.fillColor('#2e2a26').fontSize(16).text(`Invoice ${inv.invoiceId}`)
    doc.fontSize(11).fillColor('#8a8276')
      .text(`Billed to: ${inv.familyName}`)
      .text(`Period: ${inv.periodStart} — ${inv.periodEnd}`)
    doc.moveDown(1)

    doc.fillColor('#2e2a26').fontSize(12)
    for (const li of inv.lineItems) {
      const label = li.quantity > 1 ? `${li.label} (${li.quantity} × ${money(li.unitCents)})` : li.label
      const y = doc.y
      doc.text(label, 56, y)
      doc.text(money(li.amountCents), 400, y, { width: 96, align: 'right' })
      doc.moveDown(0.5)
    }
    doc.moveDown(0.5)
    const ty = doc.y
    doc.fontSize(14).text('Total', 56, ty)
    doc.text(money(inv.totalCents), 400, ty, { width: 96, align: 'right' })

    doc.end()
  })
}

/** Render + upload to Storage; returns the storage path. */
export async function renderInvoicePdf(inv: InvoiceData): Promise<string> {
  const buffer = await buildInvoicePdfBuffer(inv)
  const path = `invoices/${inv.familyId}/${inv.invoiceId}.pdf`
  await storage.bucket().file(path).save(buffer, {
    contentType: 'application/pdf',
    resumable: false,
  })
  return path
}
