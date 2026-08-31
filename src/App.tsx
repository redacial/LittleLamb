import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ToastProvider } from './components/ui/Toast'
import {
  RequireAuth,
  RequireRole,
  RequireApprovedAndOnboarded,
  FullScreenLoader,
} from './components/RouteGuards'
import { AppLayout } from './components/layout/AppLayout'
import { IndexRedirect } from './pages/IndexRedirect'
import { LoginPage } from './pages/auth/LoginPage'
import { SignupPage } from './pages/auth/SignupPage'
import { FamilyInfoPage } from './pages/public/FamilyInfoPage'
import { NannyInfoPage } from './pages/public/NannyInfoPage'
import { ApplicationPage } from './pages/public/ApplicationPage'
import { FamilyHoldingPage } from './pages/onboarding/FamilyHoldingPage'
import { NannyHoldingPage } from './pages/onboarding/NannyHoldingPage'
import { DeclinedPage } from './pages/onboarding/DeclinedPage'

// Everything behind auth is code-split. Public routes above stay eager: they are the first
// paint for real visitors, so pushing them into a lazy chunk would only add a round trip.
// Named exports need the `.then` shim — React.lazy expects a default export.
const FamilySetupWizard = lazy(() =>
  import('./pages/onboarding/FamilySetupWizard').then((m) => ({ default: m.FamilySetupWizard })),
)
const NannySetupWizard = lazy(() =>
  import('./pages/onboarding/NannySetupWizard').then((m) => ({ default: m.NannySetupWizard })),
)
const FamilyDashboard = lazy(() =>
  import('./pages/family/FamilyDashboard').then((m) => ({ default: m.FamilyDashboard })),
)
const NannyDashboard = lazy(() =>
  import('./pages/nanny/NannyDashboard').then((m) => ({ default: m.NannyDashboard })),
)
const AdminDashboard = lazy(() =>
  import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })),
)
const NanniesDirectory = lazy(() =>
  import('./pages/shared/NanniesDirectory').then((m) => ({ default: m.NanniesDirectory })),
)
const NannyProfilePage = lazy(() =>
  import('./pages/shared/NannyProfilePage').then((m) => ({ default: m.NannyProfilePage })),
)
const BookingsPage = lazy(() =>
  import('./pages/shared/BookingsPage').then((m) => ({ default: m.BookingsPage })),
)
const PoliciesPage = lazy(() =>
  import('./pages/shared/PoliciesPage').then((m) => ({ default: m.PoliciesPage })),
)
const FamilyProfilePage = lazy(() =>
  import('./pages/family/FamilyProfilePage').then((m) => ({ default: m.FamilyProfilePage })),
)
const FamilyBillingPage = lazy(() =>
  import('./pages/family/FamilyBillingPage').then((m) => ({ default: m.FamilyBillingPage })),
)
const FamilyCalendarPage = lazy(() =>
  import('./pages/family/FamilyCalendarPage').then((m) => ({ default: m.FamilyCalendarPage })),
)
const NannyOwnProfilePage = lazy(() =>
  import('./pages/nanny/NannyProfilePage').then((m) => ({ default: m.NannyOwnProfilePage })),
)
const NannyCalendarPage = lazy(() =>
  import('./pages/nanny/NannyCalendarPage').then((m) => ({ default: m.NannyCalendarPage })),
)
const AdminPeoplePage = lazy(() =>
  import('./pages/admin/AdminPeoplePage').then((m) => ({ default: m.AdminPeoplePage })),
)
const AdminBookingsPage = lazy(() =>
  import('./pages/admin/AdminBookingsPage').then((m) => ({ default: m.AdminBookingsPage })),
)
const AdminBillingPage = lazy(() =>
  import('./pages/admin/AdminBillingPage').then((m) => ({ default: m.AdminBillingPage })),
)
const AdminAnalyticsPage = lazy(() =>
  import('./pages/admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })),
)
const AdminSettingsPage = lazy(() =>
  import('./pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })),
)

/**
 * Route tree. Guard order is the SPA equivalent of layered middleware (checklist §2):
 *   RequireAuth → RequireRole → RequireApprovedAndOnboarded → AppLayout
 * Authorization is always decided from the server-trusted user profile, never a client claim.
 * Holding pages and setup wizards sit inside the role gate but outside the approved+onboarded
 * gate, so pending/unfinished users can reach them but not the app shell.
 *
 * Every screen is a real component; the app is fully navigable for all three roles.
 */
export function App() {
  return (
    // Outermost so a throw in AuthProvider itself is caught too — otherwise the one
    // component every route depends on is the only one that can still white-screen.
    <ErrorBoundary boundaryName="app">
    <AuthProvider>
      {/* Toast viewport lives above the routes so any screen can acknowledge a success. */}
      <ToastProvider>
      {/* One boundary around the whole tree: only the lazy (post-auth) routes can suspend,
          and they already show a full-screen shell while the guards resolve auth. */}
      <Suspense fallback={<FullScreenLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/" element={<IndexRedirect />} />
        <Route path="/for-families" element={<FamilyInfoPage />} />
        <Route path="/for-nannies" element={<NannyInfoPage />} />
        <Route path="/apply" element={<ApplicationPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<RequireAuth />}>
          {/* ---- Family ---- */}
          <Route element={<RequireRole roles={['family']} />}>
            <Route path="/family/pending" element={<FamilyHoldingPage />} />
            <Route path="/family/declined" element={<DeclinedPage role="family" />} />
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
                <Route path="/family/policies" element={<PoliciesPage role="family" />} />
              </Route>
            </Route>
          </Route>

          {/* ---- Nanny ---- */}
          <Route element={<RequireRole roles={['nanny']} />}>
            <Route path="/nanny/pending" element={<NannyHoldingPage />} />
            <Route path="/nanny/declined" element={<DeclinedPage role="nanny" />} />
            <Route path="/nanny/setup" element={<NannySetupWizard />} />
            <Route element={<RequireApprovedAndOnboarded />}>
              <Route element={<AppLayout />}>
                <Route path="/nanny" element={<NannyDashboard />} />
                <Route path="/nanny/calendar" element={<NannyCalendarPage />} />
                <Route path="/nanny/bookings" element={<BookingsPage role="nanny" />} />
                <Route path="/nanny/nannies" element={<NanniesDirectory />} />
                <Route path="/nanny/nannies/:id" element={<NannyProfilePage />} />
                <Route path="/nanny/profile" element={<NannyOwnProfilePage />} />
                <Route path="/nanny/policies" element={<PoliciesPage role="nanny" />} />
              </Route>
            </Route>
          </Route>

          {/* ---- Admin ---- */}
          <Route element={<RequireRole roles={['admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
              <Route path="/admin/nannies" element={<AdminPeoplePage role="nanny" />} />
              <Route path="/admin/families" element={<AdminPeoplePage role="family" />} />
              <Route path="/admin/bookings" element={<AdminBookingsPage />} />
              <Route path="/admin/billing" element={<AdminBillingPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      </ToastProvider>
    </AuthProvider>
    </ErrorBoundary>
  )
}
