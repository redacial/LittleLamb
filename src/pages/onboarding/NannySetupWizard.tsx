import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useNannyProfile, completeWizard, resumeStep, ratePatch } from '../../hooks/useProfile'
import { uploadProfilePhoto, uploadIntroVideo } from '../../lib/storage'
import { cleanText, cleanLine } from '../../lib/sanitize'
import { SELF_BADGES } from '../../lib/badges'
import { WizardShell } from '../../components/onboarding/WizardShell'
import { AvailabilityEditor } from '../../components/onboarding/AvailabilityEditor'
import { useSpring, useChipHover } from '../../lib/motion'
import { Button, Input, Textarea, Avatar, Badge, RateRangeInput } from '../../components/ui'
import { validateRatePair } from '../../lib/rates'
import { cn } from '../../lib/cn'
import type { AvailabilityBlock, NannyProfile } from '../../types'

// 'Your rate' is appended LAST so the existing step indices (0-3) are untouched — the
// steps are hardcoded integers throughout, and renumbering them is where bugs hide.
const STEPS = ['Photo & bio', 'Intro video', 'Badges', 'Availability', 'Your rate']
const BIO_MAX = 500

export function NannySetupWizard() {
  const { user, profile } = useAuth()
  const uid = user?.uid
  const navigate = useNavigate()
  const { profile: nanny, loading, save } = useNannyProfile(uid)

  const [step, setStep] = useState(0)
  // Adopted exactly ONCE, on first hydration — see the matching note in FamilySetupWizard.
  const [resumed, setResumed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const stepTransition = useSpring('gentle')
  const chipHover = useChipHover()

  const [photoURL, setPhotoURL] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [videoURL, setVideoURL] = useState<string | null>(null)
  const [selfBadges, setSelfBadges] = useState<string[]>([])
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([])
  // Raw dollar strings while typing; parsed to cents on save (see RateRangeInput).
  const [rateMin, setRateMin] = useState('')
  const [rateMax, setRateMax] = useState('')

  useEffect(() => {
    if (!nanny) return
    setPhotoURL(nanny.photoURL ?? null)
    setBio(nanny.bio ?? '')
    setYearsExperience(nanny.yearsExperience ?? '')
    setVideoURL(nanny.introVideoURL ?? null)
    setSelfBadges(nanny.selfBadges ?? [])
    setAvailability(nanny.availability ?? [])
    if (nanny.rateRange) {
      setRateMin(String(nanny.rateRange.minCents / 100))
      setRateMax(String(nanny.rateRange.maxCents / 100))
    } else if (nanny.rateDraft) {
      // A rate she started typing but never completed — hand it back rather than
      // making her remember what she'd entered.
      setRateMin(nanny.rateDraft.min)
      setRateMax(nanny.rateDraft.max)
    }
    if (!resumed) {
      setStep(resumeStep(nanny.wizardStep, STEPS.length))
      setResumed(true)
    }
  }, [nanny, resumed])

  /**
   * Save a patch. Returns whether it succeeded — it does NOT throw. The old rethrow landed
   * in bare `await persist(...)` callers with no catch, becoming an unhandled rejection
   * while the step advanced anyway. See the fuller note in FamilySetupWizard.
   */
  async function persist(patch: Partial<NannyProfile>): Promise<boolean> {
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

  /** Step back, recording the position in the background. See FamilySetupWizard.goBack. */
  function goBack(to: number) {
    setStep(to)
    void persist({ wizardStep: to })
  }

  async function onPhoto(file: File) {
    if (!uid) return
    setBusy(true)
    setError(null)
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

  async function onVideo(file: File) {
    if (!uid) return
    setBusy(true)
    setError(null)
    try {
      const url = await uploadIntroVideo(uid, file)
      setVideoURL(url)
      await save({ introVideoURL: url })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setBusy(false)
    }
  }

  async function nextFromBio() {
    if (!photoURL) return setError('Please add a profile photo.')
    if (bio.trim().length < 20) return setError('Please write at least a short bio.')
    const ok = await persist({
      fullName: profile?.fullName ?? '',
      photoURL,
      bio: cleanText(bio, BIO_MAX),
      personalStatement: cleanText(bio, BIO_MAX),
      yearsExperience: cleanLine(yearsExperience, 40),
      wizardStep: 1,
    })
    if (ok) setStep(1)
  }

  async function nextFromVideo() {
    if (!videoURL) return setError('Please upload a short intro video to continue.')
    // The URL itself was already saved by onVideo; this records only the position.
    void persist({ wizardStep: 2 })
    setStep(2)
  }

  async function nextFromBadges() {
    const ok = await persist({ selfBadges, wizardStep: 3 })
    if (ok) setStep(3)
  }

  async function nextFromAvailability() {
    if (!availability.length) return setError('Please set availability for at least one day.')
    const ok = await persist({ availability, wizardStep: 4 })
    if (ok) setStep(4)
  }

  async function finish() {
    if (!uid) return
    const invalid = validateRatePair(rateMin, rateMax)
    if (invalid) {
      // She can't FINISH on a half-filled range — but what she typed is still hers. Save the
      // draft before refusing, so the correction starts from her numbers instead of blank
      // fields. Without this the validation gate itself becomes the thing that loses the data.
      // Saved via save() directly, not persist(), because persist() clears the error state
      // we are about to set.
      await save(ratePatch(rateMin, rateMax)).catch(() => {})
      return setError(invalid)
    }
    // The range is OPTIONAL — skipping it leaves the nanny matchable with everyone
    // (rangesOverlap treats a missing range permissively). A COMPLETE pair is written as a
    // real rateRange; a half-typed one is preserved as a draft instead of being dropped.
    // This is the LAST step, so anything discarded here is never seen again.
    const ok = await persist({ ...ratePatch(rateMin, rateMax), wizardStep: 4 })
    if (!ok) return
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

  function toggleBadge(id: string) {
    setSelfBadges((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id]))
  }

  if (loading) return <WizardShell steps={STEPS} current={step}><p>Loading…</p></WizardShell>

  if (done) {
    return (
      <WizardShell steps={STEPS} current={STEPS.length - 1}>
        <h1 className="text-display-md">You’re all set — welcome to Little Lamb</h1>
        <p className="mt-3 text-ll-warm-gray">Your profile is live for families to discover.</p>
        <Button className="mt-6" onClick={() => navigate('/nanny', { replace: true })}>
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
          <h1 className="text-display-md">Your photo & bio</h1>
          <div className="flex items-center gap-4">
            <Avatar name={profile?.fullName ?? 'Nanny'} src={photoURL} size="lg" />
            <label className="cursor-pointer text-sm font-bold text-ll-sage-deep hover:underline">
              {photoURL ? 'Change photo' : 'Add a profile photo'}
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
            </label>
          </div>
          <Input
            label="Years of childcare experience"
            placeholder="e.g. 5"
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
          />
          <Textarea
            label="Bio"
            hint={`${bio.length}/${BIO_MAX} — share your experience and approach to childcare`}
            maxLength={BIO_MAX}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
          <Button onClick={nextFromBio} loading={busy}>Continue</Button>
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
          <h1 className="text-display-md">Record a one-minute intro</h1>
          <p className="text-ll-warm-gray">
            Say your name, your years of experience, and a little about yourself. Keep it under a
            minute — families love seeing a friendly face before they book.
          </p>
          {videoURL ? (
            <video src={videoURL} controls className="w-full rounded-ll-card bg-ll-ink/5" />
          ) : (
            <div className="grid place-items-center rounded-ll-card border-1.5 border-dashed border-ll-warm-gray bg-white p-10 text-center text-ll-warm-gray">
              No video yet
            </div>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ll-sage px-6 py-2.5 font-semibold text-ll-sage-deep hover:bg-ll-sage-mid hover:text-white">
            {videoURL ? 'Replace video' : 'Upload video'}
            <input type="file" accept="video/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onVideo(e.target.files[0])} />
          </label>
          {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => goBack(0)}>Back</Button>
            <Button onClick={nextFromVideo} loading={busy}>Continue</Button>
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
          <h1 className="text-display-md">Select your badges</h1>
          <p className="text-ll-warm-gray">
            Pick the traits that describe you. Certifications like CPR and First Aid are verified
            and added by our team after your interview.
          </p>
          <div className="flex flex-wrap gap-2">
            {SELF_BADGES.map((b) => {
              const on = selfBadges.includes(b.id)
              return (
                <motion.button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBadge(b.id)}
                  aria-pressed={on}
                  {...chipHover}
                  className={cn(
                    'rounded-full px-3 py-1.5 font-mono text-mono-sm font-medium border-1.5 transition-colors',
                    on
                      ? 'bg-ll-sage-light text-ll-sage-deep border-ll-sage'
                      : 'bg-white text-ll-warm-gray border-ll-cream-dark hover:border-ll-sage',
                  )}
                >
                  {b.label}
                </motion.button>
              )
            })}
          </div>
          <div>
            <p className="eyebrow mb-2">Verified by Little Lamb after your interview</p>
            <div className="flex flex-wrap gap-2 opacity-70">
              <Badge label="CPR Certified" type="verified" />
              <Badge label="First Aid Certified" type="verified" />
              <Badge label="Background Checked" type="verified" />
            </div>
          </div>
          {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => goBack(1)}>Back</Button>
            <Button onClick={nextFromBadges} loading={busy}>Continue</Button>
          </div>
        </motion.div>
      )}

      {step === 3 && (
        <motion.div
          key="step-3"
          className="space-y-5"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={stepTransition}
        >
          <h1 className="text-display-md">Set your weekly availability</h1>
          <p className="text-ll-warm-gray">
            Choose the days and hours you’re generally free. You can fine-tune any specific date
            later from your calendar.
          </p>
          <AvailabilityEditor value={availability} onChange={setAvailability} />
          {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => goBack(2)}>Back</Button>
            <Button onClick={nextFromAvailability} loading={busy}>Continue</Button>
          </div>
        </motion.div>
      )}

      {step === 4 && (
        <motion.div
          key="step-4"
          className="space-y-5"
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={stepTransition}
        >
          <h1 className="text-display-md">What do you charge?</h1>
          <p className="text-ll-warm-gray">
            Families pay you directly — this just helps us match you with families whose budget
            fits yours. You can change it any time, or skip it for now.
          </p>
          <RateRangeInput
            role="nanny"
            min={rateMin}
            max={rateMax}
            onMinChange={setRateMin}
            onMaxChange={setRateMax}
          />
          {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => goBack(3)}>Back</Button>
            <Button onClick={finish} loading={busy}>Finish setup</Button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </WizardShell>
  )
}
