import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { LandingShell } from '../components/LandingShell'
import { useWaitlist } from '../components/waitlistContext'
import { LambMark } from '../../components/ui/Logo'
import { Blob, DrawnUnderline, FloatLoop, Grain, Sparkle, StickerBadge } from '../../components/theme'
import { useButtonHover, useTiltHover } from '../../lib/motion'
import { cn } from '../../lib/cn'

/**
 * Pre-launch marketing + waitlist page. Rebuilt to share the app's visual language (see
 * DESIGN_SYSTEM.md and the app's own HomePage): a cream page, eyebrow kickers, Caveat display
 * headings over readable DM-Sans body, subtle rounded cards with warm soft/pop shadows, and the
 * periwinkle trust-chip as the recurring vetting motif. Warm and playful, but readable first —
 * no sticky notes, no solid colour-blocked bands, no hand-drawn doodle chrome.
 *
 * The story still leads with the two kinds of help Little Lamb gives (last-minute and ongoing),
 * then why families can trust the circle, then nannies. Every CTA opens the waitlist/contact
 * modal; there is no path into the unfinished app. Every claim is something the product actually
 * does (see the comments by each one), and pricing is never shown: the model isn't final.
 */
export function LandingPage() {
  return (
    <LandingShell>
      <span id="top" />
      <Hero />
      <TrustStrip />
      <TwoKindsOfCare />
      <HowWeVet />
      <HowItWorks />
      <ForNannies />
      <WhoWeAre />
      <BottomCTA />
    </LandingShell>
  )
}

/* ------------------------------------------------------------------ Shared bits */

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  const btnHover = useButtonHover()
  return (
    <motion.div {...btnHover} className="inline-block">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-12 items-center rounded-full bg-ll-terra-deep px-7 text-base font-medium text-white shadow-pop-terra transition-colors hover:bg-ll-ink"
      >
        {children}
      </button>
    </motion.div>
  )
}

function SectionHeading({
  kicker,
  center,
  children,
}: {
  kicker: string
  center?: boolean
  children: ReactNode
}) {
  return (
    <div className={cn(center && 'text-center')}>
      <p className={cn('eyebrow', center && 'text-center')}>{kicker}</p>
      <h2 className="mt-2 font-display text-display-lg text-ll-ink">{children}</h2>
    </div>
  )
}

/* ------------------------------------------------------------------------- Hero */

function Hero() {
  const { openWaitlist } = useWaitlist()
  const rise = 'motion-safe:animate-spring-in'
  const delay = (i: number) => ({ animationDelay: `${i * 70}ms` })

  return (
    <section className="relative overflow-hidden">
      <Grain />
      <Blob tone="sage" className="left-[-8%] top-[-6%] h-72 w-72" />
      <Blob tone="peri" className="bottom-[-12%] right-[-6%] h-80 w-80" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        {/* Left — copy */}
        <div>
          <p className={cn('eyebrow inline-flex items-center gap-2', rise)} style={delay(0)}>
            <Sparkle className="h-4 w-4 text-ll-terra" />
            Opening soon in Santa Barbara
          </p>
          <h1
            className={cn('mt-4 font-display text-display-xl leading-[0.92] text-ll-ink', rise)}
            style={delay(1)}
          >
            Care you can trust,{' '}
            <DrawnUnderline tone="terra">tonight</DrawnUnderline>
            <br />
            or every Tuesday.
          </h1>
          <p
            className={cn('mt-6 max-w-md text-body-lg text-ll-warm-gray', rise)}
            style={delay(2)}
          >
            Little Lamb is a small, local circle of nannies we have met in person. When a sitter
            cancels at five o’clock, post it and the whole circle sees it. When you want the same
            caring face each week, we’ll help you find your person.
          </p>

          <div className={cn('mt-8 flex flex-wrap items-center gap-4', rise)} style={delay(3)}>
            <PrimaryButton onClick={() => openWaitlist({ role: 'family' })}>
              Join the family waitlist
            </PrimaryButton>
            <button
              type="button"
              onClick={() => openWaitlist({ role: 'nanny' })}
              className="text-label font-medium text-ll-sage-deep underline-offset-4 hover:underline"
            >
              Are you a nanny? Join here →
            </button>
          </div>

          <p className={cn('mt-4 text-sm text-ll-warm-gray', rise)} style={delay(4)}>
            Free to join the list. No commitment.
          </p>

          {/* Credential chips — the same periwinkle trust motif the app leads with. Every line
              is a promise Little Lamb keeps about every nanny, not a customer count. */}
          <ul className={cn('mt-6 flex flex-wrap gap-2', rise)} style={delay(5)}>
            {HERO_CREDENTIALS.map((c) => (
              <li key={c} className="trust-chip">
                <ShieldIcon /> {c}
              </li>
            ))}
          </ul>
        </div>

        {/* Right — blob-masked lamb scene with floating credential stickers */}
        <div className={cn('relative mx-auto w-full max-w-sm', rise)} style={delay(2)}>
          <HeroScene />
        </div>
      </div>
    </section>
  )
}

const HERO_CREDENTIALS = ['Background-checked', 'Interviewed by the founders', 'Intro video on file']

function HeroScene() {
  return (
    <div className="relative">
      <FloatLoop speed="slow">
        <div className="mask-blob border-1.5 border-ll-peri-soft bg-ll-cream p-10 shadow-lift">
          <div className="mask-blob-alt grid place-items-center bg-ll-sage-light/50 py-12">
            <LambMark className="h-44 w-44" />
          </div>
        </div>
      </FloatLoop>

      <div className="absolute -right-2 top-4">
        <StickerBadge tone="peri" rotate={4} delay={0.1}>
          <ShieldIcon /> Background-checked
        </StickerBadge>
      </div>
      <div className="absolute -left-3 top-1/2">
        <StickerBadge tone="terra" rotate={-3} delay={0.3}>
          <StarIcon /> Interviewed
        </StickerBadge>
      </div>
      <div className="absolute -bottom-2 right-6">
        <StickerBadge tone="sage" rotate={2} delay={0.5}>
          Santa Barbara local
        </StickerBadge>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------- TrustStrip */

function TrustStrip() {
  const items = [
    { stat: '100%', label: 'background-checked before going live' },
    { stat: '1-on-1', label: 'interview with our founders' },
    { stat: '1 min', label: 'intro video on every profile' },
  ]
  return (
    <section className="border-y-1.5 border-ll-cream-dark bg-ll-cream-dark/40">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-12 sm:grid-cols-3 sm:px-8">
        {items.map((it) => (
          <div key={it.stat} className="text-center sm:text-left">
            <p className="font-mono text-3xl font-medium text-ll-peri-ink">{it.stat}</p>
            <p className="mt-1.5 text-sm text-ll-warm-gray">{it.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ------------------------------------------------------------- Two kinds of care */

function TwoKindsOfCare() {
  const { openWaitlist } = useWaitlist()
  return (
    <section id="care" className="scroll-mt-20 py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionHeading kicker="Two kinds of help" center>
          One trusted circle,{' '}
          <DrawnUnderline tone="sage">whenever</DrawnUnderline> you need it
        </SectionHeading>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {/* Last-minute: same-day and <25h requests post to the job board as 'open', and the
              first nanny to claim one gets it (useBookings.ts routeBooking + assignNanny). */}
          <CareCard
            tone="terra"
            eyebrow="Last-minute care"
            title="When plans fall apart"
            body="A sick day, a cancelled sitter, a meeting that runs late. Post a same-day or next-day request and it goes to every nanny in our circle at once. The first one who is free claims it, and we let you know you’re covered."
            items={[
              'Same-day and short-notice requests',
              'Seen by the whole circle, not just one person',
              'Every nanny already vetted by us',
            ]}
          />
          {/* Ongoing: book inside a nanny's posted hours, tick "repeat weekly" (recurring.ts),
              free cancellation up to 24h before (bookingRules.ts FREE_CANCEL_HOURS). */}
          <CareCard
            tone="sage"
            eyebrow="Ongoing care"
            title="When you want a familiar face"
            body="After-school pickups, a standing date night, a regular weekday. Get to know nannies through their profiles and intro videos, book inside the hours they’ve set, and make it repeat every week."
            items={[
              'Weekly bookings with the same nanny',
              'See availability before you book',
              'Free to cancel up to 24 hours ahead',
            ]}
          />
        </div>

        <div className="mt-12 text-center">
          <PrimaryButton onClick={() => openWaitlist({ role: 'family' })}>
            Save our family a spot
          </PrimaryButton>
        </div>
      </div>
    </section>
  )
}

function CareCard({
  tone,
  eyebrow,
  title,
  body,
  items,
}: {
  tone: 'sage' | 'terra'
  eyebrow: string
  title: string
  body: string
  items: string[]
}) {
  const tilt = useTiltHover()
  const border = tone === 'sage' ? 'border-ll-sage-light' : 'border-ll-terra-soft'
  const shadow = tone === 'sage' ? 'hover:shadow-pop-sage' : 'hover:shadow-pop-terra'
  const label = tone === 'sage' ? 'text-ll-sage-deep' : 'text-ll-terra-deep'
  return (
    <motion.article
      {...tilt}
      className={cn(
        'rounded-ll-card border-1.5 bg-ll-cream-dark/60 p-7 shadow-soft transition-shadow sm:p-8',
        border,
        shadow,
      )}
    >
      <p className={cn('font-mono text-mono-sm font-medium uppercase tracking-wide', label)}>
        {eyebrow}
      </p>
      <h3 className="mt-2 font-display text-display-md text-ll-ink">{title}</h3>
      <p className="mt-3 text-body-md leading-relaxed text-ll-warm-gray">{body}</p>
      <Checklist items={items} />
    </motion.article>
  )
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-2.5">
      {items.map((it) => (
        <li key={it} className="flex items-start gap-2.5 text-body-sm text-ll-ink">
          <CheckIcon className="mt-0.5 h-4 w-4 flex-none text-ll-sage-mid" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  )
}

/* -------------------------------------------------------------------- How we vet */

/** Each line is a step every nanny goes through before families can see them. */
const VETTING = [
  { title: 'A background check', note: 'before anything else' },
  { title: 'An in-person interview with us', note: 'our founders meet every nanny' },
  { title: 'A reference from their church community', note: 'a pastor or church leader' },
  { title: 'Certifications we check ourselves', note: 'CPR and first aid show as “verified by Little Lamb”' },
  { title: 'A one-minute video hello', note: 'so you hear their voice before they arrive' },
]

function HowWeVet() {
  return (
    <section id="trust" className="relative scroll-mt-20 overflow-hidden bg-ll-cream-dark/30 py-16 lg:py-24">
      <Blob tone="peri" className="right-[-6%] top-1/4 h-64 w-64" />
      <div className="mx-auto grid max-w-6xl items-start gap-12 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionHeading kicker="How we vet">
            Who gets into our circle
          </SectionHeading>
          <p className="mt-6 max-w-md text-body-lg text-ll-warm-gray">
            We would rather have a small circle we know well than a long list of strangers. Our
            nannies come from Westmont College and Santa Barbara’s church community, and nobody
            appears to families until they’ve passed every step.
          </p>
          <p className="mt-6 inline-block rounded-ll-tag bg-ll-peri-light px-4 py-2 font-mono text-mono-sm text-ll-peri-ink">
            Reviews after every visit come straight to us — never public.
          </p>
        </div>

        {/* A clean vetting checklist card — the trust list carries the weight, not paper chrome. */}
        <div className="rounded-ll-card border-1.5 border-ll-peri-soft bg-ll-cream p-6 shadow-lift sm:p-8">
          <ol className="space-y-1">
            {VETTING.map((v, i) => (
              <li
                key={v.title}
                className={cn(
                  'flex items-start gap-3.5 py-3.5',
                  i < VETTING.length - 1 && 'border-b-1.5 border-ll-cream-dark',
                )}
              >
                <span className="mt-0.5 grid h-7 w-7 flex-none place-items-center rounded-full border-1.5 border-ll-peri bg-ll-peri-light text-ll-peri-ink">
                  <CheckIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-body-md font-medium text-ll-ink">{v.title}</p>
                  <p className="mt-0.5 text-body-sm text-ll-warm-gray">{v.note}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ How it works */

function HowItWorks() {
  // A real sequence, so the step numbers carry information.
  const steps = [
    {
      n: '01',
      tone: 'sage' as const,
      title: 'Tell us about your family',
      body: 'A short application about your kids and what you need. We meet every family too.',
    },
    {
      n: '02',
      tone: 'peri' as const,
      title: 'Meet the nannies',
      body: 'Browse profiles, verified badges and intro videos from nannies who live near you.',
    },
    {
      n: '03',
      tone: 'terra' as const,
      title: 'Book ahead, or ask for help today',
      body: 'Set up ongoing care with someone you like, or post a last-minute request to the whole circle.',
    },
  ]
  return (
    <section id="how" className="relative mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 lg:py-24">
      <SectionHeading kicker="How it works" center>
        Three small steps
      </SectionHeading>
      <ol className="mt-12 grid gap-6 sm:grid-cols-3">
        {steps.map((s, i) => (
          <StepCard key={s.n} step={s} index={i} />
        ))}
      </ol>
    </section>
  )
}

function StepCard({
  step,
  index,
}: {
  step: { n: string; tone: 'sage' | 'peri' | 'terra'; title: string; body: string }
  index: number
}) {
  const tilt = useTiltHover()
  const shadow = { sage: 'hover:shadow-pop-sage', peri: 'hover:shadow-pop-peri', terra: 'hover:shadow-pop-terra' }[step.tone]
  // Deeper inks so the small mono number clears AA on cream-dark.
  const numColor = { sage: 'text-ll-sage-deep', peri: 'text-ll-peri-ink', terra: 'text-ll-ink' }[step.tone]
  const border = { sage: 'border-ll-sage-light', peri: 'border-ll-peri-soft', terra: 'border-ll-terra-soft' }[step.tone]
  return (
    <motion.li
      {...tilt}
      className={cn(
        'rounded-ll-card border-1.5 bg-ll-cream-dark/60 p-7 shadow-soft transition-shadow',
        border,
        shadow,
      )}
      // middle card sits slightly higher for editorial rhythm (breaks the flat row)
      style={{ marginTop: index === 1 ? '-1.25rem' : undefined }}
    >
      <span className={cn('font-mono text-mono-sm font-medium', numColor)}>{step.n}</span>
      <h3 className="mt-2 font-display text-display-md text-ll-ink">{step.title}</h3>
      <p className="mt-2 text-body-sm text-ll-warm-gray">{step.body}</p>
    </motion.li>
  )
}

/* --------------------------------------------------------------------- For nannies */

function ForNannies() {
  const { openWaitlist } = useWaitlist()
  return (
    <section id="nannies" className="relative scroll-mt-20 overflow-hidden bg-ll-cream-dark/30 py-16 lg:py-24">
      <Blob tone="sage" className="left-[-6%] bottom-1/4 h-64 w-64" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
        <div>
          <SectionHeading kicker="For nannies">
            Steady families, on <DrawnUnderline tone="sage">your</DrawnUnderline> schedule
          </SectionHeading>
          <p className="mt-6 max-w-md text-body-lg text-ll-warm-gray">
            Love caring for kids? Join a circle where families already trust you before you arrive,
            and the work fits around your classes and your life.
          </p>
          <div className="mt-8">
            <PrimaryButton onClick={() => openWaitlist({ role: 'nanny' })}>
              Join the nanny waitlist
            </PrimaryButton>
          </div>
        </div>
        {/* All true today: availability gates auto-confirm, the job board is open to every
            approved nanny, and nannies are never billed (wages are paid privately). */}
        <article className="rounded-ll-card border-1.5 border-ll-peri-soft bg-ll-cream p-7 shadow-soft sm:p-8">
          <p className="font-mono text-mono-sm font-medium uppercase tracking-wide text-ll-terra-deep">
            A note for nannies
          </p>
          <Checklist
            items={[
              'Set your own weekly hours. Families book inside them.',
              'Pick up last-minute jobs when you’re free.',
              'Keep all of your pay. Families pay you directly.',
              'Never pay a cent to join.',
            ]}
          />
        </article>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------- Who we are */

function WhoWeAre() {
  return (
    <section id="about" className="scroll-mt-20 py-16 lg:py-24">
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
        <LambMark tone="terra" className="mx-auto mb-5 h-16 w-32" />
        <SectionHeading kicker="Who we are" center>
          Started at Westmont, rooted in Santa Barbara
        </SectionHeading>
        <p className="mx-auto mt-6 max-w-xl text-body-lg text-ll-warm-gray">
          We’re Lucy Behringer and David Melesse, two Westmont seniors. Lucy brings firsthand
          childcare experience and runs the day to day; David builds the platform. We started Little
          Lamb because finding someone you trust with your kids shouldn’t depend on who you happen
          to know.
        </p>
        <p className="mx-auto mt-8 inline-block rounded-ll-tag bg-ll-sage-light px-5 py-3 font-mono text-mono-sm text-ll-sage-deep">
          10% of what we earn goes to local nonprofits serving children.
        </p>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------- Bottom CTA */

function BottomCTA() {
  const { openWaitlist, openContact } = useWaitlist()
  return (
    <section className="relative overflow-hidden border-t-1.5 border-ll-cream-dark">
      <Grain />
      <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 lg:py-24">
        <FloatLoop speed="slow" className="mx-auto mb-6 w-fit">
          <span className="grid h-16 w-16 place-items-center rounded-full border-1.5 border-ll-sage bg-ll-sage-light shadow-pop-sage">
            <LambMark className="h-10 w-10" />
          </span>
        </FloatLoop>
        <h2 className="mx-auto max-w-2xl font-display text-display-lg text-ll-ink">
          Save your spot
        </h2>
        <p className="mx-auto mt-4 max-w-md text-body-lg text-ll-warm-gray">
          We’re opening to Santa Barbara families soon. Join the waitlist and we’ll write to you
          when it’s your turn.
        </p>
        <div className="mt-8">
          <PrimaryButton onClick={() => openWaitlist()}>Join the waitlist</PrimaryButton>
        </div>
        <p className="mt-4 text-sm text-ll-warm-gray">
          Questions?{' '}
          <button
            type="button"
            onClick={() => openContact()}
            className="font-medium text-ll-sage-deep underline underline-offset-4 hover:no-underline"
          >
            Get in touch
          </button>
          . We’re a small local team and we read every message.
        </p>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------- Icons */

function ShieldIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M8 1l5 2v4c0 3.5-2.3 6.4-5 7.5C5.3 13.4 3 10.5 3 7V3l5-2z" opacity="0.25" />
      <path d="M8 1l5 2v4c0 3.5-2.3 6.4-5 7.5C5.3 13.4 3 10.5 3 7V3l5-2zm0 1.6L4.2 4.1v2.9c0 2.7 1.6 5 3.8 6 2.2-1 3.8-3.3 3.8-6V4.1L8 2.6zm2.3 2.6l.9.9-3.6 3.6-2-2 .9-.9 1.1 1.1 2.7-2.7z" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M8 1.5l1.8 3.9 4.2.5-3.1 2.9.8 4.2L8 11.8 4.3 13l.8-4.2L2 5.9l4.2-.5L8 1.5z" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden>
      <path
        d="M3 8.5l3 3 7-7.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
