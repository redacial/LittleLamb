import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useNannyProfile } from '../../hooks/useProfile'
import { uploadProfilePhoto, uploadIntroVideo } from '../../lib/storage'
import { cleanText } from '../../lib/sanitize'
import { SELF_BADGES, badgeLabel } from '../../lib/badges'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { AvailabilityEditor } from '../../components/onboarding/AvailabilityEditor'
import { Card, CardLabel, Textarea, Button, Avatar, Badge, RateRangeInput } from '../../components/ui'
import { parseRateDollars, validateRatePair } from '../../lib/rates'
import { ReferralCard } from '../../components/ReferralCard'
import { cn } from '../../lib/cn'
import { useChipHover } from '../../lib/motion'
import type { AvailabilityBlock } from '../../types'

const BIO_MAX = 500

/** Nanny My Profile — editable. Verified badges shown read-only. Completeness indicator. */
export function NannyOwnProfilePage() {
  const { user, profile } = useAuth()
  const uid = user?.uid
  const { profile: nanny, loading, save } = useNannyProfile(uid)

  const [photoURL, setPhotoURL] = useState<string | null>(null)
  const [bio, setBio] = useState('')
  const [videoURL, setVideoURL] = useState<string | null>(null)
  const [selfBadges, setSelfBadges] = useState<string[]>([])
  const [availability, setAvailability] = useState<AvailabilityBlock[]>([])
  const [rateMin, setRateMin] = useState('')
  const [rateMax, setRateMax] = useState('')
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const chipHover = useChipHover()

  useEffect(() => {
    if (!nanny) return
    setPhotoURL(nanny.photoURL ?? null)
    setBio(nanny.bio ?? '')
    setVideoURL(nanny.introVideoURL ?? null)
    setSelfBadges(nanny.selfBadges ?? [])
    setAvailability(nanny.availability ?? [])
    if (nanny.rateRange) {
      setRateMin(String(nanny.rateRange.minCents / 100))
      setRateMax(String(nanny.rateRange.maxCents / 100))
    }
  }, [nanny])

  // Profile completeness — quiet nudge (My Profile only, never the dashboard) per spec.
  const checks = [
    { label: 'Photo', done: !!photoURL },
    { label: 'Bio', done: bio.trim().length >= 20 },
    { label: 'Intro video', done: !!videoURL },
    { label: 'Badges', done: selfBadges.length > 0 },
    { label: 'Availability', done: availability.length > 0 },
    { label: 'Rate', done: !!nanny?.rateRange },
  ]
  const complete = checks.filter((c) => c.done).length

  async function onPhoto(file: File) {
    if (!uid) return
    const url = await uploadProfilePhoto(uid, file)
    setPhotoURL(url)
    await save({ photoURL: url })
  }
  async function onVideo(file: File) {
    if (!uid) return
    const url = await uploadIntroVideo(uid, file)
    setVideoURL(url)
    await save({ introVideoURL: url })
  }

  async function onSave() {
    const badRate = validateRatePair(rateMin, rateMax)
    if (badRate) return setError(badRate)
    setError(null)
    const lo = parseRateDollars(rateMin)
    const hi = parseRateDollars(rateMax)
    setBusy(true)
    try {
      await save({
        bio: cleanText(bio, BIO_MAX),
        selfBadges,
        availability,
        // Only write when both bounds parse — a cleared range is left untouched rather
        // than half-written (removing a rate entirely is not yet a supported action).
        ...(lo !== null && hi !== null ? { rateRange: { minCents: lo, maxCents: hi } } : {}),
      })
      setSaved(true)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageBody><p className="text-ll-warm-gray">Loading…</p></PageBody>

  return (
    <>
      <PageHeader title="My profile" subtitle="This is what families see when they discover you." />
      <PageBody>
        <div className="max-w-2xl space-y-6">
          <Card interactive tone="peri">
            <CardLabel>Profile completeness</CardLabel>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-ll-cream-dark">
                <div
                  className="h-full rounded-full bg-ll-sage transition-all"
                  style={{ width: `${(complete / checks.length) * 100}%` }}
                />
              </div>
              <span className="font-mono text-mono-sm font-medium text-ll-peri-ink">
                {complete}/{checks.length}
              </span>
            </div>
            <ul className="mt-3 flex flex-wrap gap-2">
              {checks.map((c) => (
                <li
                  key={c.label}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border-1.5 px-2.5 py-1 font-mono text-mono-sm font-medium',
                    c.done
                      ? 'border-ll-peri bg-ll-peri-light text-ll-peri-ink'
                      : 'border-ll-cream-dark bg-white text-ll-warm-gray',
                  )}
                >
                  {c.done ? <CheckMark /> : <EmptyMark />}
                  {c.label}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <Avatar name={profile?.fullName ?? 'Nanny'} src={photoURL} size="lg" />
              <label className="cursor-pointer text-sm font-bold text-ll-sage-deep hover:underline">
                Change photo
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
              </label>
            </div>
            {videoURL && <video src={videoURL} controls className="mt-4 w-full rounded-ll-input bg-ll-cream-dark" />}
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-ll-sage-deep hover:underline">
              {videoURL ? 'Replace intro video' : 'Add intro video'}
              <input type="file" accept="video/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onVideo(e.target.files[0])} />
            </label>
          </Card>

          <Card>
            <Textarea label="Bio" maxLength={BIO_MAX} hint={`${bio.length}/${BIO_MAX}`} value={bio} onChange={(e) => { setBio(e.target.value); setSaved(false) }} />
          </Card>

          <Card>
            <CardLabel>Self-reported badges</CardLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {SELF_BADGES.map((b) => {
                const on = selfBadges.includes(b.id)
                return (
                  <motion.button
                    key={b.id}
                    type="button"
                    aria-pressed={on}
                    {...chipHover}
                    onClick={() => { setSelfBadges((s) => (on ? s.filter((x) => x !== b.id) : [...s, b.id])); setSaved(false) }}
                    className={cn(
                      'rounded-full border-1.5 px-3 py-1.5 font-mono text-mono-sm font-medium transition-colors',
                      on ? 'bg-ll-sage-light text-ll-sage-deep border-ll-sage' : 'bg-white text-ll-warm-gray border-ll-cream-dark',
                    )}
                  >
                    {b.label}
                  </motion.button>
                )
              })}
            </div>
            <CardLabel className="mt-4">Verified by Little Lamb</CardLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {(nanny?.verifiedBadges ?? []).length === 0 ? (
                <p className="text-sm text-ll-warm-gray">Assigned by our team after your interview.</p>
              ) : (
                nanny!.verifiedBadges.map((b) => <Badge key={b} label={badgeLabel(b)} type="verified" size="sm" />)
              )}
            </div>
          </Card>

          <Card>
            <CardLabel>Weekly availability</CardLabel>
            <div className="mt-3">
              <AvailabilityEditor value={availability} onChange={(v) => { setAvailability(v); setSaved(false) }} />
            </div>
          </Card>

          <Card>
            <CardLabel>Your rate</CardLabel>
            <div className="mt-3">
              <RateRangeInput
                role="nanny"
                min={rateMin}
                max={rateMax}
                onMinChange={(v) => { setRateMin(v); setSaved(false) }}
                onMaxChange={(v) => { setRateMax(v); setSaved(false) }}
              />
            </div>
          </Card>

          {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}

          <div className="flex items-center gap-3">
            <Button onClick={onSave} loading={busy}>Save changes</Button>
            {saved && (
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-ll-sage-deep">
                <CheckMark />
                Saved
              </span>
            )}
          </div>

          {profile?.referralCode && <ReferralCard code={profile.referralCode} />}
        </div>
      </PageBody>
    </>
  )
}

function CheckMark() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
      <path d="M3 8.5 6.5 12 13 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EmptyMark() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="8" cy="8" r="5" />
    </svg>
  )
}
