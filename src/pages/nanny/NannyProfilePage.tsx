import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useNannyProfile } from '../../hooks/useProfile'
import { uploadProfilePhoto, uploadIntroVideo } from '../../lib/storage'
import { cleanText } from '../../lib/sanitize'
import { SELF_BADGES, badgeLabel } from '../../lib/badges'
import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { AvailabilityEditor } from '../../components/onboarding/AvailabilityEditor'
import { Card, CardLabel, Textarea, Button, Avatar, Badge } from '../../components/ui'
import { cn } from '../../lib/cn'
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
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!nanny) return
    setPhotoURL(nanny.photoURL ?? null)
    setBio(nanny.bio ?? '')
    setVideoURL(nanny.introVideoURL ?? null)
    setSelfBadges(nanny.selfBadges ?? [])
    setAvailability(nanny.availability ?? [])
  }, [nanny])

  // Profile completeness — quiet nudge (My Profile only, never the dashboard) per spec.
  const checks = [
    { label: 'Photo', done: !!photoURL },
    { label: 'Bio', done: bio.trim().length >= 20 },
    { label: 'Intro video', done: !!videoURL },
    { label: 'Badges', done: selfBadges.length > 0 },
    { label: 'Availability', done: availability.length > 0 },
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
    setBusy(true)
    try {
      await save({ bio: cleanText(bio, BIO_MAX), selfBadges, availability })
      setSaved(true)
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageBody><p className="text-charcoal-muted">Loading…</p></PageBody>

  return (
    <>
      <PageHeader title="My profile" subtitle="This is what families see when they discover you." />
      <PageBody>
        <div className="max-w-2xl space-y-6">
          <Card>
            <CardLabel>Profile completeness</CardLabel>
            <div className="mt-2 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-200">
                <div className="h-full rounded-full bg-sage-500 transition-all" style={{ width: `${(complete / checks.length) * 100}%` }} />
              </div>
              <span className="text-sm font-semibold">{complete}/{checks.length}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {checks.map((c) => (
                <span key={c.label} className={c.done ? 'text-sage-600' : 'text-charcoal-faint'}>
                  {c.done ? '✓' : '○'} {c.label}
                </span>
              ))}
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <Avatar name={profile?.fullName ?? 'Nanny'} src={photoURL} size="lg" />
              <label className="cursor-pointer text-sm font-bold text-sage-600 hover:underline">
                Change photo
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && onPhoto(e.target.files[0])} />
              </label>
            </div>
            {videoURL && <video src={videoURL} controls className="mt-4 w-full rounded-xl bg-charcoal/5" />}
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-sage-600 hover:underline">
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
                  <button
                    key={b.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => { setSelfBadges((s) => (on ? s.filter((x) => x !== b.id) : [...s, b.id])); setSaved(false) }}
                    className={cn(
                      'rounded-full px-3 py-1.5 text-sm font-semibold ring-1 transition-colors',
                      on ? 'bg-terracotta-50 text-terracotta-700 ring-terracotta-300' : 'bg-white text-charcoal-muted ring-charcoal/15',
                    )}
                  >
                    {b.label}
                  </button>
                )
              })}
            </div>
            <CardLabel className="mt-4">Verified by Little Lamb</CardLabel>
            <div className="mt-2 flex flex-wrap gap-2">
              {(nanny?.verifiedBadges ?? []).length === 0 ? (
                <p className="text-sm text-charcoal-muted">Assigned by our team after your interview.</p>
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

          <div className="flex items-center gap-3">
            <Button onClick={onSave} loading={busy}>Save changes</Button>
            {saved && <span className="text-sm font-semibold text-sage-600">Saved ✓</span>}
          </div>
        </div>
      </PageBody>
    </>
  )
}
