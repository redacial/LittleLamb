// ChipGroup is the shared selection primitive for the Care.com-style onboarding: a row of
// pill chips a nanny taps to build their profile. It supports single-select (experience band)
// and multi-select (specialties, activities, …). These tests pin the selection behaviour and
// the accessibility contract (aria-pressed per chip), independent of any one step's wiring.
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChipGroup } from './ChipGroup'

const OPTS = [
  { id: 'a', label: 'Apple' },
  { id: 'b', label: 'Banana' },
  { id: 'c', label: 'Cherry' },
]

describe('ChipGroup — multi-select', () => {
  it('adds a tapped chip to the selection', async () => {
    const onChange = vi.fn()
    render(<ChipGroup options={OPTS} value={[]} onChange={onChange} multiple />)
    await userEvent.click(screen.getByRole('button', { name: 'Banana' }))
    expect(onChange).toHaveBeenCalledWith(['b'])
  })

  it('removes a chip that is already selected (toggle off)', async () => {
    const onChange = vi.fn()
    render(<ChipGroup options={OPTS} value={['a', 'b']} onChange={onChange} multiple />)
    await userEvent.click(screen.getByRole('button', { name: 'Apple' }))
    expect(onChange).toHaveBeenCalledWith(['b'])
  })

  it('marks selected chips with aria-pressed', () => {
    render(<ChipGroup options={OPTS} value={['c']} onChange={() => {}} multiple />)
    expect(screen.getByRole('button', { name: 'Cherry' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Apple' })).toHaveAttribute('aria-pressed', 'false')
  })
})

describe('ChipGroup — single-select', () => {
  it('replaces the selection rather than adding', async () => {
    const onChange = vi.fn()
    render(<ChipGroup options={OPTS} value={['a']} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cherry' }))
    expect(onChange).toHaveBeenCalledWith(['c'])
  })

  it('toggles the current one off when tapped again', async () => {
    const onChange = vi.fn()
    render(<ChipGroup options={OPTS} value={['a']} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Apple' }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
