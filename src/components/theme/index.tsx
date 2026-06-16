/**
 * Demo-theme primitives — the reusable building blocks of the "Premium Playful,
 * alive-on-hover" direction (see DEMO_THEME.md). Write once, reuse across every
 * surface. Every motion path honors prefers-reduced-motion.
 */
import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { springSnappy } from '../../lib/motion'
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
