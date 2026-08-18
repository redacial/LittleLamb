import { useEffect, useState } from 'react'
import { Modal, Button, Badge } from '../ui'
import { useBadgeCatalog, useNannyVerifiedBadges } from '../../hooks/useAdmin'

/**
 * The post-interview pass: Lucy interviews a nanny offline, then ticks the credentials she
 * actually verified. Writes `verifiedBadges` on nannies/{uid} — admin-only per the deployed
 * rules, and immutable from the nanny's own client, which is what makes a periwinkle chip
 * mean something to a parent.
 *
 * Self-reported badges are deliberately absent: those are the nanny's to claim in her own
 * setup wizard. Mixing them here would let an admin silently edit her self-description and
 * blur the one distinction the two badge colors exist to draw.
 */
export function VerifiedBadgesModal({
  uid,
  fullName,
  open,
  onClose,
}: {
  uid: string
  fullName: string
  open: boolean
  onClose: () => void
}) {
  const { verified: catalog, loading: catalogLoading } = useBadgeCatalog()
  const { verifiedBadges, loading, save } = useNannyVerifiedBadges(open ? uid : null)
  const [selected, setSelected] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Seed the local draft from the live doc. Keyed on the doc value so reopening the modal
  // (or a concurrent admin's write landing) re-syncs rather than showing a stale draft.
  useEffect(() => {
    setSelected(verifiedBadges)
    setError(null)
  }, [verifiedBadges, open])

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]))
  }

  async function onSave() {
    setBusy(true)
    setError(null)
    try {
      // Persist in catalog order, not click order, so the write is stable and diffable.
      await save(catalog.filter((b) => selected.includes(b.id)).map((b) => b.id))
      onClose()
    } catch {
      // A silent failure here is the dangerous one: the admin closes the modal believing a
      // credential was recorded, and the profile never shows it.
      setError('Could not save those badges. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Verified badges — ${fullName}`}>
      <p className="mb-4 text-sm text-ll-warm-gray">
        Tick the credentials you confirmed during the interview. These show on {fullName}’s public
        profile as verified — she can’t add them herself.
      </p>

      {loading || catalogLoading ? (
        <p className="text-sm text-ll-warm-gray">Loading…</p>
      ) : (
        <div className="space-y-2">
          {catalog.map((b) => {
            const checked = selected.includes(b.id)
            return (
              <label
                key={b.id}
                className="flex cursor-pointer items-center gap-3 rounded-ll-input border-1.5 border-ll-cream-dark bg-ll-cream p-3 transition-colors hover:bg-ll-cream-dark focus-within:border-ll-sage"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(b.id)}
                  className="h-5 w-5 shrink-0 rounded accent-ll-sage"
                />
                <Badge label={b.label} type="verified" size="sm" />
              </label>
            )
          })}
          {catalog.length === 0 && (
            <p className="text-sm text-ll-warm-gray">
              No verified badges defined yet — add them in Settings → Badges.
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}

      <div className="mt-5 flex gap-2">
        <Button onClick={onSave} loading={busy} disabled={loading || catalogLoading}>
          Save badges
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  )
}
