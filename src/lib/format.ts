// Small display formatters shared across app screens.

export function formatDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, (m ?? 1) - 1, d ?? 1)
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatTimeRange(start: string, end: string): string {
  return `${to12h(start)}–${to12h(end)}`
}

export function to12h(hhmm: string): string {
  if (!hhmm) return ''
  const [h, m] = hhmm.split(':').map(Number)
  const period = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return m ? `${h12}:${String(m).padStart(2, '0')}${period}` : `${h12}${period}`
}

export function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

/**
 * A child's age from their "YYYY-MM-DD" birthday, as whole years + trailing months. Returns null
 * for an empty or unparseable birthday. Kids are stored by birthday (partner meeting 2026-09) so
 * their age stays current without anyone editing it.
 *
 * The month count is calendar-correct: it only ticks over once the day-of-month is reached, so the
 * day before a birthday is still "N-1 years, 11 months", never rounded up.
 */
export function ageFromBirthday(
  birthday: string,
  now: Date = new Date(),
): { years: number; months: number } | null {
  if (!birthday) return null
  const [by, bm, bd] = birthday.split('-').map(Number)
  if (!by || !bm || !bd) return null

  let years = now.getFullYear() - by
  let months = now.getMonth() + 1 - bm
  // Not yet to the birth day-of-month this month → the current month hasn't completed.
  if (now.getDate() < bd) months -= 1
  if (months < 0) {
    years -= 1
    months += 12
  }
  if (years < 0) return null
  return { years, months }
}

/** Human-readable age: "5 mos", "3 yrs", "4 yrs 2 mos", "1 yr 1 mo". Empty for no birthday. */
export function formatAge(birthday: string, now: Date = new Date()): string {
  const age = ageFromBirthday(birthday, now)
  if (!age) return ''
  const { years, months } = age
  const y = years > 0 ? `${years} ${years === 1 ? 'yr' : 'yrs'}` : ''
  // Show months when under a year (including 0, so a newborn never renders blank) or as the
  // trailing part of an older child's age.
  const showMonths = years === 0 || months > 0
  const m = showMonths ? `${months} ${months === 1 ? 'mo' : 'mos'}` : ''
  return [y, m].filter(Boolean).join(' ')
}
