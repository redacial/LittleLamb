/**
 * Demo-theme primitives — the reusable building blocks of the "Premium Playful,
 * alive-on-hover" direction (see DEMO_THEME.md). Write once, reuse across every
 * surface. Every motion path honors prefers-reduced-motion.
 */
import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { springSnappy, useTiltHover } from '../../lib/motion'
import { cn } from '../../lib/cn'

/* ------------------------------------------------------------------ Grain --- */
/**
 * Fixed grain/noise overlay for cream marketing surfaces. ~3.5% opacity SVG
 * turbulence — the print-feel "premium" lever. Pointer-events none, decorative.
 */
export function Grain({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 -z-10 opacity-[0.04]', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
      }}
    />
  )
}

/* ------------------------------------------------------------------- Blob --- */
type BlobTone = 'sage' | 'peri' | 'terra'
const blobFill: Record<BlobTone, string> = {
  sage: 'bg-ll-sage-light',
  peri: 'bg-ll-peri-light',
  terra: 'bg-ll-terra-light',
}
/**
 * Blurred organic backdrop blob that drifts slowly. Decorative; sits behind
 * content. Use 1-2 per hero, offset positions, never more.
 */
export function Blob({
  tone = 'sage',
  className,
  drift = true,
}: {
  tone?: BlobTone
  className?: string
  drift?: boolean
}) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute -z-10 rounded-full blur-3xl opacity-60',
        blobFill[tone],
        drift && 'motion-safe:animate-drift',
        className,
      )}
    />
  )
}

/* --------------------------------------------------------- DrawnUnderline --- */
/**
 * Hand-drawn wobbly underline that draws itself in under a keyword on mount.
 * Wrap one keyword per hero. Pure CSS keyframe path-draw via stroke-dashoffset
 * so it commits its end state even if JS stalls; disabled under reduced motion.
 */
export function DrawnUnderline({
  children,
  className,
  tone = 'terra',
}: {
  children: ReactNode
  className?: string
  tone?: BlobTone
}) {
  const stroke =
    tone === 'sage' ? 'var(--ll-sage)' : tone === 'peri' ? 'var(--ll-peri)' : 'var(--ll-terra)'
  return (
    <span className={cn('relative inline-block whitespace-nowrap', className)}>
      {children}
      <svg
        aria-hidden
        viewBox="0 0 200 16"
        preserveAspectRatio="none"
        className="absolute -bottom-2 left-0 h-3 w-full overflow-visible"
      >
        <path
          d="M3 9 C 40 3, 70 14, 100 8 S 160 3, 197 10"
          fill="none"
          stroke={stroke}
          strokeWidth="4"
          strokeLinecap="round"
          className="ll-draw"
        />
      </svg>
    </span>
  )
}

/* ------------------------------------------------------------ StickerBadge --- */
/**
 * Tilted credential pill that overlaps an illustration/photo edge, pops in late
 * with overshoot, then bobs slowly. The recurring trust motif. DM Mono.
 */
export function StickerBadge({
  children,
  tone = 'peri',
  rotate = 3,
  delay = 0,
  className,
}: {
  children: ReactNode
  tone?: BlobTone
  rotate?: number
  delay?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  const palette: Record<BlobTone, string> = {
    peri: 'border-ll-peri bg-ll-peri-light text-ll-peri-ink shadow-pop-peri',
    sage: 'border-ll-sage bg-ll-sage-light text-ll-sage-deep shadow-pop-sage',
    terra: 'border-ll-terra-soft bg-ll-terra-soft text-ll-ink shadow-pop-terra',
  }
  return (
    <motion.span
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: rotate + 8 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, scale: 1, rotate }}
      transition={reduced ? { duration: 0.2, delay } : { ...springSnappy, delay }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border-1.5 px-3 py-1 font-mono text-mono-sm font-medium',
        palette[tone],
        !reduced && 'motion-safe:animate-bob',
        className,
      )}
      style={{ animationDelay: `${delay + 0.6}s` }}
    >
      {children}
    </motion.span>
  )
}

/* --------------------------------------------------------------- FloatLoop --- */
/** Wraps decorative content in a slow async bob loop. Reduced-motion safe. */
export function FloatLoop({
  children,
  speed = 'normal',
  className,
}: {
  children: ReactNode
  speed?: 'normal' | 'slow'
  className?: string
}) {
  return (
    <div
      className={cn(
        speed === 'slow' ? 'motion-safe:animate-bob-slow' : 'motion-safe:animate-bob',
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ----------------------------------------------------------------- Sparkle --- */
/** Tiny hand-drawn doodle accent (sparkle / star) placed off-grid for warmth. */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('h-5 w-5', className)} fill="none" aria-hidden>
      <path
        d="M12 2c.6 4.5 2.9 6.8 7.4 7.4-4.5.6-6.8 2.9-7.4 7.4-.6-4.5-2.9-6.8-7.4-7.4C9.1 8.8 11.4 6.5 12 2z"
        fill="currentColor"
        opacity="0.85"
      />
    </svg>
  )
}

/* -------------------------------------------------------------- StickyNote --- */
export type NoteTone = 'butter' | 'sage' | 'blush'
const NOTE_BG: Record<NoteTone, string> = {
  butter: 'bg-ll-note-butter',
  sage: 'bg-ll-note-sage',
  blush: 'bg-ll-note-blush',
}

/**
 * A taped paper note — the signature surface of the sticky-note design system (D76).
 * `rotate` is a resting tilt; the note straightens a little on hover (useTiltHover).
 * `tape` adds the washi-tape strip across the top edge. Render as div/li/article via `as`.
 */
export function StickyNote({
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

/* ------------------------------------------------------------------ Doodles --- */
/** Hand-drawn check — used in checklists and the "how it works" steps. */
export function CheckDoodle({ className }: { className?: string }) {
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

/** Hand-drawn arrow — a playful "this way" pointer beside secondary links. */
export function ArrowDoodle({ className }: { className?: string }) {
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

/** Hand-drawn heart — a warm accent on eyebrow kickers and note lines. */
export function HeartDoodle({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 20.5c-.4 0-7.9-4.6-8.9-9.6C2.4 7.4 4.6 4.5 7.6 4.5c2 0 3.4 1.2 4.4 2.7 1-1.5 2.4-2.7 4.4-2.7 3 0 5.2 2.9 4.5 6.4-1 5-8.5 9.6-8.9 9.6z" />
    </svg>
  )
}
