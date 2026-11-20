import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PublicShell } from './PublicShell'
import { LambMark } from '../../components/ui'
import { Grain, Blob, DrawnUnderline, StickerBadge, FloatLoop, Sparkle } from '../../components/theme'
import { useTiltHover, useButtonHover } from '../../lib/motion'
import { cn } from '../../lib/cn'

/**
 * "/for-families" intermediate info page (CLAUDE.md §1.2). Reached from the homepage
 * "Get started" path. Explains how the listing service works and what's included before
 * sending families into /apply. Little Lamb is a job-listing service, NOT an agency — it
 * does not vet, screen, interview, or verify sitters; families choose and hire their own
 * (D77 + the business-plan legal copy rules). Layout varies per section (Variance Mandate):
 * asymmetric hero, staggered how-it-works row, two-column ledger, centered closing band.
 */
export function FamilyInfoPage() {
  return (
    <PublicShell>
      <Hero />
      <HowItWorks />
      <Included />
      <BottomCTA />
    </PublicShell>
  )
}

/* ----------------------------------------------------------------------- Hero */
function Hero() {
  const rise = 'motion-safe:animate-spring-in'
  const delay = (i: number) => ({ animationDelay: `${i * 70}ms` })
  const btnHover = useButtonHover()

  return (
    <section className="relative overflow-hidden">
      <Grain />
      <Blob tone="sage" className="left-[-10%] top-[-8%] h-72 w-72" />
      <Blob tone="peri" className="bottom-[-14%] right-[-8%] h-80 w-80" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        {/* Left — copy */}
        <div>
          <p className={cn('eyebrow inline-flex items-center gap-2', rise)} style={delay(0)}>
            <Sparkle className="h-4 w-4 text-ll-terra" />
            For families
          </p>
          <h1
            className={cn('mt-4 font-display text-display-xl leading-[0.92] text-ll-ink', rise)}
            style={delay(1)}
          >
            How Little Lamb{' '}
            <DrawnUnderline tone="terra">works</DrawnUnderline>
            <br />
            for your family.
          </h1>
          <p className={cn('mt-6 max-w-md text-body-lg text-ll-warm-gray', rise)} style={delay(2)}>
            Finding a sitter shouldn’t mean digging through group chats. Little Lamb is a local
            board where you post what you need, browse sitter profiles, and book directly — you
            choose, interview, and hire your own sitter. Here is exactly how it works.
          </p>

          <div className={cn('mt-8 flex flex-wrap items-center gap-4', rise)} style={delay(3)}>
            <motion.div {...btnHover} className="inline-block">
              <Link
                to="/apply"
                className="inline-flex h-12 items-center rounded-full bg-ll-terra-deep px-7 text-base font-medium text-white shadow-pop-terra transition-colors hover:bg-ll-ink"
              >
                Get started
              </Link>
            </motion.div>
            <Link
              to="/for-nannies"
              className="text-label font-medium text-ll-sage-deep underline-offset-4 hover:underline"
            >
              Are you a nanny? Apply here
            </Link>
          </div>

          <p className={cn('mt-4 text-sm text-ll-warm-gray', rise)} style={delay(4)}>
            Your first two bookings are free. Browse anytime, no commitment.
          </p>
        </div>

        {/* Right — blob-masked scene with floating credential stickers */}
        <div className={cn('relative mx-auto w-full max-w-sm', rise)} style={delay(2)}>
          <HeroScene />
        </div>
      </div>
    </section>
  )
}

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
          <CheckBadgeIcon /> Post a job
        </StickerBadge>
      </div>
      <div className="absolute -left-3 top-1/2">
        <StickerBadge tone="terra" rotate={-3} delay={0.3}>
          <ShieldIcon /> Book directly
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

/* ---------------------------------------------------------------- HowItWorks */
/** How the listing service works: post → browse → book & pay directly. Staggered tilt cards. */
function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Post what you need',
      tone: 'peri' as const,
      body: 'Share the dates, hours, and any details — a date night, after-school pickups, or last-minute help when plans fall apart. It goes out to local sitters.',
    },
    {
      n: '02',
      title: 'Browse and choose',
      tone: 'sage' as const,
      body: 'See sitter profiles with photos, bios, self-reported credentials, and a one-minute intro video. You interview and choose whoever feels right for your family.',
    },
    {
      n: '03',
      title: 'Book and pay directly',
      tone: 'terra' as const,
      body: 'Book inside a sitter’s posted hours, or ask for a time that works. You pay your sitter directly — no money passes through Little Lamb.',
    },
  ]
  return (
    <section className="relative overflow-hidden border-y-1.5 border-ll-cream-dark bg-ll-cream-dark/30">
      <Blob tone="terra" className="right-[-8%] top-1/4 h-64 w-64" />
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <p className="eyebrow text-center">How it works</p>
        <h2 className="mt-2 text-center font-display text-display-lg text-ll-ink">
          Three steps to{' '}
          <DrawnUnderline tone="sage">your</DrawnUnderline> sitter
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-body-md text-ll-warm-gray">
          Little Lamb is a local board that connects you with sitters. You choose, interview, and
          hire — we keep the finding simple.
        </p>
        <ol className="mt-12 grid gap-6 sm:grid-cols-3">
          {steps.map((s, i) => (
            <PromiseCard key={s.n} step={s} index={i} />
          ))}
        </ol>
      </div>
    </section>
  )
}

function PromiseCard({
  step,
  index,
}: {
  step: { n: string; title: string; tone: 'sage' | 'peri' | 'terra'; body: string }
  index: number
}) {
  const tilt = useTiltHover()
  const shadow = {
    sage: 'hover:shadow-pop-sage',
    peri: 'hover:shadow-pop-peri',
    terra: 'hover:shadow-pop-terra',
  }[step.tone]
  // Deep inks so the small mono number clears AA on cream-dark (peri-deep/terra fail).
  const numColor = {
    sage: 'text-ll-sage-deep',
    peri: 'text-ll-peri-ink',
    terra: 'text-ll-ink',
  }[step.tone]
  const border = {
    sage: 'border-ll-sage-light',
    peri: 'border-ll-peri-soft',
    terra: 'border-ll-terra-soft',
  }[step.tone]
  return (
    <motion.li
      {...tilt}
      className={cn(
        'rounded-ll-card border-1.5 bg-ll-cream p-7 shadow-soft transition-shadow',
        border,
        shadow,
      )}
      style={{ marginTop: index === 1 ? '-1.25rem' : undefined }}
    >
      <span className={cn('font-mono text-mono-sm font-medium', numColor)}>{step.n}</span>
      <h3 className="mt-2 font-display text-display-sm text-ll-ink">{step.title}</h3>
      <p className="mt-2 text-sm text-ll-warm-gray">{step.body}</p>
    </motion.li>
  )
}

/* ------------------------------------------------------------------- Included */
/** What's included vs. what isn't — honest expectations (CLAUDE.md Part 20: wages are direct). */
function Included() {
  const included = [
    'A local board of Santa Barbara sitters and nannies',
    'Real profiles with photos, bios, self-reported credentials, and intro videos',
    'Simple booking. Post a time, choose your sitter, confirm.',
    'Your first two bookings free, then a $150/year subscription',
  ]
  const notIncluded = [
    'Vetting, interviewing, and hiring — you choose and vet your own sitter',
    'Sitter wages. You pay your sitter directly (cash, Venmo, etc.).',
    'Verifying credentials — sitter badges are self-reported, not verified by Little Lamb',
    'Time tracking or clock in / clock out. Hours are between you and your sitter.',
  ]
  const inHover = useTiltHover()
  const outHover = useTiltHover()
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
      <p className="eyebrow text-center">What to expect</p>
      <h2 className="mt-2 text-center font-display text-display-lg text-ll-ink">
        What is included, and what is not
      </h2>
      <div className="mt-12 grid gap-6 sm:grid-cols-[1.1fr_0.9fr]">
        <motion.div
          {...inHover}
          className="rounded-ll-card border-1.5 border-ll-sage bg-ll-sage-light/40 p-7 shadow-soft transition-shadow hover:shadow-pop-sage"
        >
          <h3 className="font-display text-display-sm text-ll-sage-deep">What you get</h3>
          <ul className="mt-4 space-y-3">
            {included.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-ll-warm-gray">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-ll-sage-deep" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
        <motion.div
          {...outHover}
          className="rounded-ll-card border-1.5 border-ll-cream-dark bg-ll-cream-dark/40 p-7 shadow-soft transition-shadow hover:shadow-pop-terra"
        >
          <h3 className="font-display text-display-sm text-ll-ink">Handled off-platform</h3>
          <ul className="mt-4 space-y-3">
            {notIncluded.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-ll-warm-gray">
                <DotIcon className="mt-1.5 h-2 w-2 shrink-0 text-ll-terra-deep" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
      <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-ll-warm-gray">
        We make the part that is hard to do alone — finding local sitters — simple. You stay in
        charge of who you hire, and wages stay direct between you and your sitter.
      </p>
    </section>
  )
}

/* ------------------------------------------------------------------ BottomCTA */
function BottomCTA() {
  const btnHover = useButtonHover()
  return (
    <section className="relative overflow-hidden border-t-1.5 border-ll-cream-dark bg-ll-cream-dark/30">
      <Grain />
      <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8">
        <FloatLoop speed="slow" className="mx-auto mb-6 w-fit">
          <span className="grid h-16 w-16 place-items-center rounded-full border-1.5 border-ll-sage bg-ll-sage-light shadow-pop-sage">
            <LambMark className="h-10 w-10" />
          </span>
        </FloatLoop>
        <h2 className="mx-auto max-w-xl font-display text-display-lg text-ll-ink">
          Ready to find your next sitter?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-body-md text-ll-warm-gray">
          Tell us a little about your family and you’re in — your first two bookings are free.
        </p>
        <motion.div {...btnHover} className="mt-8 inline-block">
          <Link
            to="/apply"
            className="inline-flex h-12 items-center rounded-full bg-ll-terra-deep px-8 text-base font-medium text-white shadow-pop-terra transition-colors hover:bg-ll-ink"
          >
            Apply now
          </Link>
        </motion.div>
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

function CheckBadgeIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" aria-hidden>
      <circle cx="8" cy="8" r="6.2" strokeWidth="1.5" opacity="0.4" />
      <path d="M5.2 8.2l1.9 1.9 3.7-3.9" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" aria-hidden>
      <path d="M3 8.5l3 3 7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DotIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 8 8" className={className} fill="currentColor" aria-hidden>
      <circle cx="4" cy="4" r="4" />
    </svg>
  )
}
