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
      <p className="mt-1 text-sm text-ll-warm-gray">
        Share Little Lamb with friends. We’ll note who sent them.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="flex-1 truncate rounded-ll-input bg-ll-cream-dark px-3 py-2 font-mono text-sm text-ll-ink">{url}</code>
        <Button size="sm" variant="secondary" onClick={copy}>
          {copied ? 'Copied ✓' : 'Copy'}
        </Button>
      </div>
    </Card>
  )
}
