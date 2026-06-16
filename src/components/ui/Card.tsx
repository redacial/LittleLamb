import type { HTMLAttributes } from 'react'
import { motion } from 'framer-motion'
import { useTiltHover } from '../../lib/motion'
import { cn } from '../../lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'article' | 'section'
  inset?: boolean
  /** Branded periwinkle/sage border for trust/marketing surfaces. */
  tone?: 'default' | 'sage' | 'peri'
  /** Adds the signature alive hover (lift + tilt + hard offset shadow). Clickable/marketing cards only. */
  interactive?: boolean
}

const toneBorder: Record<NonNullable<CardProps['tone']>, string> = {
  default: 'border-ll-cream-dark',
  sage: 'border-ll-sage-light',
  peri: 'border-ll-peri-soft',
}
// The pop (hard offset) shadow on hover is keyed to the card tone for cohesion.
const tonePop: Record<NonNullable<CardProps['tone']>, string> = {
  default: 'hover:shadow-pop',
  sage: 'hover:shadow-pop-sage',
  peri: 'hover:shadow-pop-peri',
}

// 20px radius, cream-dark surface, chunky 1.5px border, soft shadow. DESIGN_SYSTEM.md §Cards.
export function Card({
  as: Tag = 'div',
  inset = true,
  tone = 'default',
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) {
  const hover = useTiltHover()
  const classes = cn(
    'rounded-ll-card bg-ll-cream-dark border-1.5 shadow-soft',
    toneBorder[tone],
    interactive && cn('transition-shadow', tonePop[tone]),
    inset && 'p-5 sm:p-6',
    className,
  )

  if (interactive) {
    const MotionTag = motion[Tag]
    return (
      <MotionTag className={classes} {...hover} {...(rest as Record<string, unknown>)}>
        {children}
      </MotionTag>
    )
  }

  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  )
}

export function CardLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('eyebrow mb-1', className)}>{children}</p>
}
