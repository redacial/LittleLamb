import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { signOut } from '../../lib/auth'
import { Logo, Button, Card } from '../../components/ui'
import { cn } from '../../lib/cn'
import type { NannyStage } from '../../types'

const STAGES: { key: NannyStage; label: string }[] = [
  { key: 'application_received', label: 'Application received' },
  { key: 'under_review', label: 'Under review' },
  { key: 'interview_scheduled', label: 'Interview scheduled' },
  { key: 'decision_made', label: 'Decision made' },
]

// Configured in admin Settings (Calendly is a documented open item). Placeholder until set.
const CALENDLY_URL = 'https://calendly.com/littlelamb/interview'

export function NannyHoldingPage() {
  const { profile } = useAuth()
  const stage = profile?.stage ?? 'application_received'
  const currentIndex = STAGES.findIndex((s) => s.key === stage)

  return (
    <main className="min-h-screen bg-cream">
      <header className="flex items-center justify-between px-6 py-4">
        <Logo />
        <Button variant="ghost" size="sm" onClick={() => signOut()}>Log out</Button>
      </header>
      <div className="mx-auto max-w-xl px-6 py-12">
        <p className="eyebrow">Your application</p>
        <h1 className="mt-2 text-display-md">
          We’ve got your application, {profile?.fullName?.split(' ')[0] ?? 'there'}
        </h1>
        <p className="mt-3 text-charcoal-muted">
          Here’s where you are in our review. We’ll email you at each step.
        </p>

        <Card className="mt-8">
          <ol className="space-y-4">
            {STAGES.map((s, i) => {
              const done = i < currentIndex
              const active = i === currentIndex
              return (
                <li key={s.key} className="flex items-center gap-3">
                  <span
                    className={cn(
                      'grid h-7 w-7 place-items-center rounded-full text-xs font-bold ring-1',
                      done && 'bg-sage-500 text-white ring-sage-500',
                      active && 'bg-white text-sage-700 ring-sage-500',
                      !done && !active && 'bg-cream-200 text-charcoal-faint ring-charcoal/10',
                    )}
                  >
                    {done ? '✓' : i + 1}
                  </span>
                  <span className={cn('font-semibold', active ? 'text-charcoal' : 'text-charcoal-muted')}>
                    {s.label}
                  </span>
                </li>
              )
            })}
          </ol>

          {stage === 'interview_scheduled' && (
            <a href={CALENDLY_URL} target="_blank" rel="noreferrer">
              <Button className="mt-5">Book your interview slot</Button>
            </a>
          )}
        </Card>

        <Card className="mt-6">
          <h2 className="font-display text-xl">Get a head start</h2>
          <p className="mt-1 text-sm text-charcoal-muted">
            Build your profile now — photo, bio, video, and availability — so you’re live the
            instant you’re approved. Progress is saved.
          </p>
          <Link to="/nanny/setup">
            <Button className="mt-4">Complete your profile</Button>
          </Link>
        </Card>
      </div>
    </main>
  )
}
