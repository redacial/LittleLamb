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
import { NanniesDirectory } from './pages/shared/NanniesDirectory'
import { NannyProfilePage } from './pages/shared/NannyProfilePage'
import { BookingsPage } from './pages/shared/BookingsPage'
import { PoliciesPage } from './pages/shared/PoliciesPage'
import { MessagesPage } from './pages/shared/MessagesPage'
import { FamilyProfilePage } from './pages/family/FamilyProfilePage'
import { FamilyBillingPage } from './pages/family/FamilyBillingPage'
import { FamilyCalendarPage } from './pages/family/FamilyCalendarPage'
import { NannyOwnProfilePage } from './pages/nanny/NannyProfilePage'
import { NannyCalendarPage } from './pages/nanny/NannyCalendarPage'

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
                <Route path="/family/calendar" element={<FamilyCalendarPage />} />
                <Route path="/family/bookings" element={<BookingsPage role="family" />} />
                <Route path="/family/nannies" element={<NanniesDirectory />} />
                <Route path="/family/nannies/:id" element={<NannyProfilePage />} />
                <Route path="/family/profile" element={<FamilyProfilePage />} />
                <Route path="/family/billing" element={<FamilyBillingPage />} />
                <Route path="/family/messages" element={<MessagesPage />} />
                <Route path="/family/policies" element={<PoliciesPage role="family" />} />
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
                <Route path="/nanny/calendar" element={<NannyCalendarPage />} />
                <Route path="/nanny/bookings" element={<BookingsPage role="nanny" />} />
                <Route path="/nanny/nannies" element={<NanniesDirectory />} />
                <Route path="/nanny/nannies/:id" element={<NannyProfilePage />} />
                <Route path="/nanny/profile" element={<NannyOwnProfilePage />} />
                <Route path="/nanny/messages" element={<MessagesPage />} />
                <Route path="/nanny/policies" element={<PoliciesPage role="nanny" />} />
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
              <Route path="/admin/messages" element={<MessagesPage />} />
              <Route path="/admin/settings" element={<Placeholder title="Settings" note="Phase 4 — config editors." />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
