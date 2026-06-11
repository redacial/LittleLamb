import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { PublicShell } from './PublicShell'
import { LambMark } from '../../components/ui'
import { springSnappy } from '../../lib/motion'
import { cn } from '../../lib/cn'

/**
 * Marketing homepage (signed-out). Families primary, nannies a visible secondary path.
 * The page's thesis is trust: the hero leads with the promise that every nanny is vetted
 * before a family ever meets them, and the credential chips (DM Mono periwinkle) recur as
 * the signature motif throughout — the visual language of "earned trust, not sterile."
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

function Hero() {
  // Entrance uses a pure-CSS keyframe (animate-spring-in) rather than JS opacity gating, so the
  // hero is NEVER left invisible if an animation loop stalls — the keyframe commits to its final
  // visible state on its own. `motion-safe:` + the reduced-motion rule in index.css disable it
  // for users who prefer reduced motion (who then simply see the content, no animation).
  const rise = 'motion-safe:animate-spring-in'
  const delay = (i: number) => ({ animationDelay: `${i * 70}ms` })

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
      <div>
        <p className={cn('eyebrow', rise)} style={delay(0)}>Santa Barbara childcare</p>
        <h1 className={cn('mt-3 font-display text-display-xl leading-[0.95] text-ll-ink', rise)} style={delay(1)}>
          Every nanny, vetted
          <br />
          before you ever meet.
        </h1>
        <p className={cn('mt-5 max-w-md text-body-lg text-ll-warm-gray', rise)} style={delay(2)}>
          Little Lamb connects your family with pre-screened, personally interviewed nannies.
          Browse real profiles, watch a one-minute intro, and book with confidence.
        </p>
        <div className={cn('mt-8 flex flex-wrap items-center gap-4', rise)} style={delay(3)}>
          <Link
            to="/apply"
            className="inline-flex h-12 items-center rounded-full bg-ll-terra-deep px-7 text-base font-medium text-white transition-colors hover:bg-ll-ink"
          >
            Get started
          </Link>
          <Link
            to="/for-nannies"
            className="text-label font-medium text-ll-sage-mid underline-offset-4 hover:underline"
          >
            Are you a nanny? Apply here →
          </Link>
        </div>
        <div className={cn('mt-8 flex flex-wrap gap-2.5', rise)} style={delay(4)}>
          <TrustChip>Background checked</TrustChip>
          <TrustChip>Personally interviewed</TrustChip>
        </div>
      </div>

      <div className={cn('relative mx-auto w-full max-w-sm', rise)} style={delay(2)}>
        <HeroScene />
      </div>
    </section>
  )
}

/** Hand-drawn lamb scene on cream, in the illustration style from DESIGN_SYSTEM.md. */
function HeroScene() {
  return (
    <div className="relative rounded-ll-card border-1.5 border-ll-peri-soft bg-ll-cream p-8 shadow-soft">
      <div className="grid place-items-center rounded-ll-card bg-ll-sage-light/50 py-10">
        <LambMark className="h-40 w-40" />
      </div>
      {/* Floating credential chip — the recurring trust motif */}
      <div className="absolute -right-3 top-6 rotate-3">
        <span className="trust-chip shadow-soft">
          <ShieldIcon /> Vetted
        </span>
      </div>
      <div className="absolute -left-3 bottom-8 -rotate-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border-1.5 border-ll-sage bg-ll-sage-light px-2.5 py-1 font-mono text-mono-sm font-medium text-ll-sage-deep shadow-soft">
          ★ Loved locally
        </span>
      </div>
    </div>
  )
}

function TrustStrip() {
  const items = [
    { stat: '100%', label: 'background-checked before going live' },
    { stat: '1-on-1', label: 'interview with our founders' },
    { stat: '1 min', label: 'intro video on every profile' },
  ]
  return (
    <section className="border-y-1.5 border-ll-cream-dark bg-ll-cream-dark/30">
      <div className="mx-auto grid max-w-6xl gap-6 px-5 py-10 sm:grid-cols-3 sm:px-8">
        {items.map((it) => (
          <div key={it.stat} className="text-center sm:text-left">
            <p className="font-mono text-2xl font-medium text-ll-peri-deep">{it.stat}</p>
            <p className="mt-1 text-sm text-ll-warm-gray">{it.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Browse', body: 'See real photos, bios, badges, and a one-minute intro video for every nanny in our network.' },
    { n: '02', title: 'Book', body: 'Pick a date and time, choose your nanny, and confirm. Within their hours, it’s confirmed instantly.' },
    { n: '03', title: 'Enjoy', body: 'Your nanny arrives ready. Pay them directly — we handle the matching, not the wages.' },
  ]
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
      <p className="eyebrow text-center">How it works</p>
      <h2 className="mt-2 text-center font-display text-display-lg text-ll-ink">
        Three steps to your next sitter
      </h2>
      <ol className="mt-10 grid gap-5 sm:grid-cols-3">
        {steps.map((s) => (
          <li
            key={s.n}
            className="rounded-ll-card border-1.5 border-ll-cream-dark bg-ll-cream-dark/40 p-6"
          >
            <span className="font-mono text-mono-sm font-medium text-ll-terra-deep">{s.n}</span>
            <h3 className="mt-2 font-display text-display-sm text-ll-ink">{s.title}</h3>
            <p className="mt-1.5 text-sm text-ll-warm-gray">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

function NannyPreview() {
  // Teased sample cards — illustrative of the directory, not live data (signed-out view).
  const samples = [
    { name: 'Maya R.', years: '6 yrs', badges: ['CPR', 'Ages 0–2'] },
    { name: 'Jordan P.', years: '4 yrs', badges: ['First Aid', 'Pet-friendly'] },
    { name: 'Sofia L.', years: '9 yrs', badges: ['CPR', 'Ages 8–12'] },
  ]
  return (
    <section className="bg-ll-cream-dark/30 py-16 lg:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="eyebrow text-center">Meet the network</p>
        <h2 className="mt-2 text-center font-display text-display-lg text-ll-ink">
          The kind of nanny you’d recommend to a friend
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {samples.map((n) => (
            <article
              key={n.name}
              className="rounded-ll-card border-1.5 border-ll-peri-soft bg-ll-cream p-5 shadow-soft"
            >
              <div className="grid h-16 w-16 place-items-center rounded-full border-1.5 border-ll-sage bg-ll-sage-light">
                <LambMark className="h-9 w-9" />
              </div>
              <p className="mt-3 font-display text-display-sm text-ll-ink">{n.name}</p>
              <p className="font-mono text-mono-sm text-ll-warm-gray">{n.years} experience</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {n.badges.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1 rounded-full border-1.5 border-ll-peri-soft bg-ll-peri-light px-2.5 py-0.5 font-mono text-mono-sm font-medium text-ll-peri-deep"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-ll-warm-gray">
          Profiles shown are illustrative. Approved families see the full, live network.
        </p>
      </div>
    </section>
  )
}

function BottomCTA() {
  const reduced = useReducedMotion()
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 text-center sm:px-8">
      <h2 className="mx-auto max-w-2xl font-display text-display-lg text-ll-ink">
        Ready to find someone you trust with the people you love most?
      </h2>
      <motion.div
        className="mt-7 inline-block"
        whileHover={reduced ? undefined : { scale: 1.05 }}
        whileTap={reduced ? undefined : { scale: 0.95 }}
        transition={springSnappy}
      >
        <Link
          to="/apply"
          className="inline-flex h-12 items-center rounded-full bg-ll-terra-deep px-8 text-base font-medium text-white transition-colors hover:bg-ll-ink"
        >
          Get started
        </Link>
      </motion.div>
      <p className="mt-4 text-sm text-ll-warm-gray">
        Or{' '}
        <Link to="/for-families" className="text-ll-sage-mid underline-offset-4 hover:underline">
          learn how it works
        </Link>{' '}
        first.
      </p>
    </section>
  )
}

function TrustChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="trust-chip">
      <ShieldIcon />
      {children}
    </span>
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
