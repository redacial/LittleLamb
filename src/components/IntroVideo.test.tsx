import { describe, it, expect, beforeAll, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { IntroVideo } from './IntroVideo'

// The whole point of this component is to honour the "hear her voice while you read" intent
// WITHOUT breaking WCAG 1.4.2: it must open MUTED (no auto-sound), keep the native controls so
// pause/volume are always reachable, and turn sound on only from an explicit, labelled tap.
// These tests pin exactly that contract — the accessible-but-still-warm behaviour is the feature.

beforeAll(() => {
  // jsdom has no media stack; play() is undefined and would throw.
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  })
})

function getVideo() {
  // The video carries an aria-label but no ARIA role jsdom exposes by default; query the element.
  return document.querySelector('video') as HTMLVideoElement
}

describe('IntroVideo', () => {
  it('opens muted, autoplaying, looping, with native controls visible', () => {
    render(<IntroVideo src="https://x.test/v.mp4" name="Maya Brooks" />)
    const v = getVideo()
    expect(v).toBeTruthy()
    expect(v.muted).toBe(true)
    expect(v.autoplay).toBe(true)
    expect(v.loop).toBe(true)
    expect(v.controls).toBe(true)
  })

  it('offers a labelled, first-name unmute control while muted', () => {
    render(<IntroVideo src="https://x.test/v.mp4" name="Maya Brooks" />)
    expect(screen.getByRole('button', { name: /tap to hear maya/i })).toBeInTheDocument()
    expect(screen.getByText(/playing on mute/i)).toBeInTheDocument()
  })

  it('unmutes from the beginning on tap, then retires the control', () => {
    render(<IntroVideo src="https://x.test/v.mp4" name="Maya Brooks" />)
    const v = getVideo()
    v.currentTime = 12 // pretend the muted loop had been running

    fireEvent.click(screen.getByRole('button', { name: /tap to hear maya/i }))

    expect(v.muted).toBe(false)
    expect(v.currentTime).toBe(0)
    expect(screen.queryByRole('button', { name: /tap to hear maya/i })).not.toBeInTheDocument()
    expect(screen.getByText(/you’re hearing maya/i)).toBeInTheDocument()
  })
})
