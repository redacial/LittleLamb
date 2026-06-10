import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-55 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-cream'

const variants: Record<Variant, string> = {
  primary: 'bg-sage-500 text-white hover:bg-sage-600 focus-visible:ring-sage-500',
  secondary:
    'bg-white text-charcoal ring-1 ring-inset ring-charcoal/15 hover:bg-cream-200 focus-visible:ring-sage-500',
  ghost: 'bg-transparent text-charcoal hover:bg-sage-50 focus-visible:ring-sage-500',
  danger: 'bg-terracotta-500 text-white hover:bg-terracotta-600 focus-visible:ring-terracotta-500',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-6 text-[0.95rem]',
  lg: 'h-[3.25rem] px-8 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, variants[variant], sizes[size], className)}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        />
      )}
      {children}
    </button>
  )
})
