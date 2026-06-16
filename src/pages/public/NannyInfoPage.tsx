import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PublicShell } from './PublicShell'
import { LambMark } from '../../components/ui'
import { Grain, Blob, DrawnUnderline, StickerBadge, FloatLoop, Sparkle } from '../../components/theme'
import { useTiltHover, useButtonHover } from '../../lib/motion'
import { cn } from '../../lib/cn'

/**
 * "/for-nannies" info page (CLAUDE.md §1.3 / nanny flow §1.2). Distinct from the family
 * page: it speaks to nannies about joining the network, walks through the application →
 * review → interview (Calendly) → decision path, and describes the platform once approved
 * (profile, availability, bookings, and never being charged). Sends them to /apply?role=nanny.
 *
 * Matches the homepage's Premium Playful quality: asymmetric blob-masked hero, floating
 * sticker credentials, a drawn underline on one keyword, tilt-hover cards, DM-Mono trust
 * motif. Layout varies per section (Variance Mandate): asymmetric hero, two-up benefits,
 * four-step timeline, compact platform grid, centered closing band.
 */
export function NannyInfoPage() {
  return (
    <PublicShell>
      <Hero />
      <Benefits />
      <Process />
      <LifeOnPlatform />
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
      <Blob tone="peri" className="left-[-10%] top-[-8%] h-72 w-72" />
      <Blob tone="sage" className="bottom-[-14%] right-[-8%] h-80 w-80" />

      {/* Art-left / copy-right inverts the family hero, keeping sections distinct. */}
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:py-24">
        {/* Left — blob-masked scene with floating stickers */}
        <div className={cn('relative order-2 mx-auto w-full max-w-sm lg:order-1', rise)} style={delay(2)}>
          <HeroScene />
        </div>

        {/* Right — copy */}
        <div className="order-1 lg:order-2">
          <p className={cn('eyebrow inline-flex items-center gap-2', rise)} style={delay(0)}>
            <Sparkle className="h-4 w-4 text-ll-terra" />
            For nannies, Santa Barbara
          </p>
          <h1
            className={cn('mt-4 font-display text-display-xl leading-[0.92] text-ll-ink', rise)}
            style={delay(1)}
          >
            Do work you{' '}
            <DrawnUnderline tone="sage">love</DrawnUnderline>,
            <br />
            for families who value you.
          </h1>
          <p className={cn('mt-6 max-w-md text-body-lg text-ll-warm-gray', rise)} style={delay(2)}>
            Little Lamb is a small, vetted network of Santa Barbara nannies. We bring you families
            who already trust the process, so you can focus on the kids, not on chasing leads or
            proving yourself from scratch.
          </p>

          <div className={cn('mt-8 flex flex-wrap items-center gap-4', rise)} style={delay(3)}>
            <motion.div {...btnHover} className="inline-block">
              <Link
                to="/apply?role=nanny"
                className="inline-flex h-12 items-center rounded-full bg-ll-terra-deep px-7 text-base font-medium text-white shadow-pop-terra transition-colors hover:bg-ll-ink"
              >
                Apply now
              </Link>
            </motion.div>
            <Link
              to="/for-families"
              className="text-label font-medium text-ll-sage-deep underline-offset-4 hover:underline"
            >
              Looking for childcare? See how it works
            </Link>
          </div>

          <p className={cn('mt-4 text-sm text-ll-warm-gray', rise)} style={delay(4)}>
            Always free for nannies. Set your own hours. Keep what you earn.
          </p>
        </div>
      </div>
    </section>
  )
}

function HeroScene() {
  return (
    <div className="relative">
      <FloatLoop speed="slow">
        <div className="mask-blob border-1.5 border-ll-sage bg-ll-cream p-10 shadow-lift">
          <div className="mask-blob-alt grid place-items-center bg-ll-peri-light/60 py-12">
            <LambMark className="h-44 w-44" />
          </div>
        </div>
      </FloatLoop>

      <div className="absolute -left-3 top-4">
        <StickerBadge tone="sage" rotate={-4} delay={0.1}>
          <HeartIcon /> Loved locally
        </StickerBadge>
      </div>
      <div className="absolute -right-3 top-1/2">
        <StickerBadge tone="terra" rotate={3} delay={0.3}>
          Never charged a fee
        </StickerBadge>
      </div>
      <div className="absolute -bottom-2 left-6">
        <StickerBadge tone="peri" rotate={-2} delay={0.5}>
          You set your hours
        </StickerBadge>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------- Benefits */
function Benefits() {
  const benefits = [
    {
      title: 'Families who already trust you',
      tone: 'peri' as const,
      body: 'Because every nanny here is vetted, families arrive ready to book. The trust work is done before you ever meet, with no awkward proving-yourself stage.',
    },
    {
      title: 'You set your own hours',
      tone: 'sage' as const,
      body: 'Open the days and times that work for your life. Families can only book within the availability you choose. You are never on the hook for hours you did not offer.',
    },
    {
      title: 'You are never charged',
      tone: 'terra' as const,
      body: 'Joining and using Little Lamb is always free for nannies. No membership fees, no cut of your wages. Families pay you directly, and we just handle the matching.',
    },
    {
      title: 'A profile that shows your best',
      tone: 'peri' as const,
      body: 'A real photo, your bio, your credential badges, and a one-minute intro video let families meet the real you before they book.',
    },
  ]
  return (
    <section className="relative overflow-hidden border-y-1.5 border-ll-cream-dark bg-ll-cream-dark/30">
      <Blob tone="sage" className="right-[-8%] top-1/4 h-64 w-64" />
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <p className="eyebrow text-center">Why join</p>
        <h2 className="mt-2 text-center font-display text-display-lg text-ll-ink">
          A network worth being{' '}
          <DrawnUnderline tone="terra">part of</DrawnUnderline>
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {benefits.map((b, i) => (
            <BenefitCard key={b.title} benefit={b} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}

function BenefitCard({
  benefit,
  index,
}: {
  benefit: { title: string; tone: 'sage' | 'peri' | 'terra'; body: string }
  index: number
}) {
  const tilt = useTiltHover()
  const shadow = {
    sage: 'hover:shadow-pop-sage',
    peri: 'hover:shadow-pop-peri',
    terra: 'hover:shadow-pop-terra',
  }[benefit.tone]
  const border = {
    sage: 'border-ll-sage-light',
    peri: 'border-ll-peri-soft',
    terra: 'border-ll-terra-soft',
  }[benefit.tone]
  return (
    <motion.article
      {...tilt}
      className={cn(
        'rounded-ll-card border-1.5 bg-ll-cream p-7 shadow-soft transition-shadow',
        border,
        shadow,
      )}
      // even cards drop a touch for editorial rhythm (breaks the flat grid)
      style={{ marginTop: index % 2 === 1 ? '1rem' : undefined }}
    >
      <h3 className="font-display text-display-sm text-ll-ink">{benefit.title}</h3>
      <p className="mt-2 text-sm text-ll-warm-gray">{benefit.body}</p>
    </motion.article>
  )
}

/* ---------------------------------------------------------------------- Process */
/** The vetting & approval path: application → review → interview (Calendly) → decision. */
function Process() {
  const steps = [
    {
      n: '01',
      title: 'Apply',
      body: 'Tell us about yourself and your experience. It takes a few minutes, and it creates your account so you can check your status any time.',
    },
    {
      n: '02',
      title: 'Review',
      body: 'Our founders read every application personally. We will keep you posted by email as your application moves through review.',
    },
    {
      n: '03',
      title: 'Interview',
      body: 'If it is a fit, we will send a link to book a one-on-one interview at a time that works for you. It is a real conversation, not a test.',
    },
    {
      n: '04',
      title: 'Decision',
      body: 'After the interview we make a decision and let you know. Once you are approved, you set up your profile and you are ready to be booked.',
    },
  ]
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
      <p className="eyebrow text-center">How approval works</p>
      <h2 className="mt-2 text-center font-display text-display-lg text-ll-ink">
        From application to your first booking
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-body-md text-ll-warm-gray">
        We keep it personal and transparent. You will always know where you stand.
      </p>
      <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <ProcessStep key={s.n} step={s} index={i} />
        ))}
      </ol>
    </section>
  )
}

function ProcessStep({
  step,
  index,
}: {
  step: { n: string; title: string; body: string }
  index: number
}) {
  const tilt = useTiltHover()
  return (
    <motion.li
      {...tilt}
      className="rounded-ll-card border-1.5 border-ll-peri-soft bg-ll-cream p-6 shadow-soft transition-shadow hover:shadow-pop-peri"
      // staircase: each step sits a little lower than the last on wide screens
      style={{ marginTop: index ? `${index * 0.6}rem` : undefined }}
    >
      <span className="font-mono text-mono-sm font-medium text-ll-peri-ink">{step.n}</span>
      <h3 className="mt-2 font-display text-display-sm text-ll-ink">{step.title}</h3>
      <p className="mt-2 text-sm text-ll-warm-gray">{step.body}</p>
    </motion.li>
  )
}

/* ----------------------------------------------------------------- LifeOnPlatform */
/** What the platform is like once approved. Compact mono-labeled grid on cream-dark. */
function LifeOnPlatform() {
  const items = [
    { label: 'Your profile', body: 'Photo, bio, badges, and a one-minute intro that families see first.' },
    { label: 'Your availability', body: 'Set recurring weekly hours. Families only book inside the slots you open.' },
    { label: 'Your bookings', body: 'Accept requests that fit your schedule, or pick up open ones nearby.' },
    { label: 'Your pay', body: 'Families pay you directly. You are never charged, so you keep what you earn.' },
  ]
  return (
    <section className="relative overflow-hidden border-t-1.5 border-ll-cream-dark bg-ll-cream-dark/30">
      <Blob tone="peri" className="left-[-6%] bottom-1/4 h-64 w-64" />
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
        <p className="eyebrow text-center">Once you are in</p>
        <h2 className="mt-2 text-center font-display text-display-lg text-ll-ink">
          What the platform is like
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <PlatformCard key={it.label} item={it} />
          ))}
        </div>
      </div>
    </section>
  )
}

function PlatformCard({ item }: { item: { label: string; body: string } }) {
  const tilt = useTiltHover()
  return (
    <motion.div
      {...tilt}
      className="rounded-ll-card border-1.5 border-ll-sage-light bg-ll-cream p-5 shadow-soft transition-shadow hover:shadow-pop-sage"
    >
      <p className="font-mono text-mono-sm font-medium text-ll-sage-deep">{item.label}</p>
      <p className="mt-2 text-sm text-ll-warm-gray">{item.body}</p>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ BottomCTA */
function BottomCTA() {
  const btnHover = useButtonHover()
  return (
    <section className="relative overflow-hidden">
      <Grain />
      <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8">
        <FloatLoop speed="slow" className="mx-auto mb-6 w-fit">
          <span className="grid h-16 w-16 place-items-center rounded-full border-1.5 border-ll-sage bg-ll-sage-light shadow-pop-sage">
            <LambMark className="h-10 w-10" />
          </span>
        </FloatLoop>
        <h2 className="mx-auto max-w-xl font-display text-display-lg text-ll-ink">
          Ready to join the Santa Barbara network?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-body-md text-ll-warm-gray">
          Apply in a few minutes. We review and interview every nanny personally before approval.
        </p>
        <motion.div {...btnHover} className="mt-8 inline-block">
          <Link
            to="/apply?role=nanny"
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
function HeartIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
      <path d="M8 14S2 10.2 2 6.1A3.1 3.1 0 018 4a3.1 3.1 0 016 2.1C14 10.2 8 14 8 14z" />
    </svg>
  )
}
