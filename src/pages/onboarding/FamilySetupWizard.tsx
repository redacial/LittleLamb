import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useFamilyProfile, completeWizard } from '../../hooks/useProfile'
import { uploadProfilePhoto } from '../../lib/storage'
import { cleanLine, cleanText } from '../../lib/sanitize'
import { WizardShell } from '../../components/onboarding/WizardShell'
import { Button, Input, Textarea, Avatar } from '../../components/ui'
import type { Child, FamilyProfile } from '../../types'

const STEPS = ['Family profile', 'Contact', 'Payment']

export function FamilySetupWizard() {
  const { user, profile } = useAuth()
  const uid = user?.uid
  const navigate = useNavigate()
  const { profile: family, loading, save } = useFamilyProfile(uid)

  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  // Local form state, hydrated from any saved progress.
  const [photoURL, setPhotoURL] = useState<string | null>(null)
  const [neighborhood, setNeighborhood] = useState('')
  const [children, setChildren] = useState<Child[]>([{ name: '', age: '', interests: '' }])
  const [pets, setPets] = useState('')
  const [allergies, setAllergies] = useState('')
  const [houseRules, setHouseRules] = useState('')
  const [homeAddress, setHomeAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [coParentName, setCoParentName] = useState('')
  const [coParentEmail, setCoParentEmail] = useState('')
  const [hasPaymentMethod, setHasPaymentMethod] = useState(false)

  useEffect(() => {
    if (!family) return
    setPhotoURL(family.photoURL ?? null)
    setNeighborhood(family.neighborhood ?? '')
    if (family.children?.length) setChildren(family.children)
    setPets(family.pets ?? '')
    setAllergies(family.allergies ?? '')
    setHouseRules(family.houseRules ?? '')
    setHomeAddress(family.homeAddress ?? '')
    setPhone(family.phone ?? '')
    setCoParentName(family.coParentName ?? '')
    setCoParentEmail(family.coParentEmail ?? '')
    setHasPaymentMethod(family.hasPaymentMethod ?? false)
  }, [family])

  async function persist(patch: Partial<FamilyProfile>) {
    setError(null)
    setBusy(true)
    try {
      await save(patch)
    } catch {
      setError('We couldn’t save that. Please try again.')
      throw new Error('save failed')
    } finally {
      setBusy(false)
    }
  }

  async function onPhoto(file: File) {
    if (!uid) return
    setError(null)
    setBusy(true)
    try {
      const url = await uploadProfilePhoto(uid, file)
      setPhotoURL(url)
      await save({ photoURL: url })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  function updateChild(i: number, patch: Partial<Child>) {
    setChildren((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }

  async function nextFromStep0() {
    const cleanChildren = children
      .map((c) => ({
        name: cleanLine(c.name, 60),
        age: cleanLine(c.age, 20),
        interests: cleanLine(c.interests ?? '', 200),
      }))
      .filter((c) => c.name)
    if (!neighborhood.trim()) return setError('Please add your neighborhood.')
    if (!cleanChildren.length) return setError('Please add at least one child.')
    if (!homeAddress.trim()) return setError('Please add your home address.')
    await persist({
      neighborhood: cleanLine(neighborhood, 120),
      children: cleanChildren,
      pets: cleanLine(pets, 200),
      allergies: cleanText(allergies, 1000),
      houseRules: cleanText(houseRules, 2000),
      homeAddress: cleanLine(homeAddress, 300),
    })
    setStep(1)
  }

  async function nextFromStep1() {
    if (!phone.trim()) return setError('Please add a phone number.')
    await persist({
      phone: cleanLine(phone, 32),
      primaryEmail: profile?.email ?? '',
      coParentName: cleanLine(coParentName, 80),
      coParentEmail: cleanLine(coParentEmail, 254),
    })
    setStep(2)
  }

  async function finish() {
    if (!hasPaymentMethod) return setError('Please add a payment card to continue.')
    if (!uid) return
    await persist({ hasPaymentMethod: true })
    await completeWizard(uid)
    setDone(true)
  }

  if (loading) return <WizardShell steps={STEPS} current={step}><p>Loading…</p></WizardShell>

  if (done) {
    return (
      <WizardShell steps={STEPS} current={STEPS.length - 1}>
        <h1 className="text-display-md">You’re all set — welcome to Little Lamb</h1>
        <p className="mt-3 text-charcoal-muted">Your family profile is complete.</p>
        <Button className="mt-6" onClick={() => navigate('/family', { replace: true })}>
          Go to your dashboard
        </Button>
      </WizardShell>
    )
  }

  return (
    <WizardShell steps={STEPS} current={step}>
      {step === 0 && (
        <div className="space-y-5">
          <h1 className="text-display-md">Tell us about your family</h1>
          <div className="flex items-center gap-4">
            <Avatar name={profile?.fullName ?? 'Family'} src={photoURL} size="lg" />
            <label className="cursor-pointer text-sm font-bold text-sage-600 hover:underline">
              {photoURL ? 'Change photo' : 'Add a family photo'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
              />
            </label>
          </div>
          <Input label="Neighborhood in Santa Barbara" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />

          <div className="space-y-3">
            <p className="text-sm font-semibold">Children</p>
            {children.map((c, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_5rem_1.4fr]">
                <Input placeholder="Name" value={c.name} onChange={(e) => updateChild(i, { name: e.target.value })} />
                <Input placeholder="Age" value={c.age} onChange={(e) => updateChild(i, { age: e.target.value })} />
                <Input placeholder="Interests" value={c.interests} onChange={(e) => updateChild(i, { interests: e.target.value })} />
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setChildren((cs) => [...cs, { name: '', age: '', interests: '' }])}>
              + Add another child
            </Button>
          </div>

          <Input label="Pets" hint="Optional" value={pets} onChange={(e) => setPets(e.target.value)} />
          <Textarea label="Allergies or special needs" hint="Optional" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
          <Textarea label="House rules & important notes" hint="Optional" value={houseRules} onChange={(e) => setHouseRules(e.target.value)} />
          <Input label="Home address" value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} />

          {error && <p role="alert" className="text-sm font-semibold text-terracotta-600">{error}</p>}
          <Button onClick={nextFromStep0} loading={busy}>Continue</Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <h1 className="text-display-md">How can we reach you?</h1>
          <Input label="Primary email" value={profile?.email ?? ''} disabled />
          <Input label="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Spouse / co-parent name" hint="Optional" value={coParentName} onChange={(e) => setCoParentName(e.target.value)} />
          <Input label="Spouse / co-parent email" hint="Optional" type="email" value={coParentEmail} onChange={(e) => setCoParentEmail(e.target.value)} />
          {error && <p role="alert" className="text-sm font-semibold text-terracotta-600">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(0)}>Back</Button>
            <Button onClick={nextFromStep1} loading={busy}>Continue</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <h1 className="text-display-md">Add a payment card</h1>
          <p className="text-charcoal-muted">
            Your card is stored securely for quarterly billing — $25 per quarter plus $1 per
            confirmed booking. You won’t be charged today.
          </p>
          <div className="rounded-2xl border border-dashed border-charcoal/20 bg-white p-5">
            {/* Stubbed card capture — no real card data leaves the browser (see DECISIONS D7d). */}
            <Input label="Name on card" placeholder="Jane Appleseed" />
            <div className="mt-3 grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
              <Input label="Card number" placeholder="4242 4242 4242 4242" inputMode="numeric" />
              <Input label="Expiry" placeholder="MM/YY" />
              <Input label="CVC" placeholder="123" inputMode="numeric" />
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hasPaymentMethod} onChange={(e) => setHasPaymentMethod(e.target.checked)} className="h-4 w-4 rounded accent-sage-500" />
              Save this card for quarterly billing
            </label>
          </div>
          {error && <p role="alert" className="text-sm font-semibold text-terracotta-600">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={finish} loading={busy}>Finish setup</Button>
          </div>
        </div>
      )}
    </WizardShell>
  )
}
