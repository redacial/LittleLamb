// exporters.ts feeds two documents that leave the platform and are trusted as records:
// the accounting CSV an admin hands a bookkeeper, and the invoice a family prints and keeps.
// Neither has a server-side renderer to cross-check it, so a quoting bug here is not a
// display glitch — it silently corrupts a financial document nobody re-reads.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { toCSV, downloadInvoiceHTML, type CSVRow, type InvoiceData } from './exporters'

/** Split a CSV string into its CRLF-delimited physical lines (NOT logical records). */
const lines = (csv: string) => csv.split('\r\n')

describe('toCSV — field escaping', () => {
  it('leaves ordinary fields unquoted', () => {
    expect(toCSV([{ name: 'Alice', total: 25 }])).toBe('name,total\r\nAlice,25')
  })

  it('quotes a field containing a comma so it stays ONE column', () => {
    // "Santa Barbara, CA" unquoted would shift every later column left by one — the
    // bookkeeper's totals column would silently read someone's zip code.
    const csv = toCSV([{ family: 'Ito, Kenji', total: 25 }])
    expect(lines(csv)[1]).toBe('"Ito, Kenji",25')
  })

  it('doubles embedded double-quotes and wraps the field', () => {
    const csv = toCSV([{ note: 'she said "yes"' }])
    expect(lines(csv)[1]).toBe('"she said ""yes"""')
  })

  it('quotes a field containing a newline', () => {
    const csv = toCSV([{ note: 'line one\nline two' }])
    expect(lines(csv).slice(1).join('\r\n')).toBe('"line one\nline two"')
  })

  it('quotes a field containing a CRLF', () => {
    // A pasted Windows-authored note must not terminate the record early.
    const csv = toCSV([{ note: 'a\r\nb', total: 1 }])
    expect(csv).toBe('note,total\r\n"a\r\nb",1')
  })

  it('quotes a bare CR', () => {
    expect(lines(toCSV([{ note: 'a\rb' }]))[1]).toBe('"a\rb"')
  })

  it('quotes headers that need it too', () => {
    const csv = toCSV([{ 'Total, USD': 5 }])
    expect(lines(csv)[0]).toBe('"Total, USD"')
  })
})

describe('toCSV — missing and null values', () => {
  // NOTE for future mutation testing: toCSV guards nullish values TWICE — `row[c] ?? ''` in
  // the row loop and `String(value ?? '')` inside escapeField. They are fully redundant, so
  // removing either one alone leaves these tests green. Both must be removed together to see
  // them fail (verified). That redundancy is a feature, not a reason to delete one: escapeField
  // is also called directly on headers.
  it('renders a missing column as an empty field, keeping column alignment', () => {
    const rows = [{ a: 1, b: 2 }, { a: 3 }] as unknown as CSVRow[]
    expect(toCSV(rows, ['a', 'b'])).toBe('a,b\r\n1,2\r\n3,')
  })

  it('renders null and undefined as empty, never the strings "null"/"undefined"', () => {
    // A literal "undefined" in an amount column is worse than a blank: it reads as data.
    const rows = [{ a: null, b: undefined, c: 'ok' }] as unknown as CSVRow[]
    expect(toCSV(rows, ['a', 'b', 'c'])).toBe('a,b,c\r\n,,ok')
  })

  it('preserves a real zero rather than blanking it', () => {
    // `row[c] ?? ''` must not swallow 0 — a $0 outstanding balance is meaningful.
    expect(toCSV([{ outstanding: 0 }])).toBe('outstanding\r\n0')
  })
})

describe('toCSV — shape', () => {
  it('derives columns from the first row when no headers are given', () => {
    expect(lines(toCSV([{ a: 1, b: 2 }]))[0]).toBe('a,b')
  })

  it('honours explicit header order and drops unlisted keys', () => {
    expect(toCSV([{ a: 1, b: 2, c: 3 }], ['c', 'a'])).toBe('c,a\r\n3,1')
  })

  it('emits a header-only document for zero rows', () => {
    expect(toCSV([], ['family', 'total'])).toBe('family,total')
  })

  it('emits a single empty line for zero rows and no headers', () => {
    expect(toCSV([])).toBe('')
  })

  it('separates records with CRLF', () => {
    expect(toCSV([{ a: 1 }, { a: 2 }])).toBe('a\r\n1\r\n2')
  })
})

describe('toCSV — spreadsheet formula injection', () => {
  // DOCUMENTING CURRENT BEHAVIOUR, NOT ENDORSING IT. This output is opened in Excel, where a
  // leading =, +, - or @ makes the cell a FORMULA. A family display name of
  // `=HYPERLINK("http://evil","Click")` becomes a live link in the bookkeeper's spreadsheet.
  // toCSV does not neutralise these today. Changing that silently would alter every export's
  // contents, so it is REPORTED rather than fixed here; these tests pin the status quo so a
  // future fix is a deliberate, visible change to this file.
  it.each(['=1+1', '+1', '-1', '@SUM(A1)'])('does NOT neutralise a leading %s today', (payload) => {
    expect(lines(toCSV([{ name: payload }]))[1]).toBe(payload)
  })

  it('a formula payload containing a comma is still only comma-quoted', () => {
    const csv = toCSV([{ name: '=HYPERLINK("http://x","Click")' }])
    // Quoted because of the comma and quotes — but Excel still evaluates it as a formula.
    expect(lines(csv)[1]).toBe('"=HYPERLINK(""http://x"",""Click"")"')
  })
})

// ---------------------------------------------------------------------------
// escapeHtml is private, and the invoice markup is what actually reaches a family. Rather
// than export the helper just to test it (which would widen the module's public surface for
// the test's convenience), drive it through the real render path: downloadInvoiceHTML builds
// the same markup printInvoice writes into the popup, so asserting on that Blob tests the
// escaping AS SHIPPED, including any call site that forgot to escape.
// ---------------------------------------------------------------------------

const baseInvoice: InvoiceData = {
  invoiceNumber: 'LL-2026-Q3',
  familyName: 'The Ito Family',
  quarterLabel: 'Q3 2026',
  issuedAt: 'Aug 16, 2026',
  lineItems: [{ label: 'Platform subscription', amount: 25 }],
  total: 25,
}

/**
 * Render an invoice and return the HTML that downloadInvoiceHTML put in the Blob.
 *
 * triggerDownload revokes its object URL on a `setTimeout(…, 0)`, so real timers would fire
 * that callback AFTER afterEach had unstubbed URL, crashing the run with an unhandled
 * "URL.revokeObjectURL is not a function". Fake timers let us flush it while the stub stands.
 */
function renderInvoice(overrides: Partial<InvoiceData> = {}): string {
  const blobs: Blob[] = []
  const OriginalBlob = globalThis.Blob
  // jsdom's Blob has no synchronous text accessor, so capture the parts as they're passed in.
  vi.stubGlobal(
    'Blob',
    class extends OriginalBlob {
      constructor(parts: BlobPart[], opts?: BlobPropertyBag) {
        super(parts, opts)
        blobs.push(this)
        ;(this as unknown as { __parts: BlobPart[] }).__parts = parts
      }
    },
  )
  // jsdom implements neither createObjectURL nor revokeObjectURL.
  vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:stub', revokeObjectURL: () => {} })
  // Clicking a real <a download> makes jsdom attempt a navigation it hasn't implemented and
  // log a noisy stack. We're asserting on the Blob's contents, not the download mechanism.
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

  downloadInvoiceHTML({ ...baseInvoice, ...overrides })
  vi.runAllTimers()
  click.mockRestore()

  const parts = (blobs[0] as unknown as { __parts: BlobPart[] }).__parts
  return parts.map(String).join('')
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('invoice HTML escaping', () => {
  it('escapes < and > in a family name so markup cannot be injected', () => {
    const html = renderInvoice({ familyName: '<script>alert(1)</script>' })
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert(1)</script>')
  })

  it('escapes & before the other entities, so & does not double-escape', () => {
    // Order matters: replacing < first would turn "&lt;" into "&amp;lt;" on the & pass.
    const html = renderInvoice({ familyName: 'Ben & Jerry <3' })
    expect(html).toContain('Ben &amp; Jerry &lt;3')
    expect(html).not.toContain('&amp;lt;')
  })

  it('escapes double-quotes in a line-item label', () => {
    const html = renderInvoice({
      lineItems: [{ label: 'Booking "extra hours"', amount: 3 }],
    })
    expect(html).toContain('Booking &quot;extra hours&quot;')
  })

  it('escapes the invoice number, quarter label and issue date', () => {
    const html = renderInvoice({
      invoiceNumber: 'LL<1>',
      quarterLabel: 'Q3 & Q4',
      issuedAt: '<b>Aug</b>',
    })
    expect(html).toContain('LL&lt;1&gt;')
    expect(html).toContain('Q3 &amp; Q4')
    expect(html).toContain('&lt;b&gt;Aug&lt;/b&gt;')
  })

  it('formats amounts as USD currency', () => {
    const html = renderInvoice({
      lineItems: [{ label: 'Platform subscription', amount: 25 }],
      total: 27.5,
    })
    expect(html).toContain('$25.00')
    expect(html).toContain('$27.50')
  })
})
