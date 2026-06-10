import type { IconKey } from './nav'

const PATHS: Record<IconKey, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  calendar: 'M4 6h16v15H4zM4 9h16M8 3v4M16 3v4',
  bookings: 'M5 4h14v17l-7-4-7 4zM8 8h8M8 12h5',
  nannies: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0',
  profile: 'M12 12a4 4 0 100-8 4 4 0 000 8zM5 21a7 7 0 0114 0',
  billing: 'M3 7h18v12H3zM3 11h18M7 15h4',
  messages: 'M4 5h16v11H9l-4 4V16H4z',
  policies: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6',
  settings: 'M12 9a3 3 0 100 6 3 3 0 000-6zM4 12h2M18 12h2M12 4v2M12 18v2M6 6l1.5 1.5M16.5 16.5L18 18M18 6l-1.5 1.5M7.5 16.5L6 18',
  analytics: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  families: 'M9 11a3 3 0 100-6 3 3 0 000 6zM3 20a6 6 0 0112 0M17 11a3 3 0 100-6M15 14a6 6 0 016 6',
}

export function Icon({ name, className = 'h-5 w-5' }: { name: IconKey; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
