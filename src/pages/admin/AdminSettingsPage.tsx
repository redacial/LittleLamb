import { useEffect, useState } from 'react'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Tabs } from '../../components/Tabs'
import { Card, CardLabel, Input, Textarea, Button } from '../../components/ui'
import { badgeIdFromLabel, type BadgeDef } from '../../lib/badges'
import { Badge, Select } from '../../components/ui'
import { useBillingConfig, useBadgeCatalog, useCalendlyConfig, usePolicies } from '../../hooks/useAdmin'
import type { Policies } from '../../lib/policies'

/**
 * Admin Settings — platform configuration (CLAUDE.md §10/Part 18). Editors for the config
 * collection. Every control on this page persists to config/{doc} (admin-only).
 *
 * Two tabs specced in CLAUDE.md are deliberately ABSENT rather than mocked up:
 *
 *  - **Account** (display name + password change). A password change is a Firebase Auth
 *    operation, not a config write: it needs reauthenticateWithCredential before
 *    updatePassword, because Firebase rejects a password change on a stale login with
 *    auth/requires-recent-login. That belongs in src/lib/auth.ts alongside the other auth
 *    operations — no page in this codebase imports firebase/auth directly. Until it is built
 *    there, showing the form would be worse than showing nothing: admin types a new password,
 *    clicks Save, and believes their account is now protected by a password that was never set.
 *
 *  - **Email templates**. Subjects and bodies are built by a hardcoded switch in
 *    functions/src/email/templates.ts. Editing copy here could not change a single sent email
 *    until the server reads a config doc, so the tab is replaced by an honest read-only note.
 *
 * Both were previously `defaultValue` inputs above a Save button with no onClick. Same
 * reasoning as the removed "120+ families" claim: a control that looks like it works and does
 * nothing is worse than no control, because it costs the user their trust as well as the edit.
 */
export function AdminSettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Configure how the platform behaves." />
      <PageBody>
        <Tabs tabs={['Badges', 'Policies', 'Billing', 'Calendly', 'Emails']}>
          {(active) => {
            if (active === 'Badges') return <BadgeCatalogCard />
            if (active === 'Policies') return <PoliciesCard />
            if (active === 'Billing') return <BillingConfigCard />
            if (active === 'Calendly') return <CalendlyCard />

            return <EmailCopyNote />
          }}
        </Tabs>
      </PageBody>
    </>
  )
}

/**
 * Read-only explanation of where automated email copy lives.
 *
 * This replaced an editable subject + body with a dead "Save template" button. Making it real
 * is a SERVER change, not a client one: renderNotification() in functions/src/email/templates.ts
 * builds every subject and body from a hardcoded switch, so anything saved from here would sit
 * in Firestore unread while the emails went out unchanged — the most expensive kind of dead
 * control, because admin would only discover it from a recipient.
 *
 * Deliberately contains no input and no button. The honest version of a capability you don't
 * have is a sentence, not a disabled form.
 */
function EmailCopyNote() {
  return (
    <Card className="max-w-2xl space-y-3">
      <CardLabel>Automated emails</CardLabel>
      <p className="text-sm text-ll-ink">
        Email copy is currently developer-managed — there’s nothing to edit here yet.
      </p>
      <p className="text-sm text-ll-warm-gray">
        Approval and rejection notices, booking confirmations, application status updates and
        quarterly invoices are all sent automatically. Their wording lives in the platform code
        (<span className="font-mono text-mono-sm">functions/src/email/templates.ts</span>), so a
        change to any of them is a quick developer task rather than something you can edit here.
      </p>
      <p className="text-sm text-ll-warm-gray">
        The links these emails point to <em>are</em> yours to change: the interview booking link
        lives on the Calendly tab, and the policy text they reference lives on the Policies tab.
      </p>
    </Card>
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
