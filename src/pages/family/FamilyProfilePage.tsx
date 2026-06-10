import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useFamilyProfile } from '../../hooks/useProfile'
import { uploadProfilePhoto } from '../../lib/storage'
import { cleanLine, cleanText } from '../../lib/sanitize'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Card, CardLabel, Input, Textarea, Button, Avatar } from '../../components/ui'
import { ReferralCard } from '../../components/ReferralCard'
import type { Child } from '../../types'

/** Family My Profile — editable any time after onboarding (CLAUDE.md §10.1). */
export function FamilyProfilePage() {
  const { user, profile } = useAuth()
  const uid = user?.uid
  const { profile: family, loading, save } = useFamilyProfile(uid)

  const [form, setForm] = useState({
    photoURL: null as string | null,
    neighborhood: '',
    pets: '',
    allergies: '',
    houseRules: '',
    homeAddress: '',
    phone: '',
    coParentName: '',
    coParentEmail: '',
  })
  const [children, setChildren] = useState<Child[]>([])
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!family) return
    setForm({
      photoURL: family.photoURL ?? null,
      neighborhood: family.neighborhood ?? '',
      pets: family.pets ?? '',
      allergies: family.allergies ?? '',
      houseRules: family.houseRules ?? '',
      homeAddress: family.homeAddress ?? '',
      phone: family.phone ?? '',
      coParentName: family.coParentName ?? '',
      coParentEmail: family.coParentEmail ?? '',
    })
    setChildren(family.children ?? [])
  }, [family])

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
    setSaved(false)
  }

  async function onPhoto(file: File) {
    if (!uid) return
    const url = await uploadProfilePhoto(uid, file)
    setForm((f) => ({ ...f, photoURL: url }))
    await save({ photoURL: url })
  }

  async function onSave() {
    setBusy(true)
    try {
      await save({
        neighborhood: cleanLine(form.neighborhood, 120),
        pets: cleanLine(form.pets, 200),
        allergies: cleanText(form.allergies, 1000),
        houseRules: cleanText(form.houseRules, 2000),
        homeAddress: cleanLine(form.homeAddress, 300),
        phone: cleanLine(form.phone, 32),
        coParentName: cleanLine(form.coParentName, 80),
        coParentEmail: cleanLine(form.coParentEmail, 254),
        children: children
          .map((c) => ({ name: cleanLine(c.name, 60), age: cleanLine(c.age, 20), interests: cleanLine(c.interests ?? '', 200) }))
          .filter((c) => c.name),
      })
      setSaved(true)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageBody><p className="text-charcoal-muted">Loading…</p></PageBody>

  return (
    <>
      <PageHeader title="My profile" subtitle="Keep your family details up to date." />
      <PageBody>
        <div className="max-w-2xl space-y-6">
          <Card>
            <div className="flex items-center gap-4">
              <Avatar name={profile?.fullName ?? 'Family'} src={form.photoURL} size="lg" />
              <label className="cursor-pointer text-sm font-bold text-sage-600 hover:underline">
                Change photo
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
              </label>
            </div>
          </Card>

          <Card className="space-y-4">
            <CardLabel>Household</CardLabel>
            <Input label="Neighborhood" value={form.neighborhood} onChange={(e) => set('neighborhood', e.target.value)} />
            <Input label="Home address" value={form.homeAddress} onChange={(e) => set('homeAddress', e.target.value)} />
            <Input label="Pets" value={form.pets} onChange={(e) => set('pets', e.target.value)} />
            <Textarea label="Allergies & special needs" value={form.allergies} onChange={(e) => set('allergies', e.target.value)} />
            <Textarea label="House rules & notes" value={form.houseRules} onChange={(e) => set('houseRules', e.target.value)} />
          </Card>

          <Card className="space-y-3">
            <CardLabel>Children</CardLabel>
            {children.map((c, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_5rem_1.4fr]">
                <Input placeholder="Name" value={c.name} onChange={(e) => setChildren((cs) => cs.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)))} />
                <Input placeholder="Age" value={c.age} onChange={(e) => setChildren((cs) => cs.map((x, idx) => (idx === i ? { ...x, age: e.target.value } : x)))} />
                <Input placeholder="Interests" value={c.interests} onChange={(e) => setChildren((cs) => cs.map((x, idx) => (idx === i ? { ...x, interests: e.target.value } : x)))} />
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setChildren((cs) => [...cs, { name: '', age: '', interests: '' }])}>+ Add a child</Button>
          </Card>

          <Card className="space-y-4">
            <CardLabel>Contact</CardLabel>
            <Input label="Primary email" value={profile?.email ?? ''} disabled />
            <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            <Input label="Spouse / co-parent name" value={form.coParentName} onChange={(e) => set('coParentName', e.target.value)} />
            <Input label="Spouse / co-parent email" value={form.coParentEmail} onChange={(e) => set('coParentEmail', e.target.value)} />
          </Card>

          <div className="flex items-center gap-3">
            <Button onClick={onSave} loading={busy}>Save changes</Button>
            {saved && <span className="text-sm font-semibold text-sage-600">Saved ✓</span>}
          </div>

          {profile?.referralCode && <ReferralCard code={profile.referralCode} />}
        </div>
      </PageBody>
    </>
  )
}
