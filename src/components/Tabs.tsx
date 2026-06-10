import { useState } from 'react'
import { cn } from '../lib/cn'

/** Lightweight tab strip used by admin Billing/Analytics. */
export function Tabs({ tabs, children }: { tabs: string[]; children: (active: string) => React.ReactNode }) {
  const [active, setActive] = useState(tabs[0])
  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-1 border-b border-charcoal/10">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActive(t)}
            className={cn(
              'border-b-2 px-4 py-2 text-sm font-bold transition-colors',
              active === t ? 'border-sage-500 text-charcoal' : 'border-transparent text-charcoal-muted hover:text-charcoal',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {children(active)}
    </div>
  )
}
