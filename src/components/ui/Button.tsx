import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { springSnappy } from '../../lib/motion'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

// Omit the handful of DOM event handlers whose signatures clash with framer-motion's
// gesture props (drag/animation) so native button attributes spread cleanly onto motion.button.
type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'onDrag' | 'onDragStart' | 'onDragEnd' | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
>

interface ButtonProps extends NativeButtonProps {
  variant?: Variant
  size?: Size
  loading?: boolean
}

// Pill buttons, chunky 1.5px borders, spring scale on hover/tap. DESIGN_SYSTEM.md §Buttons.
const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-55 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ll-cream'

// Resting backgrounds are chosen so white/ink text clears WCAG AA 4.5:1 (DESIGN_SYSTEM.md
// "WCAG AA minimum on all color combinations"): white-on-ll-terra is only 2.67:1, so the
// primary CTA rests on ll-terra-deep (4.64:1); the secondary uses ll-sage-deep on
// ll-sage-light (5.27:1) rather than on ll-sage (3.11:1).
const variants: Record<Variant, string> = {
  // Primary CTA → terra-deep (AA-safe with white text)
  primary: 'bg-ll-terra-deep text-white hover:bg-ll-ink focus-visible:ring-ll-terra-deep',
  // Secondary → sage-light ground with deep-sage text
  secondary:
    'bg-ll-sage-light text-ll-sage-deep hover:bg-ll-sage hover:text-ll-sage-deep focus-visible:ring-ll-sage-mid',
  // Ghost → outlined ink
  ghost:
    'bg-transparent text-ll-ink border-1.5 border-ll-ink hover:bg-ll-cream-dark focus-visible:ring-ll-sage-mid',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
}

const sizes: Record<Size, string> = {
  // Min 44px tap target on md/lg per WCAG (DESIGN_SYSTEM.md §Buttons)
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-[0.95rem]',
  lg: 'h-[3.25rem] px-8 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...rest },
  ref,
) {
  const prefersReduced = useReducedMotion()
  const isDisabled = disabled || loading
  const hover =
    prefersReduced || isDisabled
      ? {}
      : { whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 }, transition: springSnappy }

  return (
    <motion.button
      ref={ref}
      disabled={isDisabled}
      className={cn(base, variants[variant], sizes[size], className)}
      {...hover}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </motion.button>
  )
})
