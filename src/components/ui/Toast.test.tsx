// Toast — the app's shared success/status surface. Built because booking confirmation (and
// approve/reject, settings saves) succeeded SILENTLY: the modal closed and nothing said the
// action landed. A parent's single most important action — booking childcare — gave no feedback.
//
// The contract pinned here: toasts announce to assistive tech, stack, auto-dismiss on a timer,
// and can be dismissed by hand. useToast() outside a provider is a developer error, not a
// silent no-op.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ToastProvider } from './Toast'
import { useToast } from './toast-context'

/** A button that fires a toast of the given variant when clicked. */
function Emitter({ message, variant }: { message: string; variant?: 'success' | 'info' | 'error' }) {
  const toast = useToast()
  return <button onClick={() => toast.show(message, variant)}>emit</button>
}

describe('useToast', () => {
  it('throws a clear error when used outside a ToastProvider', () => {
    // A silent no-op would hide the wiring mistake; loud is better.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Emitter message="hi" />)).toThrow(/ToastProvider/)
    spy.mockRestore()
  })

  it('shows a message on demand, announced as a live region', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Emitter message="Booked — thank you!" />
      </ToastProvider>,
    )
    expect(screen.queryByText('Booked — thank you!')).toBeNull()
    await user.click(screen.getByText('emit'))
    const toast = await screen.findByText('Booked — thank you!')
    // The status container must be a polite live region so a screen reader announces it.
    const live = toast.closest('[role="status"]')
    expect(live).toBeTruthy()
  })

  it('stacks multiple toasts rather than replacing', async () => {
    const user = userEvent.setup()
    function Two() {
      const toast = useToast()
      return (
        <>
          <button onClick={() => toast.show('first')}>a</button>
          <button onClick={() => toast.show('second')}>b</button>
        </>
      )
    }
    render(
      <ToastProvider>
        <Two />
      </ToastProvider>,
    )
    await user.click(screen.getByText('a'))
    await user.click(screen.getByText('b'))
    expect(screen.getByText('first')).toBeTruthy()
    expect(screen.getByText('second')).toBeTruthy()
  })

  it('can be dismissed by hand before the timer fires', async () => {
    const user = userEvent.setup()
    render(
      <ToastProvider>
        <Emitter message="dismiss me" />
      </ToastProvider>,
    )
    await user.click(screen.getByText('emit'))
    expect(screen.getByText('dismiss me')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: /dismiss/i }))
    await waitFor(() => expect(screen.queryByText('dismiss me')).toBeNull())
  })
})

describe('useToast — auto-dismiss', () => {
  // Real timers here, not fake: the toast exit is a framer-motion animation driven by
  // requestAnimationFrame, which fake timers don't advance — so the node would linger in an
  // exit state and the assertion would fight the animation rather than the behaviour. A short
  // real timeout tests the same thing (timer fires → toast leaves) honestly. TIMEOUT is 5s in
  // the component; waitFor's default 1s isn't enough, so widen it.
  it('auto-dismisses after the timeout with no manual action', async () => {
    let show: (m: string) => void = () => {}
    function Capture() {
      show = useToast().show
      return null
    }
    render(
      <ToastProvider>
        <Capture />
      </ToastProvider>,
    )
    act(() => show('temporary'))
    expect(screen.getByText('temporary')).toBeTruthy()
    await waitFor(() => expect(screen.queryByText('temporary')).toBeNull(), { timeout: 7000 })
  }, 9000)
})
