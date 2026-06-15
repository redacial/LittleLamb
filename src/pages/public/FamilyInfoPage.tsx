import { Link } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { PublicShell } from './PublicShell'
import { LambMark } from '../../components/ui'
import { springStandard } from '../../lib/motion'

/**
 * "/for-families" intermediate info page (CLAUDE.md §1.2). Reached from the homepage
 * "Get started" path. Explains the platform, the vetting promise, and what's included
 * before sending families into /apply. Lighter on motion than the homepage — this is a
 * content page — but it reuses the signature trust-chip / DM Mono credential motif.
 */
export function FamilyInfoPage() {
  return (
    <PublicShell>
      <Hero />
      <VettingPromise />
      <Included />
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
        For families
      </motion.p>
      <motion.h1
        {...rise(0.05)}
        className="mt-3 font-display text-display-xl leading-[0.95] text-ll-ink"
      >
        How Little Lamb
        <br />
        works for families
      </motion.h1>
      <motion.p {...rise(0.12)} className="mx-auto mt-5 max-w-xl text-body-lg text-ll-warm-gray">
        Finding childcare you trust shouldn’t mean gambling on a stranger. Every nanny in our
        Santa Barbara network is background-checked and personally interviewed before they ever
        appear on your screen. Here’s exactly how it works.
      </motion.p>
      <motion.div {...rise(0.18)} className="mt-8 flex flex-wrap justify-center gap-2.5">
        <TrustChip>Background checked</TrustChip>
        <TrustChip>Personally interviewed</TrustChip>
      </motion.div>
    </section>
  )
}

/** The vetting promise, leaning on the Trust Signal Hierarchy: check → interview → live profile. */
function VettingPromise() {
  const steps = [
    {
      n: '01',
      title: 'Background check',
      body: 'Before anything else, every applicant clears a background check. No exceptions, no shortcuts — it happens offline, and only the outcome reaches the platform.',
    },
    {
      n: '02',
      title: 'A real interview',
      body: 'Our founders sit down with each nanny one-on-one. We’re looking for the warmth, judgment, and reliability you’d want in someone you’d recommend to a close friend.',
    },
    {
      n: '03',
      title: 'A live, honest profile',
      body: 'Only after both steps does a nanny go live — with a real photo, an honest bio, credential chips, and a one-minute intro video so you meet them before you book.',
    },
  ]
  return (
    <section className="border-y-1.5 border-ll-cream-dark bg-ll-cream-dark/30">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
        <p className="eyebrow text-center">Our vetting promise</p>
        <h2 className="mt-2 text-center font-display text-display-lg text-ll-ink">
          What makes us different
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-body-md text-ll-warm-gray">
          Trust isn’t a badge we hand out. It’s earned in this order, every single time.
        </p>
        <ol className="mt-10 grid gap-5 sm:grid-cols-3">
          {steps.map((s) => (
            <li
              key={s.n}
              className="rounded-ll-card border-1.5 border-ll-peri-soft bg-ll-cream p-6 shadow-soft"
            >
              <span className="font-mono text-mono-sm font-medium text-ll-peri-deep">{s.n}</span>
              <h3 className="mt-2 font-display text-display-sm text-ll-ink">{s.title}</h3>
              <p className="mt-1.5 text-sm text-ll-warm-gray">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

/** What's included vs. what isn't — sets honest expectations (CLAUDE.md Part 20: wages are direct). */
function Included() {
  const included = [
    'A vetted, interviewed network of local nannies',
    'Real profiles with photos, bios, badges, and intro videos',
    'Simple booking — pick a date, choose your nanny, confirm',
    'A team that handles the matching and the messaging',
  ]
  const notIncluded = [
    'Nanny wages — you pay your nanny directly (cash, Venmo, etc.)',
    'Time tracking or clock in / clock out — hours are between you and your nanny',
    'Hidden markups on what your nanny earns',
  ]
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-20">
      <p className="eyebrow text-center">What to expect</p>
      <h2 className="mt-2 text-center font-display text-display-lg text-ll-ink">
        What’s included — and what isn’t
      </h2>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="rounded-ll-card border-1.5 border-ll-sage bg-ll-sage-light/40 p-6">
          <h3 className="font-display text-display-sm text-ll-sage-deep">What you get</h3>
          <ul className="mt-3 space-y-2.5">
            {included.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-ll-warm-gray">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-ll-sage-deep" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-ll-card border-1.5 border-ll-cream-dark bg-ll-cream-dark/40 p-6">
          <h3 className="font-display text-display-sm text-ll-ink">Handled off-platform</h3>
          <ul className="mt-3 space-y-2.5">
            {notIncluded.map((item) => (
              <li key={item} className="flex gap-2.5 text-sm text-ll-warm-gray">
                <DotIcon className="mt-1.5 h-2 w-2 shrink-0 text-ll-terra-deep" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-ll-warm-gray">
        We handle the part that’s hard to do alone — finding someone you can trust. The wages
        stay simple and direct between you and your nanny.
      </p>
    </section>
  )
}

function BottomCTA() {
  return (
    <section className="border-t-1.5 border-ll-cream-dark bg-ll-cream-dark/30">
      <div className="mx-auto max-w-3xl px-5 py-16 text-center sm:px-8 lg:py-20">
        <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-full border-1.5 border-ll-sage bg-ll-sage-light">
          <LambMark className="h-11 w-11" />
        </div>
        <h2 className="mx-auto max-w-xl font-display text-display-lg text-ll-ink">
          Ready to meet your next sitter?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-body-md text-ll-warm-gray">
          Tell us a little about your family. We review every application before your account
          goes live.
        </p>
        <Link
          to="/apply"
          className="mt-7 inline-flex h-12 items-center rounded-full bg-ll-terra-deep px-8 text-base font-medium text-white transition-colors hover:bg-ll-ink"
        >
          Apply now
        </Link>
      </div>
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
