import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Input'
import { LambMark } from '../../components/ui/Logo'
import { cn } from '../../lib/cn'
import { submitWaitlist, type SubmissionKind, type WaitlistRole } from '../waitlist'
import { WaitlistContext, type OpenOptions } from './waitlistContext'

/**
 * The pre-launch conversion centerpiece. One modal serves two jobs:
 *  - "waitlist" — capture name + email (+ optional phone) for launch notification
 *  - "contact"  — same, plus a required message
 * Both capture whether the person is a family or a nanny (the two-audience split).
 *
 * Exposed through a tiny context so any CTA on any page can open it with the right
 * intent (openWaitlist / openContact), without prop-drilling through the page tree.
 */

export function WaitlistProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<SubmissionKind>('waitlist')
  const [role, setRole] = useState<WaitlistRole>('family')

  const openWaitlist = useCallback((opts?: OpenOptions) => {
    setKind('waitlist')
    setRole(opts?.role ?? 'family')
    setOpen(true)
  }, [])

  const openContact = useCallback((opts?: OpenOptions) => {
    setKind('contact')
    setRole(opts?.role ?? 'family')
    setOpen(true)
  }, [])

  const value = useMemo(() => ({ openWaitlist, openContact }), [openWaitlist, openContact])

  return (
    <WaitlistContext.Provider value={value}>
      {children}
      <WaitlistDialog
        open={open}
        kind={kind}
        role={role}
        setRole={setRole}
        onClose={() => setOpen(false)}
      />
    </WaitlistContext.Provider>
  )
}

/* ----------------------------------------------------------------- the dialog */

function WaitlistDialog({
  open,
  kind,
  role,
  setRole,
  onClose,
}: {
  open: boolean
  kind: SubmissionKind
  role: WaitlistRole
  setRole: (r: WaitlistRole) => void
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const isContact = kind === 'contact'

  function reset() {
    setName('')
    setEmail('')
    setPhone('')
    setMessage('')
    setError(null)
    setDone(false)
    setSubmitting(false)
  }

  function handleClose() {
    onClose()
    // Reset after the close animation so the form doesn't flash empty on the way out.
    window.setTimeout(reset, 250)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const result = await submitWaitlist({ kind, role, name, email, phone, message })
    setSubmitting(false)
    if (result.ok) {
      setDone(true)
    } else {
      setError(result.error ?? 'Something went wrong. Please try again.')
    }
  }

  const title = done
    ? undefined
    : isContact
      ? 'Get in touch'
      : 'Join the waitlist'

  return (
    <Modal open={open} onClose={handleClose} title={title}>
      {done ? (
        <SuccessState kind={kind} onClose={handleClose} />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <p className="text-sm text-ll-warm-gray">
            {isContact
              ? 'Send us a note and we’ll get back to you. We’re a small Santa Barbara team.'
              : 'Little Lamb is launching soon. Leave your details and we’ll let you know the moment we go live.'}
          </p>

          <RoleToggle role={role} setRole={setRole} />

          <Input
            label="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <Input
            label="Phone (optional)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
          {isContact && (
            <Textarea
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="How can we help?"
              required
            />
          )}

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" loading={submitting} className="w-full">
            {isContact ? 'Send message' : 'Join the waitlist'}
          </Button>

          <p className="text-center text-xs text-ll-warm-gray">
            We’ll only use your details to contact you about Little Lamb. No spam.
          </p>
        </form>
      )}
    </Modal>
  )
}

/* ------------------------------------------------------------- role toggle */

function RoleToggle({
  role,
  setRole,
}: {
  role: WaitlistRole
  setRole: (r: WaitlistRole) => void
}) {
  const options: { value: WaitlistRole; label: string; sub: string }[] = [
    { value: 'family', label: 'I’m a family', sub: 'Looking for a nanny' },
    { value: 'nanny', label: 'I’m a nanny', sub: 'Looking to join' },
  ]
  return (
    <fieldset>
      <legend className="mb-1.5 block text-label font-medium text-ll-ink">I am a…</legend>
      <div className="grid grid-cols-2 gap-3">
        {options.map((o) => {
          const active = role === o.value
          return (
            <button
              key={o.value}
              type="button"
              aria-pressed={active}
              onClick={() => setRole(o.value)}
              className={cn(
                'rounded-ll-input border-1.5 px-4 py-3 text-left transition-colors',
                active
                  ? 'border-ll-sage bg-ll-sage-light'
                  : 'border-ll-warm-gray/30 bg-white hover:border-ll-sage/60',
              )}
            >
              <span className="block text-sm font-medium text-ll-ink">{o.label}</span>
              <span className="mt-0.5 block text-xs text-ll-warm-gray">{o.sub}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

/* --------------------------------------------------------------- success */

function SuccessState({ kind, onClose }: { kind: SubmissionKind; onClose: () => void }) {
  return (
    <div className="py-4 text-center">
      <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full border-1.5 border-ll-sage bg-ll-sage-light shadow-pop-sage">
        <LambMark className="h-10 w-10" />
      </span>
      <h2 className="font-display text-display-md text-ll-ink">
        {kind === 'contact' ? 'Message sent' : 'You’re on the list!'}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-ll-warm-gray">
        {kind === 'contact'
          ? 'Thanks for reaching out — we’ll be in touch soon.'
          : 'Thanks for your interest in Little Lamb. We’ll email you the moment we launch in Santa Barbara.'}
      </p>
      <Button variant="secondary" size="md" className="mt-6" onClick={onClose}>
        Done
      </Button>
    </div>
  )
}
