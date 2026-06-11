import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { PublicShell } from './PublicShell'
import { LambMark } from '../../components/ui'
import { springStandard } from '../../lib/motion'

/**
 * "/for-nannies" info page (CLAUDE.md §1.3 / nanny flow §1.2). Distinct from the family
 * page: it speaks to nannies about joining the network, walks through the application →
 * review → interview (Calendly) → decision path, and describes the platform once approved
 * (profile, availability, bookings — and never being charged). Sends them to /apply?role=nanny.
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

function Hero() {
  const reduced = useReducedMotion()
  const rise = (delay: number) =>
    reduced
      ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2, delay } }
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { ...springStandard, delay },
        }

  return (
    <section className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8 lg:py-24">
      <motion.p {...rise(0)} className="eyebrow">
        For nannies · Santa Barbara
      </motion.p>
      <motion.h1
        {...rise(0.05)}
        className="mt-3 font-display text-display-xl leading-[0.95] text-ll-ink"
      >
        Do work you love,
        <br />
        for families who value you
      </motion.h1>
      <motion.p {...rise(0.12)} className="mx-auto mt-5 max-w-xl text-body-lg text-ll-warm-gray">
        Little Lamb is a small, vetted network of Santa Barbara nannies. We bring you families
        who already trust the process, so you can focus on the kids — not on chasing leads or
        proving yourself from scratch.
      </motion.p>
      <motion.div {...rise(0.18)} className="mt-8 flex flex-wrap justify-center gap-2.5">
        <SageChip>★ Loved locally</SageChip>
        <SageChip>Never charged a fee</SageChip>
      </motion.div>
    </section>
  )
}

function Benefits() {
  const benefits = [
    {
      title: 'Families who already trust you',
      body: 'Because every nanny here is vetted, families arrive ready to book. The trust work is done before you ever meet — no awkward proving-yourself stage.',
    },
    {
      title: 'You set your own hours',
      body: 'Open the days and times that work for your life. Families can only book within the availability you choose. You’re never on the hook for hours you didn’t offer.',
    },
    {
      title: 'You are never charged',
      body: 'Joining and using Little Lamb is always free for nannies. No membership fees, no cut of your wages. Families pay you directly — we just handle the matching.',
    },
    {
      title: 'A profile that shows your best',
      body: 'A real photo, your bio, your credential badges, and a one-minute intro video let families meet the real you before they book.',
    },
  ]
  return (
    <section className="border-y-1.5 border-ll-cream-dark bg-ll-cream-dark/30">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <p className="eyebrow text-center">Why join</p>
        <h2 className="mt-2 text-center font-display text-display-lg text-ll-ink">
          The benefits of the network
        </h2>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {benefits.map((b) => (
            <article
              key={b.title}
              className="rounded-ll-card border-1.5 border-ll-sage-light bg-ll-cream p-6 shadow-soft"
            >
              <h3 className="font-display text-display-sm text-ll-ink">{b.title}</h3>
              <p className="mt-1.5 text-sm text-ll-warm-gray">{b.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

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
      body: 'Our founders read every application personally. We’ll keep you posted by email as your application moves through review.',
    },
    {
      n: '03',
      title: 'Interview',
      body: 'If it’s a fit, we’ll send a link to book a one-on-one interview at a time that works for you. It’s a real conversation, not a test.',
    },
    {
      n: '04',
      title: 'Decision',
      body: 'After the interview we make a decision and let you know. Once you’re approved, you set up your profile and you’re ready to be booked.',
    },
  ]
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
      <p className="eyebrow text-center">How approval works</p>
      <h2 className="mt-2 text-center font-display text-display-lg text-ll-ink">
        From application to your first booking
      </h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-body-md text-ll-warm-gray">
        We keep it personal and transparent. You’ll always know where you stand.
      </p>
      <ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s) => (
          <li
            key={s.n}
            className="rounded-ll-card border-1.5 border-ll-cream-dark bg-ll-cream-dark/40 p-6"
          >
            <span className="font-mono text-mono-sm font-medium text-ll-terra">{s.n}</span>
            <h3 className="mt-2 font-display text-display-sm text-ll-ink">{s.title}</h3>
            <p className="mt-1.5 text-sm text-ll-warm-gray">{s.body}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** What the platform is like once approved. */
function LifeOnPlatform() {
  const items = [
    { label: 'Your profile', body: 'Photo, bio, badges, and a one-minute intro that families see first.' },
    { label: 'Your availability', body: 'Set recurring weekly hours. Families only book inside the slots you open.' },
    { label: 'Your bookings', body: 'Accept requests that fit your schedule, or pick up open ones nearby.' },
    { label: 'Your pay', body: 'Families pay you directly. You’re never charged — keep what you earn.' },
  ]
  return (
    <section className="border-t-1.5 border-ll-cream-dark bg-ll-cream-dark/30">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <p className="eyebrow text-center">Once you’re in</p>
        <h2 className="mt-2 text-center font-display text-display-lg text-ll-ink">
          What the platform is like
        </h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it) => (
            <div
              key={it.label}
              className="rounded-ll-card border-1.5 border-ll-peri-soft bg-ll-cream p-5 shadow-soft"
            >
              <p className="font-mono text-mono-sm font-medium text-ll-peri-deep">{it.label}</p>
              <p className="mt-1.5 text-sm text-ll-warm-gray">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function BottomCTA() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8 lg:py-20">
      <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full border-1.5 border-ll-sage bg-ll-sage-light">
        <LambMark className="h-11 w-11" />
      </div>
      <h2 className="mx-auto max-w-xl font-display text-display-lg text-ll-ink">
        Ready to join the Santa Barbara network?
      </h2>
      <p className="mx-auto mt-3 max-w-md text-body-md text-ll-warm-gray">
        Apply in a few minutes. We review and interview every nanny personally before approval.
      </p>
      <Link
        to="/apply?role=nanny"
        className="mt-7 inline-flex h-12 items-center rounded-full bg-ll-terra px-8 text-base font-medium text-white transition-colors hover:bg-ll-terra-deep"
      >
        Apply now
      </Link>
    </section>
  )
}

function SageChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border-1.5 border-ll-sage bg-ll-sage-light px-2.5 py-1 font-mono text-mono-sm font-medium text-ll-sage-deep">
      {children}
    </span>
  )
}
