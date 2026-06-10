import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'article' | 'section'
  inset?: boolean
}

export function Card({ as: Tag = 'div', inset = true, className, children, ...rest }: CardProps) {
  return (
    <Tag
      className={cn(
        'rounded-2xl bg-white shadow-soft ring-1 ring-charcoal/[0.06]',
        inset && 'p-5 sm:p-6',
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function CardLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('eyebrow mb-1', className)}>{children}</p>
}
