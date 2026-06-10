import { useState } from 'react'
import { Card, CardLabel, Button } from './ui'
import { referralUrl } from '../lib/referral'

/** Share-your-referral-link panel. Lightweight attribution — no rewards (spec Part 16). */
export function ReferralCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const url = referralUrl(code)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Card>
      <CardLabel>Your referral link</CardLabel>
      <p className="mt-1 text-sm text-charcoal-muted">
        Share Little Lamb with friends. We’ll note who sent them.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="flex-1 truncate rounded-lg bg-cream-200 px-3 py-2 text-sm">{url}</code>
        <Button size="sm" variant="secondary" onClick={copy}>
          {copied ? 'Copied ✓' : 'Copy'}
        </Button>
      </div>
    </Card>
  )
}
