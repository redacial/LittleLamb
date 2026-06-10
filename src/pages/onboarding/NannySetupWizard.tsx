import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useNannyProfile, completeWizard } from '../../hooks/useProfile'
import { uploadProfilePhoto, uploadIntroVideo } from '../../lib/storage'
import { cleanText, cleanLine } from '../../lib/sanitize'
import { SELF_BADGES } from '../../lib/badges'
import { WizardShell } from '../../components/onboarding/WizardShell'
import { AvailabilityEditor } from '../../components/onboarding/AvailabilityEditor'
import { Button, Input, Textarea, Avatar, Badge } from '../../components/ui'
import { cn } from '../../lib/cn'
import type { AvailabilityBlock, NannyProfile } from '../../types'

const STEPS = ['Photo & bio', 'Intro video', 'Badges', 'Availability']
const BIO_MAX = 500

export function NannySetupWizard() {
  const { user, profile } = useAuth()
  const uid = user?.uid
  const navigate = useNavigate()
  const { profile: nanny, loading, save } = useNannyProfile(uid)

  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const [photoURL, setPhotoURL] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [yearsExperience, setYearsExperience] = useState('')
  const [videoURL, setVideoURL] = useState<string | null>(null)
  const [selfBadges, setSelfBadges] = useState<string[]>([])
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([])

  useEffect(() => {
    if (!nanny) return
    setPhotoURL(nanny.photoURL ?? null)
    setBio(nanny.bio ?? '')
    setYearsExperience(nanny.yearsExperience ?? '')
    setVideoURL(nanny.introVideoURL ?? null)
    setSelfBadges(nanny.selfBadges ?? [])
    setAvailability(nanny.availability ?? [])
  }, [nanny])

  async function persist(patch: Partial<NannyProfile>) {
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
    await persist({
      photoURL,
      bio: cleanText(bio, BIO_MAX),
      personalStatement: cleanText(bio, BIO_MAX),
      yearsExperience: cleanLine(yearsExperience, 40),
    })
    setStep(1)
  }

  async function nextFromVideo() {
    if (!videoURL) return setError('Please upload a short intro video to continue.')
    setStep(2)
  }

  async function nextFromBadges() {
    await persist({ selfBadges })
    setStep(3)
  }

  async function finish() {
    if (!availability.length) return setError('Please set availability for at least one day.')
    if (!uid) return
    await persist({ availability })
    await completeWizard(uid)
    setDone(true)
  }

  function toggleBadge(id: string) {
    setSelfBadges((b) => (b.includes(id) ? b.filter((x) => x !== id) : [...b, id]))
  }

  if (loading) return <WizardShell steps={STEPS} current={step}><p>Loading…</p></WizardShell>

  if (done) {
    return (
      <WizardShell steps={STEPS} current={STEPS.length - 1}>
        <h1 className="text-display-md">You’re all set — welcome to Little Lamb</h1>
        <p className="mt-3 text-charcoal-muted">Your profile is live for families to discover.</p>
        <Button className="mt-6" onClick={() => navigate('/nanny', { replace: true })}>
          Go to your dashboard
        </Button>
      </WizardShell>
    )
  }

  return (
    <WizardShell steps={STEPS} current={step}>
      {step === 0 && (
        <div className="space-y-5">
          <h1 className="text-display-md">Your photo & bio</h1>
          <div className="flex items-center gap-4">
            <Avatar name={profile?.fullName ?? 'Nanny'} src={photoURL} size="lg" />
            <label className="cursor-pointer text-sm font-bold text-sage-600 hover:underline">
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
          {error && <p role="alert" className="text-sm font-semibold text-terracotta-600">{error}</p>}
          <Button onClick={nextFromBio} loading={busy}>Continue</Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <h1 className="text-display-md">Record a one-minute intro</h1>
          <p className="text-charcoal-muted">
            Say your name, your years of experience, and a little about yourself. Keep it under a
            minute — families love seeing a friendly face before they book.
          </p>
          {videoURL ? (
            <video src={videoURL} controls className="w-full rounded-2xl bg-charcoal/5" />
          ) : (
            <div className="grid place-items-center rounded-2xl border border-dashed border-charcoal/20 bg-white p-10 text-center text-charcoal-muted">
              No video yet
            </div>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-sage-500 px-6 py-2.5 font-semibold text-white hover:bg-sage-600">
            {videoURL ? 'Replace video' : 'Upload video'}
            <input type="file" accept="video/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onVideo(e.target.files[0])} />
          </label>
          {error && <p role="alert" className="text-sm font-semibold text-terracotta-600">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(0)}>Back</Button>
            <Button onClick={nextFromVideo} loading={busy}>Continue</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <h1 className="text-display-md">Select your badges</h1>
          <p className="text-charcoal-muted">
            Pick the traits that describe you. Certifications like CPR and First Aid are verified
            and added by our team after your interview.
          </p>
          <div className="flex flex-wrap gap-2">
            {SELF_BADGES.map((b) => {
              const on = selfBadges.includes(b.id)
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => toggleBadge(b.id)}
                  aria-pressed={on}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition-colors',
                    on
                      ? 'bg-terracotta-50 text-terracotta-700 ring-terracotta-300'
                      : 'bg-white text-charcoal-muted ring-charcoal/15 hover:ring-terracotta-200',
                  )}
                >
                  {b.label}
                </button>
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
          {error && <p role="alert" className="text-sm font-semibold text-terracotta-600">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={nextFromBadges} loading={busy}>Continue</Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <h1 className="text-display-md">Set your weekly availability</h1>
          <p className="text-charcoal-muted">
            Choose the days and hours you’re generally free. You can fine-tune any specific date
            later from your calendar.
          </p>
          <AvailabilityEditor value={availability} onChange={setAvailability} />
          {error && <p role="alert" className="text-sm font-semibold text-terracotta-600">{error}</p>}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={finish} loading={busy}>Finish setup</Button>
          </div>
        </div>
      )}
    </WizardShell>
  )
}
