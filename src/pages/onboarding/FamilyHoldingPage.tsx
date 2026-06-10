import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { signOut } from '../../lib/auth'
import { Logo, Button, Card } from '../../components/ui'

export function FamilyHoldingPage() {
  const { profile } = useAuth()
  return (
    <main className="min-h-screen bg-cream">
      <header className="flex items-center justify-between px-6 py-4">
        <Logo />
        <Button variant="ghost" size="sm" onClick={() => signOut()}>Log out</Button>
      </header>
      <div className="mx-auto max-w-xl px-6 py-12">
        <p className="eyebrow">Application received</p>
        <h1 className="mt-2 text-display-md">
          Thanks, {profile?.fullName?.split(' ')[0] ?? 'there'} — we’re reviewing your application
        </h1>
        <p className="mt-3 text-charcoal-muted">
          We personally review every family before opening the platform. We’ll email you the moment
          you’re approved, and you’ll pick up right where you leave off.
        </p>
        <Card className="mt-8">
          <h2 className="font-display text-xl">Want a head start?</h2>
          <p className="mt-1 text-sm text-charcoal-muted">
            Complete your profile now so you’re ready to book the moment you’re approved. Your
            progress is saved.
          </p>
          <Link to="/family/setup">
            <Button className="mt-4">Complete your profile</Button>
          </Link>
        </Card>
      </div>
    </main>
  )
}
