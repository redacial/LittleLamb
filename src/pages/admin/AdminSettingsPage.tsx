import { useEffect, useState } from 'react'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Tabs } from '../../components/Tabs'
import { Card, CardLabel, Input, Textarea, Button } from '../../components/ui'
import { badgeIdFromLabel, type BadgeDef } from '../../lib/badges'
import { Badge, Select } from '../../components/ui'
import { useBillingConfig, useBadgeCatalog, useCalendlyConfig, usePolicies } from '../../hooks/useAdmin'
import type { Policies } from '../../lib/policies'

/** Admin Settings — platform configuration (CLAUDE.md §10/Part 18). Editors for the config
 * collection. Values shown are the live defaults; persistence wires to config/{doc} (admin-only). */
export function AdminSettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Configure how the platform behaves." />
      <PageBody>
        <Tabs tabs={['Account', 'Email templates', 'Badges', 'Policies', 'Billing', 'Calendly']}>
          {(active) => {
            if (active === 'Account')
              return (
                <Card className="max-w-lg space-y-4">
                  <CardLabel>Account</CardLabel>
                  <Input label="Display name" defaultValue="Admin" />
                  <Input label="New password" type="password" autoComplete="new-password" />
                  <Button>Save</Button>
                </Card>
              )
            if (active === 'Email templates')
              return (
                <Card className="max-w-2xl space-y-3">
                  <CardLabel>Automated emails</CardLabel>
                  <p className="text-sm text-ll-warm-gray">Edit the copy for any automated email without a developer.</p>
                  <Input label="Subject: Application approved" defaultValue="Welcome to Little Lamb, you’re approved!" />
                  <Textarea label="Body" defaultValue="Hi {{name}}, your account is now live. Log in to finish your profile and start booking." />
                  <Button>Save template</Button>
                </Card>
              )
            if (active === 'Badges') return <BadgeCatalogCard />
            if (active === 'Policies') return <PoliciesCard />
            if (active === 'Billing') return <BillingConfigCard />

            return <CalendlyCard />
          }}
        </Tabs>
      </PageBody>
    </>
  )
}

/**
 * The interview-scheduling link (config/calendly).
 *
 * This tab used to be an input with a hardcoded `defaultValue` and a Save button with no
 * handler — so it displayed a URL that 404s as though it were configured, and typing a real
 * one and clicking Save silently discarded it. NannyHoldingPage held a second copy of the
 * same hardcoded string, free to drift from this one. Both now read config/calendly, and
 * an empty value here means the holding page shows no button at all.
 */
function CalendlyCard() {
  const { config, loading, save } = useCalendlyConfig()
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setUrl(config.url)
  }, [config])

  async function onSave() {
    setBusy(true)
    setSaved(false)
    setError(null)
    try {
      await save({ url: url.trim() })
      setSaved(true)
    } catch {
      setError('Could not save the Calendly link. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="max-w-lg space-y-4">
      <CardLabel>Calendly integration</CardLabel>
      <p className="text-sm text-ll-warm-gray">
        The interview scheduling link used in nanny status emails and on the holding page.
      </p>
      <Input
        label="Calendly link"
        placeholder="https://calendly.com/your-account/interview"
        hint="Leave blank until your Calendly is live — nannies see no booking button while it's empty, rather than a broken link."
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        disabled={loading}
      />
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {saved && <p className="text-sm font-semibold text-ll-sage-deep">Saved.</p>}
      <Button onClick={onSave} loading={busy} disabled={loading}>Save</Button>
    </Card>
  )
}

/**
 * Editable policy copy (config/policies) — the three blocks rendered on the shared
 * Policies page. Previously three textareas with no value/onChange and a dead Save.
 *
 * Saved as plain text; the Policies page splits it on newlines into paragraphs and never
 * renders it as markup.
 */
function PoliciesCard() {
  const { policies, loading, save } = usePolicies()
  const [draft, setDraft] = useState<Policies>(policies)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(policies)
  }, [policies])

  function edit(key: keyof Policies, value: string) {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  async function onSave() {
    setBusy(true)
    setSaved(false)
    setError(null)
    try {
      await save({
        platform: draft.platform.trim(),
        family: draft.family.trim(),
        nanny: draft.nanny.trim(),
      })
      setSaved(true)
    } catch {
      setError('Could not save the policies. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="max-w-2xl space-y-3">
      <CardLabel>Platform policies</CardLabel>
      <p className="text-sm text-ll-warm-gray">
        Shown on the Policies page for families and nannies. One rule per line — each line
        becomes its own paragraph. Clearing a box restores the built-in default.
      </p>
      <Textarea
        label="Little Lamb policies (platform-wide)"
        rows={4}
        value={draft.platform}
        onChange={(e) => edit('platform', e.target.value)}
        disabled={loading}
      />
      <Textarea
        label="Family policies"
        rows={3}
        value={draft.family}
        onChange={(e) => edit('family', e.target.value)}
        disabled={loading}
      />
      <Textarea
        label="Nanny policies"
        rows={3}
        value={draft.nanny}
        onChange={(e) => edit('nanny', e.target.value)}
        disabled={loading}
      />
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {saved && <p className="text-sm font-semibold text-ll-sage-deep">Saved.</p>}
      <Button onClick={onSave} loading={busy} disabled={loading}>Save policies</Button>
    </Card>
  )
}

/** Live billing rates + the "charge for real" master switch (config/billing). */
function BillingConfigCard() {
  const { config, loading, save } = useBillingConfig()
  const [subscription, setSubscription] = useState('25')
  const [perBooking, setPerBooking] = useState('1')
  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setSubscription((config.subscriptionCents / 100).toString())
    setPerBooking((config.perBookingCents / 100).toString())
    setEnabled(config.enabled)
  }, [config])

  async function onSave() {
    setBusy(true)
    setSaved(false)
    try {
      await save({
        subscriptionCents: Math.round(parseFloat(subscription || '0') * 100),
        perBookingCents: Math.round(parseFloat(perBooking || '0') * 100),
        enabled,
      })
      setSaved(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="max-w-lg space-y-4">
      <CardLabel>Billing configuration</CardLabel>
      <Input
        label="Flat subscription per quarter ($)"
        type="number"
        value={subscription}
        onChange={(e) => setSubscription(e.target.value)}
        disabled={loading}
      />
      <Input
        label="Per-booking fee ($)"
        type="number"
        value={perBooking}
        onChange={(e) => setPerBooking(e.target.value)}
        disabled={loading}
      />
      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded accent-ll-sage"
        />
        <span>
          <span className="font-semibold">Charge families for real</span>
          <span className="block text-ll-warm-gray">
            When off, quarterly billing dry-runs: it computes totals and generates invoices but
            never charges a card. Turn on only when you’re ready to bill.
          </span>
        </span>
      </label>
      {saved && <p className="text-sm font-semibold text-ll-sage-deep">Saved.</p>}
      <Button onClick={onSave} loading={busy} disabled={loading}>Save</Button>
    </Card>
  )
}


/**
 * The editable master badge list (config/badges).
 *
 * Ids are STABLE and labels are editable, deliberately: a badge id is persisted on every
 * nanny doc that earned it, so renaming "CPR Certified" to "CPR (Infant + Child)" must
 * rewrite the label only. Renaming the id would orphan the badge on every nanny at once.
 * That is also why removal asks for confirmation — the id lingers on nanny docs, where
 * badgeLabel() falls back to rendering the raw id.
 */
function BadgeCatalogCard() {
  const { badges, loading, save } = useBadgeCatalog()
  const [draft, setDraft] = useState<BadgeDef[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [newType, setNewType] = useState<'self' | 'verified'>('self')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setDraft(badges)
  }, [badges])

  function addBadge() {
    const label = newLabel.trim()
    if (!label) return
    const id = badgeIdFromLabel(label)
    if (draft.some((b) => b.id === id)) {
      setError(`A badge with the id “${id}” already exists.`)
      return
    }
    setDraft((prev) => [...prev, { id, label, type: newType }])
    setNewLabel('')
    setError(null)
    setSaved(false)
  }

  function renameBadge(id: string, label: string) {
    setDraft((prev) => prev.map((b) => (b.id === id ? { ...b, label } : b)))
    setSaved(false)
  }

  function removeBadge(id: string) {
    setDraft((prev) => prev.filter((b) => b.id !== id))
    setSaved(false)
  }

  async function onSave() {
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      await save(draft.map((b) => ({ ...b, label: b.label.trim() })).filter((b) => b.label))
      setSaved(true)
    } catch {
      setError('Could not save the badge list. Check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="max-w-2xl space-y-4">
      <CardLabel>Badge master list</CardLabel>
      <p className="text-sm text-ll-warm-gray">
        Self-reported (sage) badges are chosen by nannies. Admin-verified (periwinkle) badges are
        assigned by you after an interview. Editing a label updates it everywhere; the badge stays
        attached to the nannies who already have it.
      </p>

      {loading ? (
        <p className="text-sm text-ll-warm-gray">Loading…</p>
      ) : (
        <div className="space-y-2">
          {draft.map((b) => (
            <div key={b.id} className="flex flex-wrap items-center gap-2">
              <Badge label={b.label || b.id} type={b.type} size="sm" />
              <Input
                aria-label={`Label for ${b.id}`}
                value={b.label}
                onChange={(e) => renameBadge(b.id, e.target.value)}
                className="max-w-xs flex-1"
              />
              <Button size="sm" variant="ghost" onClick={() => removeBadge(b.id)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t-1.5 border-ll-cream-dark pt-4">
        <Input
          label="New badge label"
          placeholder="e.g. Infant Sleep Trained"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="max-w-xs flex-1"
        />
        <Select
          label="Type"
          value={newType}
          onChange={(e) => setNewType(e.target.value === 'verified' ? 'verified' : 'self')}
        >
          <option value="self">Self-reported</option>
          <option value="verified">Admin-verified</option>
        </Select>
        <Button size="sm" variant="secondary" onClick={addBadge} disabled={!newLabel.trim()}>
          Add
        </Button>
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {saved && <p className="text-sm font-semibold text-ll-sage-deep">Saved.</p>}
      <Button onClick={onSave} loading={busy} disabled={loading}>
        Save badge list
      </Button>
    </Card>
  )
}
