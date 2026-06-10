import { cn } from '../../lib/cn'

interface AvatarProps {
  name: string
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = { sm: 'h-9 w-9 text-sm', md: 'h-12 w-12 text-base', lg: 'h-20 w-20 text-xl' }

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover ring-1 ring-charcoal/10', sizes[size], className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        'grid place-items-center rounded-full bg-sage-100 font-display font-semibold text-sage-700 ring-1 ring-sage-300',
        sizes[size],
        className,
      )}
    >
      {initials(name) || '·'}
    </span>
  )
}
