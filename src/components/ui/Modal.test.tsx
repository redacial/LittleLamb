// Modal accessibility. The panel set aria-modal="true" while doing none of the things that
// claim implies: no focus trap, no focus restoration, no autofocus into the panel, and no
// visible close control — the only dismissal affordance was a full-screen backdrop <button
// aria-label="Close"> announced BEFORE the dialog content. Keyboard and screen-reader users
// tabbed straight out into the inert page behind the dialog; on mobile (panel bottom-anchored)
// a touch user's only exit was a precise tap on a sliver of backdrop.
//
// This affects every modal in the app, so the contract is pinned here.
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'

/** A realistic host: a trigger button that opens the modal, so focus restoration is observable. */
function Host({ title = 'Confirm booking' }: { title?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open modal</button>
      <button>Behind the modal</button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <button>First action</button>
        <button>Second action</button>
      </Modal>
    </>
  )
}

/** The dialog's own close control — not the backdrop. */
function closeButton(): HTMLElement {
  const dialog = screen.getByRole('dialog')
  const panel = dialog.querySelector('[data-ll-modal-panel]')
  if (!panel) throw new Error('no modal panel found')
  const btn = panel.querySelector('button[aria-label="Close"], button[aria-label="Close dialog"]')
  if (!btn) throw new Error('no visible close button inside the modal panel')
  return btn as HTMLElement
}

describe('Modal — focus management', () => {
  it('moves focus into the panel when opened', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await user.click(screen.getByText('Open modal'))

    const dialog = screen.getByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('traps Tab inside the dialog — focus never reaches the page behind', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await user.click(screen.getByText('Open modal'))

    const dialog = screen.getByRole('dialog')
    const behind = screen.getByText('Behind the modal')
    const opener = screen.getByText('Open modal')

    // Tab well past the number of focusables in the panel; every stop must stay inside.
    for (let i = 0; i < 12; i++) {
      await user.tab()
      expect(document.activeElement).not.toBe(behind)
      expect(document.activeElement).not.toBe(opener)
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('traps Shift+Tab inside the dialog too', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await user.click(screen.getByText('Open modal'))

    const dialog = screen.getByRole('dialog')
    const behind = screen.getByText('Behind the modal')

    for (let i = 0; i < 12; i++) {
      await user.tab({ shift: true })
      expect(document.activeElement).not.toBe(behind)
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('restores focus to the trigger when closed', async () => {
    const user = userEvent.setup()
    render(<Host />)
    const opener = screen.getByText('Open modal')
    await user.click(opener)
    expect(document.activeElement).not.toBe(opener)

    await user.keyboard('{Escape}')
    // AnimatePresence plays an exit animation, so the dialog leaves the DOM asynchronously.
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(opener)
  })
})

describe('Modal — visible close control', () => {
  it('renders a close button inside the panel, not only the backdrop', () => {
    render(
      <Modal open onClose={vi.fn()} title="Confirm booking">
        <p>Body</p>
      </Modal>,
    )
    // Must exist inside the panel itself — a full-screen backdrop button is not a
    // discoverable affordance, especially on a bottom-anchored mobile sheet.
    expect(closeButton()).toBeTruthy()
  })

  it('close button is keyboard reachable and fires onClose', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open onClose={onClose} title="Confirm booking">
        <button>First action</button>
      </Modal>,
    )
    const btn = closeButton()
    btn.focus()
    expect(document.activeElement).toBe(btn)
    await user.keyboard('{Enter}')
    expect(onClose).toHaveBeenCalled()
  })

  it('the close button carries an accessible name', () => {
    render(
      <Modal open onClose={vi.fn()} title="Confirm booking">
        <p>Body</p>
      </Modal>,
    )
    expect(closeButton().getAttribute('aria-label')).toMatch(/close/i)
  })

  it('the backdrop is not announced as the first interactive element of the dialog', () => {
    render(
      <Modal open onClose={vi.fn()} title="Confirm booking">
        <button>First action</button>
      </Modal>,
    )
    // The backdrop should be inert to assistive tech (aria-hidden / presentational), so the
    // first thing a screen-reader user meets is the dialog's own content.
    const dialog = screen.getByRole('dialog')
    const firstButton = dialog.querySelector('button')
    expect(firstButton?.getAttribute('aria-label')).not.toBe('Close backdrop')
    // The backdrop element must not be a focus stop ahead of the panel.
    const backdrop = dialog.querySelector('[data-ll-modal-backdrop]')
    expect(backdrop).toBeTruthy()
    expect(backdrop?.getAttribute('tabindex')).toBe('-1')
  })
})
