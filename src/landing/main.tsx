import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import { WaitlistProvider } from './components/WaitlistModal'
import { LandingPage } from './pages/LandingPage'

/**
 * Entry point for the standalone PRE-LAUNCH landing site.
 * Deliberately minimal: no react-router, no AuthProvider, no path into the app.
 * Just the waitlist context + the single marketing page.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WaitlistProvider>
      <LandingPage />
    </WaitlistProvider>
  </StrictMode>,
)
