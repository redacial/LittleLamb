// Spring physics for the Premium Playful design system.
// See DESIGN_SYSTEM.md §Motion & Spring Physics. Every interactive element uses
// spring physics — no linear/ease on user-facing interactions. Always pair with
// useReducedMotion() so reduced-motion users get instant opacity transitions only.
import { useReducedMotion, type Transition } from 'framer-motion'

// Standard spring — buttons, cards, chips
export const springStandard: Transition = {
  type: 'spring',
  stiffness: 280,
  damping: 18,
  mass: 1,
}

// Gentle spring — modals, drawers, page transitions
export const springGentle: Transition = {
  type: 'spring',
  stiffness: 180,
  damping: 20,
  mass: 1,
}

// Snappy spring — badges, confirmations, toasts, buttons
export const springSnappy: Transition = {
  type: 'spring',
  stiffness: 400,
  damping: 22,
  mass: 0.8,
}

const reducedTransition: Transition = { duration: 0.15 }

/**
 * Returns the requested spring, or a fast opacity-only transition when the user
 * prefers reduced motion. Use inside components for any framer-motion transition.
 */
export function useSpring(variant: 'standard' | 'gentle' | 'snappy' = 'standard'): Transition {
  const prefersReduced = useReducedMotion()
  if (prefersReduced) return reducedTransition
  return variant === 'gentle' ? springGentle : variant === 'snappy' ? springSnappy : springStandard
}

/**
 * Hover/tap props for cards and large elements. Returns empty object under
 * reduced motion so nothing scales/rotates.
 */
export function useCardHover() {
  const prefersReduced = useReducedMotion()
  if (prefersReduced) return {}
  return {
    whileHover: { scale: 1.03, rotate: 0.8 },
    whileTap: { scale: 0.97 },
    transition: springStandard,
  }
}

/**
 * Hover/tap props for buttons. Returns empty object under reduced motion.
 */
export function useButtonHover() {
  const prefersReduced = useReducedMotion()
  if (prefersReduced) return {}
  return {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
    transition: springSnappy,
  }
}

/**
 * Hover props for chips and badges. Returns empty object under reduced motion.
 */
export function useChipHover() {
  const prefersReduced = useReducedMotion()
  if (prefersReduced) return {}
  return {
    whileHover: { scale: 1.08 },
    transition: springSnappy,
  }
}

/** Standard mount fade/scale-in for cards and panels. */
export function useSpringIn() {
  const prefersReduced = useReducedMotion()
  if (prefersReduced) {
    return { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: reducedTransition }
  }
  return {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1 },
    transition: springStandard,
  }
}

export { useReducedMotion }
