import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import {
  useFamilyProfile,
  completeWizard,
  resumeStep,
  childHasContent,
  ratePatch,
} from '../../hooks/useProfile'
import { uploadProfilePhoto } from '../../lib/storage'
import { cleanLine, cleanText } from '../../lib/sanitize'
import { WizardShell } from '../../components/onboarding/WizardShell'
import { PaymentStep } from '../../components/onboarding/PaymentStep'
import { useSpring } from '../../lib/motion'
import { Button, Input, Textarea, Avatar, RateRangeInput, YesNo } from '../../components/ui'
import { formatAge } from '../../lib/format'
import { validateRatePair } from '../../lib/rates'
import type { Child, FamilyProfile } from '../../types'

const STEPS = ['Family profile', 'Contact', 'Payment']

export function FamilySetupWizard() {
  const { user, profile } = useAuth()
  const uid = user?.uid
  const navigate = useNavigate()
  const { profile: family, loading, save } = useFamilyProfile(uid)

  const [step, setStep] = useState(0)
  // The saved step is adopted exactly ONCE, when the profile first arrives. `save()` updates
  // the hook's local profile on every write, so re-running this on each change would fight
  // the user's own navigation (clicking Back would be undone by the next save).
  const [resumed, setResumed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const stepTransition = useSpring('gentle')

  // Local form state, hydrated from any saved progress.
  const [photoURL, setPhotoURL] = useState<string | null>(null)
  const [children, setChildren] = useState<Child[]>([{ name: '', birthday: '', interests: '' }])
  const [hasPets, setHasPets] = useState(false)
  const [petsNote, setPetsNote] = useState('')
  const [allergies, setAllergies] = useState('')
  const [houseRules, setHouseRules] = useState('')
  const [homeAddress, setHomeAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [coParentName, setCoParentName] = useState('')
  const [coParentEmail, setCoParentEmail] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  // Raw dollar strings while typing; parsed to cents on save (see RateRangeInput).
  const [rateMin, setRateMin] = useState('')
  const [rateMax, setRateMax] = useState('')

  useEffect(() => {
    if (!family) return
    setPhotoURL(family.photoURL ?? null)
    if (family.children?.length) setChildren(family.children)
    setHasPets(family.hasPets ?? false)
    setPetsNote(family.petsNote ?? '')
    setAllergies(family.allergies ?? '')
    setHouseRules(family.houseRules ?? '')
    setHomeAddress(family.homeAddress ?? '')
    setPhone(family.phone ?? '')
    setCoParentName(family.coParentName ?? '')
    setCoParentEmail(family.coParentEmail ?? '')
    setEmergencyContactName(family.emergencyContactName ?? '')
    setEmergencyContactPhone(family.emergencyContactPhone ?? '')
    if (family.rateRange) {
      setRateMin(String(family.rateRange.minCents / 100))
      setRateMax(String(family.rateRange.maxCents / 100))
    } else if (family.rateDraft) {
      // A budget she started typing but never completed — hand it back rather than
      // making her remember what she'd entered.
      setRateMin(family.rateDraft.min)
      setRateMax(family.rateDraft.max)
    }
    if (!resumed) {
      setStep(resumeStep(family.wizardStep, STEPS.length))
      setResumed(true)
    }
  }, [family, resumed])

  /**
   * Save a patch. Returns whether it succeeded — it does NOT throw.
   *
   * It used to rethrow, but every caller did a bare `await persist(...)` with no catch, so
   * the rethrow became an unhandled promise rejection: nothing was listening, and the
   * caller advanced the step anyway. Reporting failure in the return value puts the
   * decision where it belongs — a step must not advance over a save that didn't land.
   */
  async function persist(patch: Partial<FamilyProfile>): Promise<boolean> {
    setError(null)
    setBusy(true)
    try {
      await save(patch)
      return true
    } catch {
      setError('We couldn’t save that. Please try again.')
      return false
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

  /**
   * Step back. Moves the UI immediately and records the new position in the background —
   * navigation must never be blocked on a network write, and a failed write here costs at
   * most a resume on the step ahead, which is the pre-existing behaviour anyway.
   */
  function goBack(to: number) {
    setStep(to)
    void persist({ wizardStep: to })
  }

  function updateChild(i: number, patch: Partial<Child>) {
    setChildren((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  }

  async function nextFromStep0() {
    // Keep every row the parent put ANYTHING into. This used to be `.filter(c => c.name)`,
    // which silently destroyed a child whose age and interests were typed before the name —
    // the parent got no warning and the row simply never came back.
    const cleanChildren = children
      .map((c) => ({
        name: cleanLine(c.name, 60),
        birthday: cleanLine(c.birthday ?? '', 10),
        interests: cleanLine(c.interests ?? '', 200),
      }))
      .filter(childHasContent)
    if (!cleanChildren.length) return setError('Please add at least one child.')
    if (cleanChildren.some((c) => !c.name || !c.birthday)) {
      return setError('Please give each child a name and a birthday.')
    }
    if (!homeAddress.trim()) return setError('Please add your home address.')
    const badRate = validateRatePair(rateMin, rateMax)
    if (badRate) {
      // Can't advance on a half-filled budget — but keep what she typed so the correction
      // starts from her numbers. Uses save() directly because persist() clears the error
      // state we're about to set.
      await save(ratePatch(rateMin, rateMax)).catch(() => {})
      return setError(badRate)
    }
    // The budget is OPTIONAL — leaving it blank matches the family with everyone
    // (rangesOverlap treats a missing range permissively). A COMPLETE pair becomes a real
    // rateRange; a half-typed one is kept as a draft rather than discarded (see ratePatch).
    const ok = await persist({
      children: cleanChildren,
      hasPets,
      petsNote: hasPets ? cleanLine(petsNote, 200) : '',
      allergies: cleanText(allergies, 1000),
      houseRules: cleanText(houseRules, 2000),
      homeAddress: cleanLine(homeAddress, 300),
      ...ratePatch(rateMin, rateMax),
      wizardStep: 1,
    })
    if (ok) setStep(1)
  }

  async function nextFromStep1() {
    if (!phone.trim()) return setError('Please add a phone number.')
    const ok = await persist({
      phone: cleanLine(phone, 32),
      primaryEmail: profile?.email ?? '',
      coParentName: cleanLine(coParentName, 80),
      coParentEmail: cleanLine(coParentEmail, 254),
      emergencyContactName: cleanLine(emergencyContactName, 80),
      emergencyContactPhone: cleanLine(emergencyContactPhone, 32),
      wizardStep: 2,
    })
    if (ok) setStep(2)
  }

  // Called by PaymentStep once a card is saved (server-side) or the pre-launch fallback
  // is acknowledged. hasPaymentMethod is written by the savePaymentMethod Cloud Function,
  // not here — the client can no longer set it (see tightened firestore.rules).
  async function finish() {
    if (!uid) return
    setBusy(true)
    try {
      await completeWizard(uid)
      setDone(true)
    } catch {
      setError('We couldn’t finish setup. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <WizardShell steps={STEPS} current={step}><p>Loading…</p></WizardShell>

  if (done) {
    return (
      <WizardShell steps={STEPS} current={STEPS.length - 1}>
        <h1 className="text-display-md">You’re all set — welcome to Little Lamb</h1>
        <p className="mt-3 text-ll-warm-gray">Your family profile is complete.</p>
        <Button className="mt-6" onClick={() => navigate('/family', { replace: true })}>
          Go to your dashboard
        </Button>
      </WizardShell>
    )
  }

  return (
    <WizardShell steps={STEPS} current={step}>
      <AnimatePresence mode="wait">
      {step === 0 && (
        <motion.div
          key="step-0"
          className="space-y-5"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={stepTransition}
        >
          <h1 className="text-display-md">Tell us about your family</h1>
          <div className="flex items-center gap-4">
            <Avatar name={profile?.fullName ?? 'Family'} src={photoURL} size="lg" />
            <label className="cursor-pointer text-sm font-bold text-ll-sage-deep hover:underline">
              {photoURL ? 'Change photo' : 'Add a family photo'}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])}
              />
            </label>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold">Children</p>
            {children.map((c, i) => {
              const age = formatAge(c.birthday ?? '')
              return (
                <div key={i} className="space-y-2 rounded-ll-input border-1.5 border-ll-cream-dark p-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Input placeholder="Name" value={c.name} onChange={(e) => updateChild(i, { name: e.target.value })} />
                    <div>
                      <Input type="date" value={c.birthday ?? ''} onChange={(e) => updateChild(i, { birthday: e.target.value })} />
                      {age && <p className="mt-1 text-xs text-ll-warm-gray">{age} old</p>}
                    </div>
                  </div>
                  <Input placeholder="Interests & anything else (optional)" value={c.interests ?? ''} onChange={(e) => updateChild(i, { interests: e.target.value })} />
                </div>
              )
            })}
            <Button variant="ghost" size="sm" onClick={() => setChildren((cs) => [...cs, { name: '', birthday: '', interests: '' }])}>
              + Add another child
            </Button>
          </div>

          <YesNo label="Any pets?" value={hasPets} onChange={setHasPets} />
          {hasPets && (
            <Input label="Tell us about them" hint="Optional" placeholder="e.g. a friendly golden retriever" value={petsNote} onChange={(e) => setPetsNote(e.target.value)} />
          )}
          <Textarea label="Allergies or special needs" hint="Optional" value={allergies} onChange={(e) => setAllergies(e.target.value)} />
          <Textarea label="House rules & important notes" hint="Optional" value={houseRules} onChange={(e) => setHouseRules(e.target.value)} />
          <Input label="Home address" value={homeAddress} onChange={(e) => setHomeAddress(e.target.value)} />
          <RateRangeInput
            role="family"
            min={rateMin}
            max={rateMax}
            onMinChange={setRateMin}
            onMaxChange={setRateMax}
          />

          {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
          <Button onClick={nextFromStep0} loading={busy}>Continue</Button>
        </motion.div>
      )}

      {step === 1 && (
        <motion.div
          key="step-1"
          className="space-y-5"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={stepTransition}
        >
          <h1 className="text-display-md">How can we reach you?</h1>
          <p className="text-sm font-semibold text-ll-warm-gray">Primary contact</p>
          <Input label="Primary email" value={profile?.email ?? ''} disabled />
          <Input label="Phone number" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Spouse / co-parent name" hint="Optional" value={coParentName} onChange={(e) => setCoParentName(e.target.value)} />
          <Input label="Spouse / co-parent email" hint="Optional" type="email" value={coParentEmail} onChange={(e) => setCoParentEmail(e.target.value)} />
          <p className="pt-2 text-sm font-semibold text-ll-warm-gray">Emergency contact</p>
          <p className="text-sm text-ll-warm-gray">Someone we can reach if we can’t reach you.</p>
          <Input label="Name" hint="Optional" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} />
          <Input label="Phone" hint="Optional" type="tel" value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} />
          {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => goBack(0)}>Back</Button>
            <Button onClick={nextFromStep1} loading={busy}>Continue</Button>
          </div>
        </motion.div>
      )}

      {step === 2 && (
        <motion.div
          key="step-2"
          className="space-y-5"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={stepTransition}
        >
          <h1 className="text-display-md">Add a payment card</h1>
          <p className="text-ll-warm-gray">
            Your card is stored securely with Stripe for quarterly billing — $25 per quarter plus
            $1 per confirmed booking. You won’t be charged today.
          </p>
          <PaymentStep onComplete={finish} saving={busy} />
          {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => goBack(1)}>Back</Button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </WizardShell>
  )
}
