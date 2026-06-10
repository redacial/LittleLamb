import { PageHeader, PageBody } from '../../components/layout/AppLayout'
import { Tabs } from '../../components/Tabs'
import { Card, CardLabel, Input, Textarea, Button } from '../../components/ui'
import { SELF_BADGES, VERIFIED_BADGES } from '../../lib/badges'
import { Badge } from '../../components/ui'

/** Admin Settings — platform configuration (CLAUDE.md §10/Part 18). Editors for the config
 * collection. Values shown are the live defaults; persistence wires to config/{doc} (admin-only). */
export function AdminSettingsPage() {
  return (
    <>
      <PageHeader title="Settings" subtitle="Configure how the platform behaves." />
      <PageBody>
        <Tabs tabs={['Account', 'Email templates', 'Badges', 'Policies', 'Billing', 'Calendly']}>
          {(active) => {
            if (active === 'Account')
              return (
                <Card className="max-w-lg space-y-4">
                  <CardLabel>Account</CardLabel>
                  <Input label="Display name" defaultValue="Admin" />
                  <Input label="New password" type="password" autoComplete="new-password" />
                  <Button>Save</Button>
                </Card>
              )
            if (active === 'Email templates')
              return (
                <Card className="max-w-2xl space-y-3">
                  <CardLabel>Automated emails</CardLabel>
                  <p className="text-sm text-charcoal-muted">Edit the copy for any automated email without a developer.</p>
                  <Input label="Subject — Application approved" defaultValue="Welcome to Little Lamb — you’re approved!" />
                  <Textarea label="Body" defaultValue="Hi {{name}}, your account is now live. Log in to finish your profile and start booking." />
                  <Button>Save template</Button>
                </Card>
              )
            if (active === 'Badges')
              return (
                <Card className="max-w-2xl space-y-3">
                  <CardLabel>Badge master list</CardLabel>
                  <p className="text-sm text-charcoal-muted">Self-reported (terracotta) and admin-verified (sage). Changes reflect everywhere.</p>
                  <div className="flex flex-wrap gap-2">
                    {VERIFIED_BADGES.map((b) => <Badge key={b.id} label={b.label} type="verified" size="sm" />)}
                    {SELF_BADGES.map((b) => <Badge key={b.id} label={b.label} type="self" size="sm" />)}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="New badge label" className="max-w-xs" />
                    <Button size="sm">Add</Button>
                  </div>
                </Card>
              )
            if (active === 'Policies')
              return (
                <Card className="max-w-2xl space-y-3">
                  <CardLabel>Platform policies</CardLabel>
                  <Textarea label="Little Lamb policies (platform-wide)" rows={4} />
                  <Textarea label="Family policies" rows={3} />
                  <Textarea label="Nanny policies" rows={3} />
                  <Button>Save policies</Button>
                </Card>
              )
            if (active === 'Billing')
              return (
                <Card className="max-w-lg space-y-4">
                  <CardLabel>Billing configuration</CardLabel>
                  <Input label="Flat subscription per quarter ($)" type="number" defaultValue={25} />
                  <Input label="Per-booking fee ($)" type="number" defaultValue={1} />
                  <Button>Save</Button>
                </Card>
              )
            return (
              <Card className="max-w-lg space-y-4">
                <CardLabel>Calendly integration</CardLabel>
                <p className="text-sm text-charcoal-muted">The interview scheduling link used in nanny status emails and the holding page.</p>
                <Input label="Calendly link" defaultValue="https://calendly.com/littlelamb/interview" />
                <Button>Save</Button>
              </Card>
            )
          }}
        </Tabs>
      </PageBody>
    </>
  )
}
