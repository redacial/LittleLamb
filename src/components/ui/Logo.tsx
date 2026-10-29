import { cn } from '../../lib/cn'

/** Brand artwork colourways, exported from the brand kit into public/brand/ (transparent PNGs). */
export type LogoTone = 'sage' | 'terra' | 'ink' | 'white'

interface LogoProps {
  className?: string
  /**
   * @deprecated The handwritten wordmark already reads "Little Lamb Nannies", so there is no
   * separate subline any more. Still accepted so existing call sites keep compiling.
   */
  withSubline?: boolean
  /** Show the sleeping-lamb drawing beside the wordmark. */
  mark?: boolean
  tone?: LogoTone
  /**
   * sm fits the 16rem app sidebar (about 213px wide); md is the marketing nav; lg is for
   * footers and holding pages where the logo is the main visual.
   */
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: { mark: 'h-7 w-[3.35rem]', word: 'h-[1.15rem]' },
  md: { mark: 'h-9 w-[4.3rem]', word: 'h-6' },
  lg: { mark: 'h-12 w-[5.7rem]', word: 'h-8' },
} as const

/** Little Lamb Nannies logo: the sleeping-lamb line drawing plus the handwritten wordmark. */
export function Logo({ className, mark = true, tone = 'sage', size = 'sm' }: LogoProps) {
  const s = SIZES[size]
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      {mark && <LambMark tone={tone} className={s.mark} />}
      <img
        src={`/brand/wordmark-${tone}.png`}
        alt="Little Lamb Nannies"
        width={805}
        height={96}
        decoding="async"
        className={cn('w-auto', s.word)}
      />
    </span>
  )
}

/**
 * The sleeping lamb on its own, for decorative use. The artwork is wide (about 1.9:1), so it is
 * contained, not stretched, inside whatever box the caller sizes.
 */
export function LambMark({ className, tone = 'sage' }: { className?: string; tone?: LogoTone }) {
  return (
    <img
      src={`/brand/lamb-${tone}.png`}
      alt=""
      aria-hidden
      width={720}
      height={378}
      decoding="async"
      className={cn('object-contain', className)}
    />
  )
}
