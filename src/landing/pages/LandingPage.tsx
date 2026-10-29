import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { LandingShell } from '../components/LandingShell'
import { useWaitlist } from '../components/waitlistContext'
import { LambMark } from '../../components/ui/Logo'
import { DrawnUnderline, FloatLoop } from '../../components/theme'
import { useTiltHover, useButtonHover } from '../../lib/motion'
import { cn } from '../../lib/cn'

/**
 * Pre-launch marketing + waitlist page. Family-first and warm: paper background, sticky notes,
 * handwriting, rounded everything. The story leads with the two kinds of help Little Lamb gives
 * (last-minute and ongoing), then why families can trust the circle, then nannies.
 *
 * Every CTA opens the waitlist/contact modal; there is no path into the unfinished app.
 * Every claim here must be something the product actually does (see the comments by each one),
 * and pricing is never shown: the model isn't final.
 */
export function LandingPage() {
  return (
    <LandingShell>
      <span id="top" />
      <Hero />
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

type NoteTone = 'butter' | 'sage' | 'blush'
const NOTE_BG: Record<NoteTone, string> = {
  butter: 'bg-ll-note-butter',
  sage: 'bg-ll-note-sage',
  blush: 'bg-ll-note-blush',
}

/** A taped paper note. Rotation is a resting tilt; it straightens a little on hover. */
function StickyNote({
  tone,
  rotate = 0,
  tape = true,
  className,
  children,
  as = 'div',
}: {
  tone: NoteTone
  rotate?: number
  tape?: boolean
  className?: string
  children: ReactNode
  as?: 'div' | 'li' | 'article'
}) {
  const tilt = useTiltHover()
  const Tag = { div: motion.div, li: motion.li, article: motion.article }[as]
  return (
    <Tag
      {...tilt}
      style={{ rotate }}
      className={cn('sticky-note', tape && 'sticky-tape', NOTE_BG[tone], className)}
    >
      {children}
    </Tag>
  )
}

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  const btnHover = useButtonHover()
  return (
    <motion.div {...btnHover} className="inline-block">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-12 items-center rounded-full bg-ll-brand-terra-ink px-7 text-base font-medium text-white shadow-[-4px_4px_0_0_rgba(169,87,58,0.25)] transition-colors hover:bg-ll-ink"
      >
        {children}
      </button>
    </motion.div>
  )
}

function SectionTitle({
  kicker,
  children,
  center,
  onColor,
}: {
  kicker: string
  children: ReactNode
  center?: boolean
  /** On a solid sage or terra band the terra kicker loses contrast, so it goes ink. */
  onColor?: boolean
}) {
  return (
    <div className={cn(center && 'text-center')}>
      <p className={cn('font-display text-2xl leading-none', onColor ? 'text-ll-ink' : 'text-ll-brand-terra-ink')}>
        {kicker}
      </p>
      <h2 className="mt-1 font-display text-[clamp(2.4rem,5.5vw,3.4rem)] leading-[0.95] text-ll-ink">
        {children}
      </h2>
    </div>
  )
}

/* ------------------------------------------------------------------------- Hero */

function Hero() {
  const { openWaitlist } = useWaitlist()
  return (
    // Solid brand sage, like the brand kit's sage logo card. Body text is ink here: warm-gray and
    // white both fail AA on this sage (ink is 6.0:1).
    <section className="relative overflow-hidden bg-ll-brand-sage">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28 lg:pt-20">
        <div>
          <p className="inline-flex -rotate-2 items-center gap-2 rounded-full bg-ll-paper px-4 py-1.5 font-display text-xl leading-none text-ll-brand-sage-ink">
            <HeartDoodle className="h-4 w-4" />
            Opening soon in Santa Barbara
          </p>
          <h1 className="mt-5 font-display text-[clamp(3rem,8vw,5rem)] leading-[0.9] text-ll-ink">
            Care you can trust, <DrawnUnderline tone="terra">tonight</DrawnUnderline> or every
            Tuesday.
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ll-ink">
            Little Lamb is a small, local circle of nannies we have met in person. When a sitter
            cancels at five o’clock, post it and every nanny in our circle sees it. When you want the
            same caring face each week, we’ll help you find your person.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <PrimaryButton onClick={() => openWaitlist({ role: 'family' })}>
              Join the family waitlist
            </PrimaryButton>
            <button
              type="button"
              onClick={() => openWaitlist({ role: 'nanny' })}
              className="inline-flex items-center gap-1 font-display text-2xl leading-none text-ll-ink hover:underline"
            >
              I’m a nanny <ArrowDoodle className="h-5 w-8" />
            </button>
          </div>
          <p className="mt-5 text-sm text-ll-ink">Free to join the list. No commitment.</p>
        </div>

        <HeroBoard />
      </div>
    </section>
  )
}

/** The sleeping lamb on a soft sage circle, with three notes stuck around it. */
function HeroBoard() {
  return (
    <div className="relative mx-auto w-full max-w-[26rem] pb-6 pt-10">
      <FloatLoop speed="slow">
        <div className="mx-auto grid aspect-square w-[82%] place-items-center rounded-full bg-ll-brand-sage-ink/40">
          <LambMark tone="white" className="w-[78%]" />
        </div>
      </FloatLoop>

      {/* These three lines are the whole pitch in miniature. Each is true of the product:
          short-notice posts go to the job board (useBookings routeBooking), every nanny is
          interviewed by the founders, and weekly recurring bookings exist. */}
      <StickyNote tone="butter" rotate={-5} className="absolute -left-2 top-0 w-44 !p-4 sm:-left-8 sm:w-48">
        <p className="font-display text-[1.45rem] leading-[1.05]">Sitter cancelled at 5? Post it. We’ve got you.</p>
      </StickyNote>
      <StickyNote tone="blush" rotate={4} className="absolute -right-1 top-1/3 w-40 !p-4 sm:-right-6 sm:w-44">
        <p className="font-display text-[1.45rem] leading-[1.05]">Same nanny, every week ♡</p>
      </StickyNote>
      <StickyNote tone="sage" rotate={-2} tape={false} className="absolute bottom-0 left-4 w-48 !p-4 sm:left-0">
        <p className="font-display text-[1.45rem] leading-[1.05]">Every nanny met in person by the founders</p>
      </StickyNote>
    </div>
  )
}

/* ------------------------------------------------------------- Two kinds of care */

function TwoKindsOfCare() {
  const { openWaitlist } = useWaitlist()
  return (
    <section id="care" className="scroll-mt-20 bg-ll-sand py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionTitle kicker="two kinds of help" center>
          One trusted circle, whenever you need it
        </SectionTitle>

        <div className="mt-14 grid gap-12 md:grid-cols-2 md:gap-10">
          {/* Last-minute: same-day and <25h requests post to the job board as 'open', and the
              first nanny to claim one gets it (useBookings.ts routeBooking + assignNanny). */}
          <StickyNote tone="butter" rotate={-1.5} as="article" className="md:mt-6">
            <p className="font-display text-2xl leading-none text-ll-brand-terra-ink">Last-minute care</p>
            <h3 className="mt-2 font-display text-[2.6rem] leading-[0.95]">When plans fall apart</h3>
            <p className="mt-4 leading-relaxed text-ll-warm-gray">
              A sick day, a cancelled sitter, a meeting that runs late. Post a same-day or
              next-day request and it goes to every nanny in our circle at once. The first one who
              is free claims it, and we let you know you’re covered.
            </p>
            <Checklist
              items={[
                'Same-day and short-notice requests',
                'Seen by the whole circle, not just one person',
                'Every nanny already vetted by us',
              ]}
            />
          </StickyNote>

          {/* Ongoing: book inside a nanny's posted hours, tick "repeat weekly" (recurring.ts),
              free cancellation up to 24h before (bookingRules.ts FREE_CANCEL_HOURS). */}
          <StickyNote tone="sage" rotate={1.5} as="article">
            <p className="font-display text-2xl leading-none text-ll-brand-sage-ink">Ongoing care</p>
            <h3 className="mt-2 font-display text-[2.6rem] leading-[0.95]">When you want a familiar face</h3>
            <p className="mt-4 leading-relaxed text-ll-warm-gray">
              After-school pickups, a standing date night, a regular weekday. Get to know nannies
              through their profiles and intro videos, book inside the hours they’ve set, and make
              it repeat every week.
            </p>
            <Checklist
              items={[
                'Weekly bookings with the same nanny',
                'See availability before you book',
                'Free to cancel up to 24 hours ahead',
              ]}
            />
          </StickyNote>
        </div>

        <div className="mt-14 text-center">
          <PrimaryButton onClick={() => openWaitlist({ role: 'family' })}>Save our family a spot</PrimaryButton>
        </div>
      </div>
    </section>
  )
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-2">
      {items.map((it) => (
        <li key={it} className="flex items-start gap-2.5 text-[0.95rem] text-ll-ink">
          <CheckDoodle className="mt-0.5 h-5 w-5 flex-none text-ll-brand-sage-ink" />
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
    // Solid brand terra, like the terra logo card. Ink text (5.9:1).
    <section id="trust" className="scroll-mt-20 bg-ll-brand-terra py-20 lg:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionTitle kicker="how we vet" onColor>
            Who gets into our circle
          </SectionTitle>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ll-ink">
            We would rather have a small circle we know well than a long list of strangers. Our
            nannies come from Westmont College and Santa Barbara’s church community, and nobody
            appears to families until they’ve passed every step.
          </p>
          <p className="mt-6 inline-block -rotate-1 rounded-2xl bg-ll-note-butter px-4 py-2 font-display text-2xl leading-tight text-ll-ink">
            Reviews after every visit come straight to us.
          </p>
        </div>

        {/* Notebook page: ruled lines, a red margin, handwritten checks. */}
        <div className="relative rounded-[28px] bg-white p-6 pl-12 shadow-[0_18px_40px_-18px_rgba(44,36,22,0.35)] sm:p-10 sm:pl-16">
          <span aria-hidden className="absolute bottom-6 left-7 top-6 w-px bg-ll-brand-terra/50 sm:left-10" />
          <ol>
            {VETTING.map((v) => (
              <li
                key={v.title}
                className="flex items-start gap-3 border-b-1.5 border-dashed border-ll-brand-sage/40 py-3.5 last:border-b-0"
              >
                <CheckDoodle className="mt-1 h-6 w-6 flex-none text-ll-brand-terra-ink" />
                <div>
                  <p className="font-display text-[1.9rem] leading-none text-ll-ink">{v.title}</p>
                  <p className="mt-1 text-sm text-ll-warm-gray">{v.note}</p>
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
  // A real sequence, so the handwritten numbers carry information.
  const steps: { n: string; title: string; body: string; tone: NoteTone; rotate: number }[] = [
    {
      n: '1',
      title: 'Tell us about your family',
      body: 'A short application about your kids and what you need. We meet every family too.',
      tone: 'blush',
      rotate: -2,
    },
    {
      n: '2',
      title: 'Meet the nannies',
      body: 'Browse profiles, verified badges and intro videos from nannies who live near you.',
      tone: 'butter',
      rotate: 1.5,
    },
    {
      n: '3',
      title: 'Book ahead, or ask for help today',
      body: 'Set up ongoing care with someone you like, or post a last-minute request to the whole circle.',
      tone: 'sage',
      rotate: -1,
    },
  ]
  return (
    <section id="how" className="scroll-mt-20 bg-ll-sand py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionTitle kicker="how it works" center>
          Three small steps
        </SectionTitle>
        <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((s) => (
            <StickyNote key={s.n} as="li" tone={s.tone} rotate={s.rotate}>
              <span className="font-display text-6xl leading-none text-ll-brand-terra-ink">{s.n}</span>
              <h3 className="mt-2 font-display text-[2rem] leading-none text-ll-ink">{s.title}</h3>
              <p className="mt-3 leading-relaxed text-ll-warm-gray">{s.body}</p>
            </StickyNote>
          ))}
        </ol>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------------- For nannies */

function ForNannies() {
  const { openWaitlist } = useWaitlist()
  return (
    <section id="nannies" className="scroll-mt-20 bg-ll-sage-wash py-20 lg:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <StickyNote tone="blush" rotate={-1.5} as="article" className="mx-auto max-w-md">
            <p className="font-display text-2xl leading-none text-ll-brand-terra-ink">a note for nannies</p>
            {/* All true today: availability gates auto-confirm, the job board is open to every
                approved nanny, and nannies are never billed (wages are paid privately). */}
            <Checklist
              items={[
                'Set your own weekly hours. Families book inside them.',
                'Pick up last-minute jobs when you’re free.',
                'Keep all of your pay. Families pay you directly.',
                'Never pay a cent to join.',
              ]}
            />
          </StickyNote>
        </div>
        <div className="order-1 lg:order-2">
          <SectionTitle kicker="for nannies">
            Steady families, on <DrawnUnderline tone="sage">your</DrawnUnderline> schedule
          </SectionTitle>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ll-warm-gray">
            Love caring for kids? Join a circle where families already trust you before you arrive,
            and the work fits around your classes and your life.
          </p>
          <div className="mt-8">
            <PrimaryButton onClick={() => openWaitlist({ role: 'nanny' })}>Join the nanny waitlist</PrimaryButton>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------- Who we are */

function WhoWeAre() {
  return (
    <section id="about" className="scroll-mt-20 bg-ll-note-blush py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-5 text-center sm:px-8">
        <LambMark tone="terra" className="mx-auto mb-5 h-16 w-32" />
        <SectionTitle kicker="who we are" center>
          Started at Westmont, rooted in Santa Barbara
        </SectionTitle>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ll-warm-gray">
          We’re Lucy Behringer and David Melesse, two Westmont seniors. Lucy brings firsthand
          childcare experience and runs the day to day; David builds the platform. We started Little
          Lamb because finding someone you trust with your kids shouldn’t depend on who you
          happen to know.
        </p>
        <p className="mx-auto mt-8 inline-block rotate-1 rounded-2xl bg-ll-note-butter px-5 py-3 font-display text-2xl leading-tight text-ll-ink">
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
    <section className="bg-ll-brand-terra py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <StickyNote tone="butter" rotate={-1} as="div" className="text-center sm:!p-12">
          <h2 className="font-display text-[clamp(2.6rem,6vw,3.6rem)] leading-[0.95] text-ll-ink">
            Save your spot
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-ll-warm-gray">
            We’re opening to Santa Barbara families soon. Join the waitlist and we’ll write to you
            when it’s your turn.
          </p>
          <div className="mt-8">
            <PrimaryButton onClick={() => openWaitlist()}>Join the waitlist</PrimaryButton>
          </div>
          <p className="mt-5 text-sm text-ll-warm-gray">
            Questions?{' '}
            <button
              type="button"
              onClick={() => openContact()}
              className="font-medium text-ll-brand-sage-ink underline underline-offset-4 hover:no-underline"
            >
              Get in touch
            </button>
            . We’re a small local team and we read every message.
          </p>
        </StickyNote>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------ Doodles */

function CheckDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M4 13.2c1.6 1.2 3 2.8 4.3 4.6C11 12.6 14.9 8.1 20.2 4.6"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ArrowDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 24" className={className} fill="none" aria-hidden>
      <path
        d="M2 14c8-4 18-5 33-2M28 6c3 2 6 4 8 6-3 1-6 3-8 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function HeartDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 20.5c-.4 0-7.9-4.6-8.9-9.6C2.4 7.4 4.6 4.5 7.6 4.5c2 0 3.4 1.2 4.4 2.7 1-1.5 2.4-2.7 4.4-2.7 3 0 5.2 2.9 4.5 6.4-1 5-8.5 9.6-8.9 9.6z" />
    </svg>
  )
}
