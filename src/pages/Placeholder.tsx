import { useAuth } from '../context/AuthContext'
import { signOut } from '../lib/auth'
import { Button, Logo, Card, CardLabel } from '../components/ui'

/**
 * Temporary scaffold screen for routes whose full implementation lands in Phase 3/4.
 * Lets the auth + role-routing flow be exercised end-to-end now. Replaced per-route later.
 */
export function Placeholder({ title, note }: { title: string; note?: string }) {
  const { profile } = useAuth()
  return (
    <main className="mx-auto max-w-prose px-6 py-12">
      <div className="flex items-center justify-between">
        <Logo />
        <Button variant="ghost" size="sm" onClick={() => signOut()}>
          Log out
        </Button>
      </div>
      <h1 className="mt-10 text-display-md">{title}</h1>
      {note && <p className="mt-3 text-charcoal-muted">{note}</p>}
      {profile && (
        <Card className="mt-8">
          <CardLabel>Signed in as</CardLabel>
          <p className="font-semibold">{profile.fullName}</p>
          <p className="text-sm text-charcoal-muted">
            {profile.role} · {profile.approved ? 'approved' : 'pending review'} ·{' '}
            {profile.wizardComplete ? 'onboarded' : 'setup incomplete'}
          </p>
        </Card>
      )}
    </main>
  )
}
