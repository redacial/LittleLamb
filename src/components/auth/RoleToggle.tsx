import { cn } from '../../lib/cn'

type SignupRole = 'family' | 'nanny'

interface RoleToggleProps {
  value: SignupRole
  onChange: (role: SignupRole) => void
}

/** "I am a Family / I am a Nanny" segmented control from the login/signup spec. */
export function RoleToggle({ value, onChange }: RoleToggleProps) {
  return (
    <div
      role="radiogroup"
      aria-label="I am a"
      className="grid grid-cols-2 gap-1 rounded-full bg-cream-200 p-1"
    >
      {(['family', 'nanny'] as const).map((role) => {
        const active = value === role
        return (
          <button
            key={role}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(role)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-bold transition-colors',
              active ? 'bg-white text-charcoal shadow-soft' : 'text-charcoal-muted hover:text-charcoal',
            )}
          >
            {role === 'family' ? "I'm a Family" : "I'm a Nanny"}
          </button>
        )
      })}
    </div>
  )
}

export type { SignupRole }
