import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import {
  RequireAuth,
  RequireRole,
  RequireApprovedAndOnboarded,
} from './components/RouteGuards'
import { IndexRedirect } from './pages/IndexRedirect'
import { LoginPage } from './pages/auth/LoginPage'
import { SignupPage } from './pages/auth/SignupPage'
import { Placeholder } from './pages/Placeholder'
import { FamilyHoldingPage } from './pages/onboarding/FamilyHoldingPage'
import { NannyHoldingPage } from './pages/onboarding/NannyHoldingPage'
import { FamilySetupWizard } from './pages/onboarding/FamilySetupWizard'
import { NannySetupWizard } from './pages/onboarding/NannySetupWizard'

/**
 * Route tree. Guard order is the SPA equivalent of layered middleware (checklist §2):
 *   RequireAuth → RequireRole → RequireApprovedAndOnboarded
 * Authorization is always decided from the server-trusted user profile, never a client claim.
 * Holding pages and setup wizards sit *inside* the role gate but *outside* the
 * approved+onboarded gate, so pending/unfinished users can reach them but not the app.
 */
export function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<IndexRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Authenticated */}
        <Route element={<RequireAuth />}>
          {/* Family */}
          <Route element={<RequireRole roles={['family']} />}>
            <Route path="/family/pending" element={<FamilyHoldingPage />} />
            <Route path="/family/setup" element={<FamilySetupWizard />} />
            <Route element={<RequireApprovedAndOnboarded />}>
              <Route path="/family" element={<Placeholder title="Family dashboard" note="Phase 4." />} />
            </Route>
          </Route>

          {/* Nanny */}
          <Route element={<RequireRole roles={['nanny']} />}>
            <Route path="/nanny/pending" element={<NannyHoldingPage />} />
            <Route path="/nanny/setup" element={<NannySetupWizard />} />
            <Route element={<RequireApprovedAndOnboarded />}>
              <Route path="/nanny" element={<Placeholder title="Nanny dashboard" note="Phase 4." />} />
            </Route>
          </Route>

          {/* Admin */}
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="/admin" element={<Placeholder title="Admin dashboard" note="Phase 4." />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
