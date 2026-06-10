import { Logo, Button, Badge, Card, CardLabel } from './components/ui'

// Phase 1 placeholder. Replaced by full role-based routing in Phase 2.
export function App() {
  return (
    <main className="mx-auto max-w-prose px-6 py-16">
      <Logo />
      <h1 className="mt-10 text-display-lg">Foundation ready</h1>
      <p className="mt-3 max-w-prose text-lg text-charcoal-muted">
        Design system, Firebase wiring, and locked-down security rules are in place. Auth and the
        app come next.
      </p>
      <Card className="mt-8">
        <CardLabel>Design tokens</CardLabel>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge label="CPR Certified" type="verified" />
          <Badge label="Pet-Friendly" type="self" />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button>Get started</Button>
          <Button variant="secondary">For nannies</Button>
        </div>
      </Card>
    </main>
  )
}
