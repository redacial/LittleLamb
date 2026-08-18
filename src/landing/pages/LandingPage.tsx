import { motion } from 'framer-motion'
import { LandingShell } from '../components/LandingShell'
import { useWaitlist } from '../components/waitlistContext'
import { LambMark } from '../../components/ui/Logo'
import { Grain, Blob, DrawnUnderline, StickerBadge, FloatLoop, Sparkle } from '../../components/theme'
import { useTiltHover, useButtonHover } from '../../lib/motion'
import { cn } from '../../lib/cn'

/**
 * Pre-launch marketing + waitlist landing page. Single scrolling page, Premium Playful,
 * alive on hover. Every CTA opens the waitlist/contact modal — there is no path into the
 * (unfinished) app. Two-audience story: a families arc and a distinct nannies arc, each
 * with its own waitlist CTA carrying the right role.
 */
export function LandingPage() {
  return (
    <LandingShell>
      <span id="top" />
      <Hero />
      <TrustStrip />
      <HowItWorks />
      <ForFamilies />
      <NannyPreview />
      <ForNannies />
      <BottomCTA />
    </LandingShell>
  )
}

/**
 * Hero credential chips. Every line here must be a promise Little Lamb keeps about
 * every nanny on day one — no customer counts, ratings, or review averages. Reviews
 * are admin-only by design and never surface publicly. Kept in sync with
 * src/pages/public/HomePage.tsx, which is a near-duplicate of this page.
 */
const HERO_CREDENTIALS = ['Background-checked', 'Interviewed by the founders', 'Intro video on file']

/* ----------------------------------------------------------------------- Hero */
function Hero() {
  const { openWaitlist } = useWaitlist()
  const rise = 'motion-safe:animate-spring-in'
  const delay = (i: number) => ({ animationDelay: `${i * 70}ms` })
  const btnHover = useButtonHover()

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
            Launching soon in Santa Barbara
          </p>
          <h1
            className={cn('mt-4 font-display text-display-xl leading-[0.92] text-ll-ink', rise)}
            style={delay(1)}
          >
            Every nanny,{' '}
            <DrawnUnderline tone="terra">vetted</DrawnUnderline>
            <br />
            before you ever meet.
          </h1>
          <p
            className={cn('mt-6 max-w-md text-body-lg text-ll-warm-gray', rise)}
            style={delay(2)}
          >
            Little Lamb connects your family with pre-screened, personally interviewed nannies.
            We’re putting the finishing touches on the platform — join the waitlist and we’ll let
            you know the moment we go live.
          </p>

          <div className={cn('mt-8 flex flex-wrap items-center gap-4', rise)} style={delay(3)}>
            <motion.div {...btnHover} className="inline-block">
              <button
                type="button"
                onClick={() => openWaitlist({ role: 'family' })}
                className="inline-flex h-12 items-center rounded-full bg-ll-terra-deep px-7 text-base font-medium text-white shadow-pop-terra transition-colors hover:bg-ll-ink"
              >
                Join the waitlist
              </button>
            </motion.div>
            <button
              type="button"
              onClick={() => openWaitlist({ role: 'nanny' })}
              className="text-label font-medium text-ll-sage-deep underline-offset-4 hover:underline"
            >
              Are you a nanny? Join here →
            </button>
          </div>

          {/* Trust microcopy right at the click moment, then social proof */}
          <p className={cn('mt-4 text-sm text-ll-warm-gray', rise)} style={delay(4)}>
            Background-checked and interviewed before going live. No commitment to join the list.
          </p>
          {/* Credential chips, not social proof — Little Lamb is pre-launch, so we lead with
              what we actually guarantee about every nanny rather than a customer count. */}
          <ul className={cn('mt-6 flex flex-wrap gap-2', rise)} style={delay(5)}>
            {HERO_CREDENTIALS.map((c) => (
              <li key={c} className="trust-chip">
                <ShieldIcon /> {c}
              </li>
            ))}
          </ul>
        </div>

        {/* Right — blob-masked illustration with floating sticker credentials */}
        <div className={cn('relative mx-auto w-full max-w-sm', rise)} style={delay(2)}>
          <HeroScene />
        </div>
      </div>
    </section>
  )
}

/** Hand-drawn lamb scene in a blob-masked cream panel, with floating credential stickers. */
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

      {/* Floating credential stickers — the recurring trust motif */}
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

/* ---------------------------------------------------------------- HowItWorks */
function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Browse',
      tone: 'sage' as const,
      body: 'See real photos, bios, badges, and a one-minute intro video for every nanny in our network.',
    },
    {
      n: '02',
      title: 'Book',
      tone: 'peri' as const,
      body: 'Pick a date and time, choose your nanny, and confirm. Within their hours, it is confirmed instantly.',
    },
    {
      n: '03',
      title: 'Enjoy',
      tone: 'terra' as const,
      body: 'Your nanny arrives ready. Pay them directly. We handle the matching, not the wages.',
    },
  ]
  return (
    <section id="how" className="relative mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 lg:py-24">
      <p className="eyebrow text-center">How it works</p>
      <h2 className="mt-2 text-center font-display text-display-lg text-ll-ink">
        Three steps to your next sitter
      </h2>
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
  step: { n: string; title: string; tone: 'sage' | 'peri' | 'terra'; body: string }
  index: number
}) {
  const tilt = useTiltHover()
  const shadow = { sage: 'hover:shadow-pop-sage', peri: 'hover:shadow-pop-peri', terra: 'hover:shadow-pop-terra' }[step.tone]
  // Deeper inks so the small mono number clears AA on cream-dark (terra-deep/peri-deep fail).
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
      // odd cards sit slightly higher for editorial rhythm (breaks the flat row)
      style={{ marginTop: index === 1 ? '-1.25rem' : undefined }}
    >
      <span className={cn('font-mono text-mono-sm font-medium', numColor)}>{step.n}</span>
      <h3 className="mt-2 font-display text-display-md text-ll-ink">{step.title}</h3>
      <p className="mt-2 text-sm text-ll-warm-gray">{step.body}</p>
    </motion.li>
  )
}

/* -------------------------------------------------------------- ForFamilies */
function ForFamilies() {
  const { openWaitlist } = useWaitlist()
  const btnHover = useButtonHover()
  const points = [
    'Every nanny is background-checked and personally interviewed before their profile goes live.',
    'Watch a one-minute intro video and read real bios before you ever reach out.',
    'Book in a few taps, manage your schedule, and pay one simple quarterly fee.',
  ]
  return (
    <section id="families" className="relative scroll-mt-20 overflow-hidden py-16 lg:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
        <div>
          <p className="eyebrow">For families</p>
          <h2 className="mt-2 font-display text-display-lg text-ll-ink">
            Childcare you can{' '}
            <DrawnUnderline tone="peri">actually trust</DrawnUnderline>
          </h2>
          <ul className="mt-6 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-body-md text-ll-warm-gray">
                <CheckIcon />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <motion.div {...btnHover} className="mt-8 inline-block">
            <button
              type="button"
              onClick={() => openWaitlist({ role: 'family' })}
              className="inline-flex h-12 items-center rounded-full bg-ll-terra-deep px-7 text-base font-medium text-white shadow-pop-terra transition-colors hover:bg-ll-ink"
            >
              Join the family waitlist
            </button>
          </motion.div>
        </div>
        <FloatLoop speed="slow" className="mx-auto w-full max-w-sm">
          <div className="mask-blob border-1.5 border-ll-peri-soft bg-ll-cream p-10 shadow-lift">
            <div className="mask-blob-alt grid place-items-center bg-ll-peri-light/60 py-12">
              <LambMark className="h-40 w-40" />
            </div>
          </div>
        </FloatLoop>
      </div>
    </section>
  )
}

/* --------------------------------------------------------------- NannyPreview */
function NannyPreview() {
  const samples = [
    { name: 'Maya R.', years: '6 yrs', badges: ['CPR', 'Ages 0-2'], rotate: -1.2 },
    { name: 'Jordan P.', years: '4 yrs', badges: ['First Aid', 'Pet-friendly'], rotate: 0.8 },
    { name: 'Sofia L.', years: '9 yrs', badges: ['CPR', 'Ages 8-12'], rotate: -0.6 },
  ]
  return (
    <section className="relative overflow-hidden bg-ll-cream-dark/30 py-16 lg:py-24">
      <Blob tone="terra" className="left-[-6%] top-1/3 h-64 w-64" />
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="eyebrow text-center">Meet the network</p>
        <h2 className="mt-2 text-center font-display text-display-lg text-ll-ink">
          The kind of nanny you would{' '}
          <DrawnUnderline tone="sage">recommend</DrawnUnderline> to a friend
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {samples.map((n) => (
            <NannyCard key={n.name} nanny={n} />
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-prose text-center text-sm text-ll-warm-gray">
          Profiles shown are illustrative examples, not real nannies. Approved families will see
          the full, live network at launch.
        </p>
      </div>
    </section>
  )
}

function NannyCard({
  nanny,
}: {
  nanny: { name: string; years: string; badges: string[]; rotate: number }
}) {
  const tilt = useTiltHover()
  return (
    <motion.article
      {...tilt}
      style={{ rotate: nanny.rotate }}
      className="rounded-ll-card border-1.5 border-ll-peri-soft bg-ll-cream p-6 shadow-soft transition-shadow hover:shadow-pop-peri"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 place-items-center rounded-full border-1.5 border-ll-sage bg-ll-sage-light shadow-soft">
          <LambMark className="h-8 w-8" />
        </span>
        <div>
          <p className="font-display text-display-sm leading-none text-ll-ink">{nanny.name}</p>
          <p className="mt-1 font-mono text-mono-sm text-ll-warm-gray">{nanny.years} experience</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="trust-chip">
          <ShieldIcon /> Vetted
        </span>
        {nanny.badges.map((b) => (
          <span
            key={b}
            className="inline-flex items-center gap-1 rounded-full border-1.5 border-ll-sage-light bg-ll-sage-light/60 px-2.5 py-0.5 font-mono text-mono-sm font-medium text-ll-sage-deep"
          >
            {b}
          </span>
        ))}
      </div>
    </motion.article>
  )
}

/* ---------------------------------------------------------------- ForNannies */
function ForNannies() {
  const { openWaitlist } = useWaitlist()
  const btnHover = useButtonHover()
  const points = [
    'A professional profile to showcase your experience, badges, and personality.',
    'Set your own weekly availability — families book only within the hours you choose.',
    'Keep 100% of your wages. Families pay you directly; we never take a cut.',
  ]
  return (
    <section id="nannies" className="relative scroll-mt-20 overflow-hidden py-16 lg:py-24">
      <Blob tone="sage" className="right-[-6%] top-1/4 h-64 w-64" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
        <FloatLoop speed="slow" className="order-2 mx-auto w-full max-w-sm lg:order-1">
          <div className="mask-blob-alt border-1.5 border-ll-sage bg-ll-cream p-10 shadow-lift">
            <div className="mask-blob grid place-items-center bg-ll-sage-light/60 py-12">
              <LambMark className="h-40 w-40" />
            </div>
          </div>
        </FloatLoop>
        <div className="order-1 lg:order-2">
          <p className="eyebrow">For nannies</p>
          <h2 className="mt-2 font-display text-display-lg text-ll-ink">
            Grow your client base in the{' '}
            <DrawnUnderline tone="sage">community</DrawnUnderline>
          </h2>
          <ul className="mt-6 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-body-md text-ll-warm-gray">
                <CheckIcon />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <motion.div {...btnHover} className="mt-8 inline-block">
            <button
              type="button"
              onClick={() => openWaitlist({ role: 'nanny' })}
              className="inline-flex h-12 items-center rounded-full bg-ll-sage-light px-7 text-base font-medium text-ll-sage-deep shadow-pop-sage transition-colors hover:bg-ll-sage"
            >
              Join the nanny waitlist
            </button>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ BottomCTA */
function BottomCTA() {
  const { openWaitlist } = useWaitlist()
  const btnHover = useButtonHover()
  return (
    <section className="relative overflow-hidden">
      <Grain />
      <div className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
        <FloatLoop speed="slow" className="mx-auto mb-6 w-fit">
          <span className="grid h-16 w-16 place-items-center rounded-full border-1.5 border-ll-sage bg-ll-sage-light shadow-pop-sage">
            <LambMark className="h-10 w-10" />
          </span>
        </FloatLoop>
        <h2 className="mx-auto max-w-2xl font-display text-display-lg text-ll-ink">
          Be first to know when Little Lamb opens in Santa Barbara.
        </h2>
        <motion.div {...btnHover} className="mt-8 inline-block">
          <button
            type="button"
            onClick={() => openWaitlist()}
            className="inline-flex h-12 items-center rounded-full bg-ll-terra-deep px-8 text-base font-medium text-white shadow-pop-terra transition-colors hover:bg-ll-ink"
          >
            Join the waitlist
          </button>
        </motion.div>
        <p className="mt-4 text-sm text-ll-warm-gray">
          Questions?{' '}
          <ContactLink /> — we’re a small local team and we read every message.
        </p>
      </div>
    </section>
  )
}

function ContactLink() {
  const { openContact } = useWaitlist()
  return (
    <button
      type="button"
      onClick={() => openContact()}
      className="text-ll-sage-deep underline-offset-4 hover:underline"
    >
      Get in touch
    </button>
  )
}

/* ---------------------------------------------------------------------- Icons */
function StarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M8 1.5l1.8 3.9 4.2.5-3.1 2.9.8 4.2L8 11.8 4.3 13l.8-4.2L2 5.9l4.2-.5L8 1.5z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M8 1l5 2v4c0 3.5-2.3 6.4-5 7.5C5.3 13.4 3 10.5 3 7V3l5-2z" opacity="0.25" />
      <path d="M8 1l5 2v4c0 3.5-2.3 6.4-5 7.5C5.3 13.4 3 10.5 3 7V3l5-2zm0 1.6L4.2 4.1v2.9c0 2.7 1.6 5 3.8 6 2.2-1 3.8-3.3 3.8-6V4.1L8 2.6zm2.3 2.6l.9.9-3.6 3.6-2-2 .9-.9 1.1 1.1 2.7-2.7z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <span className="mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-ll-sage-light text-ll-sage-deep">
      <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
}
