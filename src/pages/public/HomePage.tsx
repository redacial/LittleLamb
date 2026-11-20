import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { PublicShell } from './PublicShell'
import { LambMark } from '../../components/ui'
import {
  DrawnUnderline,
  FloatLoop,
  StickyNote,
  CheckDoodle,
  ArrowDoodle,
  HeartDoodle,
  type NoteTone,
} from '../../components/theme'
import { useButtonHover } from '../../lib/motion'
import { cn } from '../../lib/cn'

/**
 * Marketing homepage (signed-out) — the sticky-note design (D77), served at littlelambnannies.com.
 * Paper background, taped notes, handwriting, warm brand bands. The story: two kinds of help
 * (last-minute + ongoing), how it honestly works, who we are, then the CTA.
 *
 * LEGAL: Little Lamb is a job-LISTING service, not an agency. Every claim here maps to what the
 * product does and the business-plan copy rules — families post/browse/book/pay directly; sitters
 * self-report credentials; NO "vetted / screened / interviewed-by-us / verified / matched"
 * language; motto "It takes a village. Find yours."; pricing shown is first-two-free then
 * $150/year. Each CTA goes into the live app (/apply, /apply?role=nanny), never a waitlist modal.
 */
export function HomePage() {
  return (
    <PublicShell>
      <Hero />
      <TwoKindsOfCare />
      <HowItWorks />
      <ForSitters />
      <WhoWeAre />
      <BottomCTA />
    </PublicShell>
  )
}

/* ------------------------------------------------------------------ Shared bits */

function PrimaryButton({ to, children }: { to: string; children: ReactNode }) {
  const btnHover = useButtonHover()
  return (
    <motion.div {...btnHover} className="inline-block">
      <Link
        to={to}
        className="inline-flex h-12 items-center rounded-full bg-ll-brand-terra-ink px-7 text-base font-medium text-white shadow-[-4px_4px_0_0_rgba(169,87,58,0.25)] transition-colors hover:bg-ll-ink"
      >
        {children}
      </Link>
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

/* ------------------------------------------------------------------------- Hero */

function Hero() {
  return (
    // Solid brand sage, like the brand kit's sage logo card. Body text is ink here: warm-gray and
    // white both fail AA on this sage (ink is 6.0:1).
    <section className="relative overflow-hidden bg-ll-brand-sage">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-12 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28 lg:pt-20">
        <div>
          <p className="inline-flex -rotate-2 items-center gap-2 rounded-full bg-ll-paper px-4 py-1.5 font-display text-xl leading-none text-ll-brand-sage-ink">
            <HeartDoodle className="h-4 w-4" />
            Santa Barbara · opening January 2027
          </p>
          <h1 className="mt-5 font-display text-[clamp(3rem,8vw,5rem)] leading-[0.9] text-ll-ink">
            Care you can trust, <DrawnUnderline tone="terra">tonight</DrawnUnderline> or every
            Tuesday.
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ll-ink">
            Little Lamb is a local board where Santa Barbara families and sitters find each other.
            Post a job, browse profiles, and book directly. When a sitter cancels at five o’clock,
            post it and every local sitter can see it. When you want the same caring face each week,
            find your person and book them again.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <PrimaryButton to="/apply">Find a sitter</PrimaryButton>
            <Link
              to="/apply?role=nanny"
              className="inline-flex items-center gap-1 font-display text-2xl leading-none text-ll-ink hover:underline"
            >
              I’m a sitter <ArrowDoodle className="h-5 w-8" />
            </Link>
          </div>
          <p className="mt-5 text-sm text-ll-ink">Your first two bookings are free. No commitment.</p>
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
          <LambMark className="w-[78%]" />
        </div>
      </FloatLoop>

      {/* These three lines are the whole pitch in miniature. Each is true of the product:
          short-notice posts go to the whole board, you choose and book your own sitter, and
          weekly recurring bookings exist. No vetting/agency claim. */}
      <StickyNote tone="butter" rotate={-5} className="absolute -left-2 top-0 w-44 !p-4 sm:-left-8 sm:w-48">
        <p className="font-display text-[1.45rem] leading-[1.05]">Sitter cancelled at 5? Post it. The whole board sees it.</p>
      </StickyNote>
      <StickyNote tone="blush" rotate={4} className="absolute -right-1 top-1/3 w-40 !p-4 sm:-right-6 sm:w-44">
        <p className="font-display text-[1.45rem] leading-[1.05]">Same sitter, every week ♡</p>
      </StickyNote>
      <StickyNote tone="sage" rotate={-2} tape={false} className="absolute bottom-0 left-4 w-48 !p-4 sm:left-0">
        <p className="font-display text-[1.45rem] leading-[1.05]">You choose and book your own sitter</p>
      </StickyNote>
    </div>
  )
}

/* ------------------------------------------------------------- Two kinds of care */

function TwoKindsOfCare() {
  return (
    <section id="care" className="scroll-mt-20 bg-ll-sand py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionTitle kicker="two kinds of help" center>
          One local board, whenever you need it
        </SectionTitle>

        <div className="mt-14 grid gap-12 md:grid-cols-2 md:gap-10">
          {/* Last-minute: same-day and short-notice requests post to the job board as 'open', and
              the first sitter to claim one gets it (useBookings.ts routeBooking + assignNanny). */}
          <StickyNote tone="butter" rotate={-1.5} as="article" className="md:mt-6">
            <p className="font-display text-2xl leading-none text-ll-brand-terra-ink">Last-minute care</p>
            <h3 className="mt-2 font-display text-[2.6rem] leading-[0.95]">When plans fall apart</h3>
            <p className="mt-4 leading-relaxed text-ll-warm-gray">
              A sick day, a cancelled sitter, a meeting that runs late. Post a same-day or next-day
              request and it goes to local sitters at once. The first one who is free can claim it,
              and you’ll know you’re covered.
            </p>
            <Checklist
              items={[
                'Same-day and short-notice requests',
                'Seen by the whole board, not just one person',
                'You pay the sitter directly',
              ]}
            />
          </StickyNote>

          {/* Ongoing: book inside a sitter's posted hours, tick "repeat weekly" (recurring.ts),
              free cancellation up to 24h before (bookingRules.ts FREE_CANCEL_HOURS). */}
          <StickyNote tone="sage" rotate={1.5} as="article">
            <p className="font-display text-2xl leading-none text-ll-brand-sage-ink">Ongoing care</p>
            <h3 className="mt-2 font-display text-[2.6rem] leading-[0.95]">When you want a familiar face</h3>
            <p className="mt-4 leading-relaxed text-ll-warm-gray">
              After-school pickups, a standing date night, a regular weekday. Get to know sitters
              through their profiles and intro videos, book inside the hours they’ve set, and make
              it repeat every week.
            </p>
            <Checklist
              items={[
                'Weekly bookings with the same sitter',
                'See availability before you book',
                'Free to cancel up to 24 hours ahead',
              ]}
            />
          </StickyNote>
        </div>

        <div className="mt-14 text-center">
          <PrimaryButton to="/apply">Find a sitter</PrimaryButton>
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------ How it works */

function HowItWorks() {
  // A real sequence, so the handwritten numbers carry information. LEGAL: this is the listing-
  // service flow — families post/browse/choose/pay, Little Lamb does not vet, match, or verify.
  const steps: { n: string; title: string; body: string; tone: NoteTone; rotate: number }[] = [
    {
      n: '1',
      title: 'Post what you need',
      body: 'Tell us the dates, hours, and any details — a date night, after-school help, or a last-minute fill-in.',
      tone: 'blush',
      rotate: -2,
    },
    {
      n: '2',
      title: 'Browse and choose',
      body: 'See sitter profiles, self-reported credentials, and intro videos from people near you. You interview and choose.',
      tone: 'butter',
      rotate: 1.5,
    },
    {
      n: '3',
      title: 'Book and pay directly',
      body: 'Book inside a sitter’s hours or post to the whole board. You pay the sitter directly — no money passes through Little Lamb.',
      tone: 'sage',
      rotate: -1,
    },
  ]
  return (
    <section id="how" className="scroll-mt-20 bg-ll-paper py-20 lg:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <SectionTitle kicker="how it works" center>
          Three small steps
        </SectionTitle>
        <p className="mx-auto mt-3 max-w-xl text-center text-lg leading-relaxed text-ll-warm-gray">
          Little Lamb is a local board that helps you find each other — you choose, interview, and
          hire your own sitter.
        </p>
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

/* --------------------------------------------------------------------- For sitters */

function ForSitters() {
  return (
    <section id="sitters" className="scroll-mt-20 bg-ll-sage-wash py-20 lg:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2">
        <div className="order-2 lg:order-1">
          <StickyNote tone="blush" rotate={-1.5} as="article" className="mx-auto max-w-md">
            <p className="font-display text-2xl leading-none text-ll-brand-terra-ink">a note for sitters</p>
            {/* All true today: availability gates auto-confirm, the job board is open to every
                sitter, and sitters are never billed (wages are paid privately). */}
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
          <SectionTitle kicker="for sitters">
            Steady families, on <DrawnUnderline tone="sage">your</DrawnUnderline> schedule
          </SectionTitle>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ll-warm-gray">
            Love caring for kids? Anyone in the Santa Barbara area can join. Build a profile, set
            your hours, and let local families find and book you — the work fits around your life.
          </p>
          <div className="mt-8">
            <PrimaryButton to="/apply?role=nanny">Join as a sitter</PrimaryButton>
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
        <LambMark className="mx-auto mb-5 h-16 w-32" />
        <SectionTitle kicker="who we are" center>
          Started at Westmont, rooted in Santa Barbara
        </SectionTitle>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-ll-warm-gray">
          Little Lamb was founded by Lucy Behringer, a Westmont senior, as a simpler alternative to
          the group chats families and sitters juggle to find each other. We built a local board so
          finding someone for your kids doesn’t depend on who you happen to know.
        </p>
        <p className="mx-auto mt-8 inline-block rotate-1 rounded-2xl bg-ll-note-butter px-5 py-3 font-display text-2xl leading-tight text-ll-ink">
          10% of what we earn goes to Santa Barbara foster care and childcare groups.
        </p>
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------------- Bottom CTA */

function BottomCTA() {
  return (
    <section className="bg-ll-brand-terra py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-8">
        <StickyNote tone="butter" rotate={-1} as="div" className="text-center sm:!p-12">
          <h2 className="font-display text-[clamp(2.6rem,6vw,3.6rem)] leading-[0.95] text-ll-ink">
            It takes a village. Find yours.
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-ll-warm-gray">
            Join Little Lamb and find a local sitter you can book tonight or every week. Your first
            two bookings are free.
          </p>
          <div className="mt-8">
            <PrimaryButton to="/apply">Get started</PrimaryButton>
          </div>
          <p className="mt-5 text-sm text-ll-warm-gray">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-medium text-ll-brand-sage-ink underline underline-offset-4 hover:no-underline"
            >
              Log in
            </Link>
            .
          </p>
        </StickyNote>
      </div>
    </section>
  )
}
