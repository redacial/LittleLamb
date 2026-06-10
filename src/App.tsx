import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import {
  RequireAuth,
  RequireRole,
  RequireApprovedAndOnboarded,
} from './components/RouteGuards'
import { AppLayout } from './components/layout/AppLayout'
import { IndexRedirect } from './pages/IndexRedirect'
import { LoginPage } from './pages/auth/LoginPage'
import { SignupPage } from './pages/auth/SignupPage'
import { Placeholder } from './pages/Placeholder'
import { FamilyHoldingPage } from './pages/onboarding/FamilyHoldingPage'
import { NannyHoldingPage } from './pages/onboarding/NannyHoldingPage'
import { FamilySetupWizard } from './pages/onboarding/FamilySetupWizard'
import { NannySetupWizard } from './pages/onboarding/NannySetupWizard'
import { FamilyDashboard } from './pages/family/FamilyDashboard'
import { NannyDashboard } from './pages/nanny/NannyDashboard'
import { AdminDashboard } from './pages/admin/AdminDashboard'

/**
 * Route tree. Guard order is the SPA equivalent of layered middleware (checklist §2):
 *   RequireAuth → RequireRole → RequireApprovedAndOnboarded → AppLayout
 * Authorization is always decided from the server-trusted user profile, never a client claim.
 * Holding pages and setup wizards sit inside the role gate but outside the approved+onboarded
 * gate, so pending/unfinished users can reach them but not the app shell.
 *
 * Screens still being built in Phase 4 render <Placeholder> inside the real layout, so the app
 * is fully navigable now and each screen is swapped in without touching routing. See Backlog.md.
 */
export function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public */}
        <Route path="/" element={<IndexRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<RequireAuth />}>
          {/* ---- Family ---- */}
          <Route element={<RequireRole roles={['family']} />}>
            <Route path="/family/pending" element={<FamilyHoldingPage />} />
            <Route path="/family/setup" element={<FamilySetupWizard />} />
            <Route element={<RequireApprovedAndOnboarded />}>
              <Route element={<AppLayout />}>
                <Route path="/family" element={<FamilyDashboard />} />
                <Route path="/family/calendar" element={<Placeholder title="Calendar" note="Phase 4 — booking calendar." />} />
                <Route path="/family/bookings" element={<Placeholder title="Bookings" note="Phase 4 — bookings list." />} />
                <Route path="/family/nannies" element={<Placeholder title="Our Nannies" note="Phase 4 — directory." />} />
                <Route path="/family/profile" element={<Placeholder title="My Profile" note="Phase 4 — editable profile." />} />
                <Route path="/family/billing" element={<Placeholder title="Billing" note="Phase 4 — invoices." />} />
                <Route path="/family/messages" element={<Placeholder title="Messages" note="Phase 4 — inbox." />} />
                <Route path="/family/policies" element={<Placeholder title="Policies" note="Phase 4." />} />
              </Route>
            </Route>
          </Route>

          {/* ---- Nanny ---- */}
          <Route element={<RequireRole roles={['nanny']} />}>
            <Route path="/nanny/pending" element={<NannyHoldingPage />} />
            <Route path="/nanny/setup" element={<NannySetupWizard />} />
            <Route element={<RequireApprovedAndOnboarded />}>
              <Route element={<AppLayout />}>
                <Route path="/nanny" element={<NannyDashboard />} />
                <Route path="/nanny/calendar" element={<Placeholder title="Calendar" note="Phase 4 — availability + bookings." />} />
                <Route path="/nanny/bookings" element={<Placeholder title="Bookings" note="Phase 4." />} />
                <Route path="/nanny/nannies" element={<Placeholder title="Our Nannies" note="Phase 4 — directory (no booking buttons)." />} />
                <Route path="/nanny/profile" element={<Placeholder title="My Profile" note="Phase 4." />} />
                <Route path="/nanny/messages" element={<Placeholder title="Messages" note="Phase 4." />} />
                <Route path="/nanny/policies" element={<Placeholder title="Policies" note="Phase 4." />} />
              </Route>
            </Route>
          </Route>

          {/* ---- Admin ---- */}
          <Route element={<RequireRole roles={['admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/analytics" element={<Placeholder title="Analytics" note="Phase 4 — 5 metric tabs." />} />
              <Route path="/admin/nannies" element={<Placeholder title="Nannies" note="Phase 4 — management tabs." />} />
              <Route path="/admin/families" element={<Placeholder title="Families" note="Phase 4 — management tabs." />} />
              <Route path="/admin/bookings" element={<Placeholder title="Bookings" note="Phase 4 — platform-wide + create." />} />
              <Route path="/admin/billing" element={<Placeholder title="Billing & Accounting" note="Phase 4 — 4 tabs." />} />
              <Route path="/admin/messages" element={<Placeholder title="Messages" note="Phase 4 — unified inbox." />} />
              <Route path="/admin/settings" element={<Placeholder title="Settings" note="Phase 4 — config editors." />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
