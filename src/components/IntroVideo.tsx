import { useRef, useState } from 'react'

interface IntroVideoProps {
  src: string
  /** First name, for the labelled unmute control ("Tap to hear Maya"). */
  name: string
  className?: string
}

/**
 * A nanny's intro video, framed so a family hears her voice while they read — WITHOUT violating
 * WCAG 1.4.2 (Audio Control). The video autoplays MUTED and looping the moment the profile opens
 * (her face moving, a warm first impression), which browsers permit and which never forces audio
 * on a screen-reader user. Sound is opt-in: one tap on the clearly labelled control starts it from
 * the beginning — a user-initiated action, so it is not "autoplay" under 1.4.2 at all.
 *
 * The native controls stay on throughout, so pause/stop and volume-to-zero are always reachable
 * (1.4.2's mechanism requirement) independent of system volume.
 */
export function IntroVideo({ src, name, className }: IntroVideoProps) {
  const ref = useRef<HTMLVideoElement>(null)
  const [muted, setMuted] = useState(true)
  const firstName = name.trim().split(/\s+/)[0] || name

  function unmute() {
    const v = ref.current
    if (!v) return
    v.muted = false
    v.currentTime = 0 // hear the intro from its start, not mid-sentence
    setMuted(false)
    void v.play().catch(() => {
      /* If the browser blocks playback, the visible native controls still let her press play. */
    })
  }

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-ll-input bg-ll-ink/5">
        <video
          ref={ref}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          controls
          preload="metadata"
          className="w-full"
          aria-label={`${firstName}'s intro video`}
        />
        {muted && (
          <button
            type="button"
            onClick={unmute}
            className="absolute bottom-14 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-ll-terra px-4 py-2 font-semibold text-white shadow-soft transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ll-terra"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 2.1v2.1c3 .9 5 3.5 5 6.9s-2 6-5 6.9v2.1c4.1-.9 7-4.5 7-9s-2.9-8.1-7-9z" />
            </svg>
            Tap to hear {firstName}
          </button>
        )}
      </div>
      {/* Keeps the "voice while you read" intent honest about what just happened on open. */}
      <p className="mt-1.5 text-center text-sm text-ll-warm-gray">
        {muted ? 'Playing on mute — tap above to hear her' : `You’re hearing ${firstName}`}
      </p>
    </div>
  )
}
