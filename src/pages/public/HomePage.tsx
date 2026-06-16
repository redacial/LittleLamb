import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PublicShell } from './PublicShell'
import { LambMark } from '../../components/ui'
import { Grain, Blob, DrawnUnderline, StickerBadge, FloatLoop, Sparkle } from '../../components/theme'
import { useTiltHover, useButtonHover } from '../../lib/motion'
import { cn } from '../../lib/cn'

/**
 * Marketing homepage (signed-out) — the demo flagship. Premium Playful, alive on hover.
 * See DEMO_THEME.md. The thesis is trust: every nanny is vetted before a family meets them,
 * and the periwinkle DM-Mono credential chips recur as the signature motif throughout.
 * Layout deliberately varies per section (Variance Mandate): asymmetric hero, stat band,
 * staggered process, offset nanny preview, centered closing band.
 */
export function HomePage() {
  return (
    <PublicShell>
      <Hero />
      <TrustStrip />
      <HowItWorks />
      <NannyPreview />
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
      <Blob tone="sage" className="left-[-8%] top-[-6%] h-72 w-72" />
      <Blob tone="peri" className="bottom-[-12%] right-[-6%] h-80 w-80" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
        {/* Left — copy */}
        <div>
          <p className={cn('eyebrow inline-flex items-center gap-2', rise)} style={delay(0)}>
            <Sparkle className="h-4 w-4 text-ll-terra" />
            Santa Barbara childcare
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
            Browse real profiles, watch a one-minute intro, and book with confidence.
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
              Are you a nanny? Apply here →
            </Link>
          </div>

          {/* Trust microcopy right at the click moment, then social proof */}
          <p className={cn('mt-4 text-sm text-ll-warm-gray', rise)} style={delay(4)}>
            Background-checked and interviewed before going live. Free to browse.
          </p>
          <div className={cn('mt-6 flex items-center gap-3', rise)} style={delay(5)}>
            <AvatarStack />
            <p className="font-mono text-mono-sm text-ll-warm-gray">
              Trusted by 120+ Santa Barbara families
            </p>
          </div>
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
          <StarIcon /> 4.9 rating
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

function AvatarStack() {
  const rings = ['border-ll-sage', 'border-ll-peri', 'border-ll-terra-soft', 'border-ll-sage-mid']
  return (
    <div className="flex -space-x-2">
      {rings.map((ring, i) => (
        <span
          key={i}
          className={cn(
            'grid h-9 w-9 place-items-center rounded-full border-1.5 bg-ll-cream-dark shadow-soft',
            ring,
          )}
        >
          <LambMark className="h-5 w-5" />
        </span>
      ))}
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
    <section className="relative mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
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
          Profiles shown are illustrative. Approved families see the full, live network.
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

/* ------------------------------------------------------------------ BottomCTA */
function BottomCTA() {
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
          Ready to find someone you trust with the people you love most?
        </h2>
        <motion.div {...btnHover} className="mt-8 inline-block">
          <Link
            to="/apply"
            className="inline-flex h-12 items-center rounded-full bg-ll-terra-deep px-8 text-base font-medium text-white shadow-pop-terra transition-colors hover:bg-ll-ink"
          >
            Get started
          </Link>
        </motion.div>
        <p className="mt-4 text-sm text-ll-warm-gray">
          Or{' '}
          <Link to="/for-families" className="text-ll-sage-deep underline-offset-4 hover:underline">
            learn how it works
          </Link>{' '}
          first.
        </p>
      </div>
    </section>
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
