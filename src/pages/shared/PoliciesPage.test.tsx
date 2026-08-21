import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PoliciesPage } from './PoliciesPage'
import { DEFAULT_POLICIES, type Policies } from '../../lib/policies'

// Policies move from literal JSX to config/policies so Lucy can edit them without a
// developer. The risk that buys: a missing or malformed config doc silently blanking the
// page that tells families how cancellations and billing work. Every consumer must fall
// back PER FIELD to the shipped defaults, never render nothing.

const policies = { current: DEFAULT_POLICIES as Policies }

vi.mock('../../hooks/useAdmin', () => ({
  usePolicies: () => ({ policies: policies.current, loading: false, save: vi.fn() }),
}))

beforeEach(() => {
  policies.current = DEFAULT_POLICIES
})

/** First sentence of each default block — enough to prove the fallback rendered. */
const platformDefault = DEFAULT_POLICIES.platform.split('\n')[0]
const familyDefault = DEFAULT_POLICIES.family.split('\n')[0]
const nannyDefault = DEFAULT_POLICIES.nanny.split('\n')[0]

describe('PoliciesPage — admin-editable content', () => {
  it('renders the admin-configured policy text', () => {
    policies.current = {
      platform: 'Be kind to one another.',
      family: 'Families pay quarterly.',
      nanny: 'Keep availability current.',
    }

    render(<PoliciesPage role="family" />)

    expect(screen.getByText('Be kind to one another.')).toBeInTheDocument()
    expect(screen.getByText('Families pay quarterly.')).toBeInTheDocument()
  })

  it('splits newlines into separate paragraphs', () => {
    policies.current = { ...DEFAULT_POLICIES, platform: 'First rule.\nSecond rule.' }

    render(<PoliciesPage role="family" />)

    expect(screen.getByText('First rule.')).toBeInTheDocument()
    expect(screen.getByText('Second rule.')).toBeInTheDocument()
  })

  it('shows only the role-specific block, not the other role’s', () => {
    render(<PoliciesPage role="nanny" />)

    expect(screen.getByText(nannyDefault)).toBeInTheDocument()
    expect(screen.queryByText(familyDefault)).not.toBeInTheDocument()
  })

  it('does NOT render policy text as HTML — it is admin input on a page every user sees', () => {
    policies.current = { ...DEFAULT_POLICIES, platform: '<script>alert(1)</script><b>bold</b>' }

    const { container } = render(<PoliciesPage role="family" />)

    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('b')).toBeNull()
    expect(screen.getByText('<script>alert(1)</script><b>bold</b>')).toBeInTheDocument()
  })

  it('falls back to the shipped defaults when the whole config is empty', () => {
    // Simulates the doc being absent: usePolicies hands back defaults, so the page must
    // still be a complete policies page rather than three empty cards.
    render(<PoliciesPage role="family" />)

    expect(screen.getByText(platformDefault)).toBeInTheDocument()
    expect(screen.getByText(familyDefault)).toBeInTheDocument()
  })
})

// The per-field fallback lives in the hook's parser, and it is the part most likely to be
// got wrong (an `??` that accepts '' or a non-string). Exercising it directly rather than
// through onSnapshot keeps the assertion on the logic, not on a Firestore mock.
describe('parsePolicies — defensive per-field fallback', () => {
  it('returns the defaults when the doc is missing entirely', async () => {
    const { parsePolicies } = await import('../../lib/policies')
    expect(parsePolicies(undefined)).toEqual(DEFAULT_POLICIES)
  })

  it('falls back FIELD BY FIELD, keeping the fields that are valid', async () => {
    const { parsePolicies } = await import('../../lib/policies')

    const out = parsePolicies({ platform: 'Custom platform rules.', family: 42, nanny: null })

    expect(out.platform).toBe('Custom platform rules.')
    expect(out.family).toBe(DEFAULT_POLICIES.family)
    expect(out.nanny).toBe(DEFAULT_POLICIES.nanny)
  })

  it('treats an empty or whitespace-only string as unset', async () => {
    const { parsePolicies } = await import('../../lib/policies')

    const out = parsePolicies({ platform: '', family: '   ', nanny: DEFAULT_POLICIES.nanny })

    expect(out.platform).toBe(DEFAULT_POLICIES.platform)
    expect(out.family).toBe(DEFAULT_POLICIES.family)
  })

  it('survives a doc that is not an object at all', async () => {
    const { parsePolicies } = await import('../../lib/policies')

    expect(parsePolicies('nonsense')).toEqual(DEFAULT_POLICIES)
    expect(parsePolicies([])).toEqual(DEFAULT_POLICIES)
  })
})
