import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useFamilyProfile } from '../../hooks/useProfile'
import { uploadProfilePhoto } from '../../lib/storage'
import { cleanLine, cleanText } from '../../lib/sanitize'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, CardLabel, Input, Textarea, Button, Avatar, RateRangeInput, YesNo } from '../../components/ui'
import { parseRateDollars, validateRatePair } from '../../lib/rates'
import { formatAge } from '../../lib/format'
import { ReferralCard } from '../../components/ReferralCard'
import type { Child } from '../../types'

/** Family My Profile — editable any time after onboarding (CLAUDE.md §10.1). */
export function FamilyProfilePage() {
  const { user, profile } = useAuth()
  const uid = user?.uid
  const { profile: family, loading, save } = useFamilyProfile(uid)

  const [form, setForm] = useState({
    photoURL: null as string | null,
    hasPets: false,
    petsNote: '',
    allergies: '',
    houseRules: '',
    homeAddress: '',
    phone: '',
    coParentName: '',
    coParentEmail: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    // Raw dollar strings while typing; parsed to cents on save (see RateRangeInput).
    rateMin: '',
    rateMax: '',
  })
  const [children, setChildren] = useState<Child[]>([])
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!family) return
    setForm({
      photoURL: family.photoURL ?? null,
      hasPets: family.hasPets ?? false,
      petsNote: family.petsNote ?? '',
      allergies: family.allergies ?? '',
      houseRules: family.houseRules ?? '',
      homeAddress: family.homeAddress ?? '',
      phone: family.phone ?? '',
      coParentName: family.coParentName ?? '',
      coParentEmail: family.coParentEmail ?? '',
      emergencyContactName: family.emergencyContactName ?? '',
      emergencyContactPhone: family.emergencyContactPhone ?? '',
      rateMin: family.rateRange ? String(family.rateRange.minCents / 100) : '',
      rateMax: family.rateRange ? String(family.rateRange.maxCents / 100) : '',
    })
    setChildren(family.children ?? [])
  }, [family])

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    setSaved(false)
  }

  /*
   * No try/catch at all before this: a rejected upload (file over the size cap, a
   * storage-rules refusal, a dropped connection) threw into the void, the avatar never
   * changed, and the page said nothing — so the parent re-picked the same file repeatedly.
   * The wizard's version of this exact function already handled it; only the
   * post-onboarding editor did not.
   */
  async function onPhoto(file: File) {
    if (!uid) return
    setBusy(true)
    setError(null)
    try {
      const url = await uploadProfilePhoto(uid, file)
      setForm((f) => ({ ...f, photoURL: url }))
      await save({ photoURL: url })
    } catch (e) {
      // The storage layer's own message ("Image must be under 5MB") is the useful one —
      // it says what to do next, where a generic "upload failed" does not.
      setError(e instanceof Error ? e.message : 'We couldn’t upload that photo. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function onSave() {
    const badRate = validateRatePair(form.rateMin, form.rateMax)
    if (badRate) return setError(badRate)
    setError(null)
    const lo = parseRateDollars(form.rateMin)
    const hi = parseRateDollars(form.rateMax)
    setBusy(true)
    try {
      await save({
        ...(lo !== null && hi !== null ? { rateRange: { minCents: lo, maxCents: hi } } : {}),
        hasPets: form.hasPets,
        // Only keep a pets note when they have pets; clear it otherwise so a leftover note from a
        // toggled-off "yes" doesn't linger.
        petsNote: form.hasPets ? cleanLine(form.petsNote, 200) : '',
        allergies: cleanText(form.allergies, 1000),
        houseRules: cleanText(form.houseRules, 2000),
        homeAddress: cleanLine(form.homeAddress, 300),
        phone: cleanLine(form.phone, 32),
        coParentName: cleanLine(form.coParentName, 80),
        coParentEmail: cleanLine(form.coParentEmail, 254),
        emergencyContactName: cleanLine(form.emergencyContactName, 80),
        emergencyContactPhone: cleanLine(form.emergencyContactPhone, 32),
        children: children
          .map((c) => ({ name: cleanLine(c.name, 60), birthday: cleanLine(c.birthday ?? '', 10), interests: cleanLine(c.interests ?? '', 200) }))
          .filter((c) => c.name),
      })
      setSaved(true)
    } catch {
      // Previously try/finally with no catch: a failed write showed neither "Saved" nor an
      // error, so the click produced no feedback at all and the family assumed their new
      // address or allergy note was live. setSaved stays false so the two signals can
      // never both be absent.
      setError('We couldn’t save your changes. Please check your connection and try again.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageBody><p className="text-ll-warm-gray">Loading…</p></PageBody>

  return (
    <>
      <PageHeader title="My profile" subtitle="Keep your family details up to date." />
      <PageBody>
        <div className="max-w-2xl space-y-6">
          <Card>
            <div className="flex items-center gap-4">
              <Avatar name={profile?.fullName ?? 'Family'} src={form.photoURL} size="lg" />
              <label className="group inline-flex cursor-pointer items-center gap-1.5 rounded-full text-sm font-medium text-ll-sage-deep focus-within:outline-none focus-within:ring-2 focus-within:ring-ll-sage-mid focus-within:ring-offset-2 focus-within:ring-offset-ll-cream-dark">
                <span className="underline-offset-4 group-hover:underline">Change photo</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
                />
              </label>
            </div>
          </Card>

          <Card className="space-y-4">
            <CardLabel>Household</CardLabel>
            <Input label="Home address" value={form.homeAddress} onChange={(e) => set('homeAddress', e.target.value)} />
            <RateRangeInput
              role="family"
              min={form.rateMin}
              max={form.rateMax}
              onMinChange={(v) => set('rateMin', v)}
              onMaxChange={(v) => set('rateMax', v)}
            />
            <YesNo
              label="Any pets?"
              value={form.hasPets}
              onChange={(v) => { setForm((f) => ({ ...f, hasPets: v })); setSaved(false) }}
            />
            {form.hasPets && (
              <Input label="Tell us about them" hint="Optional" placeholder="e.g. a friendly golden retriever" value={form.petsNote} onChange={(e) => set('petsNote', e.target.value)} />
            )}
            <Textarea label="Allergies & special needs" value={form.allergies} onChange={(e) => set('allergies', e.target.value)} />
            <Textarea label="House rules & notes" value={form.houseRules} onChange={(e) => set('houseRules', e.target.value)} />
          </Card>

          <Card className="space-y-3">
            <CardLabel>Children</CardLabel>
            {children.map((c, i) => {
              const age = formatAge(c.birthday ?? '')
              return (
                <div key={i} className="space-y-2 rounded-ll-input border-1.5 border-ll-cream-dark p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Name" value={c.name} onChange={(e) => setChildren((cs) => cs.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))} />
                    <div>
                      <Input type="date" value={c.birthday ?? ''} onChange={(e) => setChildren((cs) => cs.map((x, idx) => (idx === i ? { ...x, birthday: e.target.value } : x)))} />
                      {age && <p className="mt-1 text-xs text-ll-warm-gray">{age} old</p>}
                    </div>
                  </div>
                  <Input placeholder="Interests & anything else (optional)" value={c.interests ?? ''} onChange={(e) => setChildren((cs) => cs.map((x, idx) => (idx === i ? { ...x, interests: e.target.value } : x)))} />
                </div>
              )
            })}
            <Button variant="ghost" size="sm" onClick={() => setChildren((cs) => [...cs, { name: '', birthday: '', interests: '' }])}>+ Add a child</Button>
          </Card>

          <Card className="space-y-4">
            <CardLabel>Primary contact</CardLabel>
            <Input label="Primary email" value={profile?.email ?? ''} disabled />
            <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            <Input label="Spouse / co-parent name" hint="Optional" value={form.coParentName} onChange={(e) => set('coParentName', e.target.value)} />
            <Input label="Spouse / co-parent email" hint="Optional" value={form.coParentEmail} onChange={(e) => set('coParentEmail', e.target.value)} />
          </Card>

          <Card className="space-y-4">
            <CardLabel>Emergency contact</CardLabel>
            <p className="text-sm text-ll-warm-gray">Someone we can reach if we can’t reach you — a grandparent, guardian, or friend.</p>
            <Input label="Name" hint="Optional" value={form.emergencyContactName} onChange={(e) => set('emergencyContactName', e.target.value)} />
            <Input label="Phone" hint="Optional" value={form.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone', e.target.value)} />
          </Card>

          {/* One error surface for the whole page, next to the Save button rather than buried
              mid-form: it now carries upload failures and save failures as well as the rate
              validator's message, and an error about a photo upload pinned under the rate
              fields would point at the wrong control. */}
          {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
            <Button onClick={onSave} loading={busy}>Save changes</Button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-ll-sage-deep" role="status">
                <CheckIcon /> Saved
              </span>
            )}
          </div>

          {profile?.referralCode && <ReferralCard code={profile.referralCode} />}
        </div>
      </PageBody>
    </>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
