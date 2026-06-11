import { useState } from 'react'
import { cn } from '../lib/cn'

/** Lightweight tab strip used by admin Billing/Analytics. Active tab uses sage styling. */
export function Tabs({ tabs, children }: { tabs: string[]; children: (active: string) => React.ReactNode }) {
  const [active, setActive] = useState(tabs[0])
  return (
    <div>
      <div role="tablist" className="mb-5 flex flex-wrap gap-1 border-b border-ll-ink/10">
        {tabs.map((t) => {
          const selected = active === t
          return (
            <button
              key={t}
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(t)}
              className={cn(
                'border-b-2 px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ll-sage focus-visible:ring-offset-2 focus-visible:ring-offset-ll-cream',
                selected
                  ? 'border-ll-sage text-ll-ink'
                  : 'border-transparent text-ll-warm-gray hover:text-ll-ink',
              )}
            >
              {t}
            </button>
          )
        })}
      </div>
      {children(active)}
    </div>
  )
}
