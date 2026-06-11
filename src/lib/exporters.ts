// Dependency-free export helpers for the admin/family billing screens.
//
// CSV: Excel opens .csv files directly, so we ship CSV (named .csv) rather than a true
// binary .xlsx. A real .xlsx would require a library like SheetJS — deferred to avoid a heavy
// dependency until the product actually needs styled spreadsheets.
//
// Invoices: there is no server-side PDF service yet, so "PDF download" opens a print-ready
// branded window and relies on the browser's "Save as PDF". Swap in a server renderer later.

export type CSVRow = Record<string, string | number>

/** RFC-4180-ish: quote any field containing a comma, quote, CR or LF; double internal quotes. */
function escapeField(value: string | number): string {
  const s = String(value ?? '')
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * Serialize rows to a CSV string. Column order comes from `headers` when given, otherwise from
 * the keys of the first row. Missing values render as empty fields.
 */
export function toCSV(rows: CSVRow[], headers?: string[]): string {
  const cols = headers ?? (rows[0] ? Object.keys(rows[0]) : [])
  const lines = [cols.map(escapeField).join(',')]
  for (const row of rows) {
    lines.push(cols.map((c) => escapeField(row[c] ?? '')).join(','))
  }
  return lines.join('\r\n')
}

/** Build a text/csv Blob from rows and trigger a browser download via a temporary <a download>. */
export function downloadCSV(filename: string, rows: CSVRow[], headers?: string[]): void {
  const name = filename.endsWith('.csv') ? filename : `${filename}.csv`
  // Prefix a BOM so Excel reads UTF-8 (e.g. the $ sign / accented names) correctly.
  const blob = new Blob(['﻿' + toCSV(rows, headers)], { type: 'text/csv;charset=utf-8' })
  triggerDownload(name, blob)
}

function triggerDownload(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next tick so the click has a chance to start the download first.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export interface InvoiceData {
  invoiceNumber: string
  familyName: string
  quarterLabel: string
  issuedAt: string
  lineItems: { label: string; amount: number }[]
  total: number
}

function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Branded, print-ready invoice markup. Inline styles only so it stands alone in a new window. */
function invoiceHTML(inv: InvoiceData): string {
  const rows = inv.lineItems
    .map(
      (li) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #e7e0d4">${escapeHtml(li.label)}</td>` +
        `<td style="padding:10px 0;border-bottom:1px solid #e7e0d4;text-align:right;font-family:'DM Mono',monospace">${money(li.amount)}</td></tr>`,
    )
    .join('')

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Invoice ${escapeHtml(inv.invoiceNumber)}</title>
<style>
  body{font-family:'DM Sans',system-ui,sans-serif;color:#2e2a26;background:#fdfbf6;margin:0;padding:48px}
  .wrap{max-width:640px;margin:0 auto;background:#fff;border:1.5px solid #e7e0d4;border-radius:24px;padding:40px}
  h1{font-family:'Caveat',cursive;font-size:40px;margin:0;color:#c4704f}
  .sub{color:#8a8276;margin:4px 0 28px}
  .meta{display:flex;justify-content:space-between;color:#8a8276;font-size:14px;margin-bottom:24px}
  table{width:100%;border-collapse:collapse;font-size:15px}
  .total{display:flex;justify-content:space-between;margin-top:20px;font-weight:600;font-size:18px}
  .total span:last-child{font-family:'DM Mono',monospace}
  .foot{margin-top:32px;color:#8a8276;font-size:12px;text-align:center}
  @media print{body{padding:0}.wrap{border:none}}
</style></head>
<body>
  <div class="wrap">
    <h1>Little Lamb</h1>
    <p class="sub">Invoice ${escapeHtml(inv.invoiceNumber)}</p>
    <div class="meta">
      <div><strong>Billed to</strong><br/>${escapeHtml(inv.familyName)}</div>
      <div style="text-align:right"><strong>${escapeHtml(inv.quarterLabel)}</strong><br/>Issued ${escapeHtml(inv.issuedAt)}</div>
    </div>
    <table><tbody>${rows}</tbody></table>
    <div class="total"><span>Total</span><span>${money(inv.total)}</span></div>
    <p class="foot">Thank you for trusting Little Lamb with your family.</p>
  </div>
  <script>window.onload=function(){window.print()}</script>
</body></html>`
}

/**
 * Open a print-ready invoice in a new window and invoke the browser print dialog
 * ("Save as PDF"). Falls back to an HTML Blob download if a popup is blocked.
 */
export function printInvoice(inv: InvoiceData): void {
  const html = invoiceHTML(inv)
  const win = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900')
  if (win) {
    win.document.open()
    win.document.write(html)
    win.document.close()
    return
  }
  // Popup blocked — hand the user a downloadable HTML file they can open and print.
  downloadInvoiceHTML(inv)
}

/** Build an HTML Blob of the invoice and trigger a download (popup-blocker-safe path). */
export function downloadInvoiceHTML(inv: InvoiceData): void {
  const blob = new Blob([invoiceHTML(inv)], { type: 'text/html;charset=utf-8' })
  triggerDownload(`invoice-${inv.invoiceNumber}.html`, blob)
}
