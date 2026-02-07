import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { BottomNavigation } from './components/BottomNavigation';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';

// Lazy-loaded pages for code splitting
const AlertSettingsPage = lazy(() => import('./pages/AlertSettingsPage').then(m => ({ default: m.AlertSettingsPage })));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const RouteSetupPage = lazy(() => import('./pages/RouteSetupPage').then(m => ({ default: m.RouteSetupPage })));
const CommuteTrackingPage = lazy(() => import('./pages/CommuteTrackingPage').then(m => ({ default: m.CommuteTrackingPage })));
const CommuteDashboardPage = lazy(() => import('./pages/CommuteDashboardPage').then(m => ({ default: m.CommuteDashboardPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));

function PageLoader() {
  return (
    <div className="loading-container" role="status" aria-live="polite">
      <span className="spinner spinner-lg" aria-hidden="true" />
      <p className="muted">페이지 로딩 중...</p>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <OfflineBanner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/alerts" element={<AlertSettingsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            {/* Commute tracking routes */}
            <Route path="/routes" element={<RouteSetupPage />} />
            <Route path="/commute" element={<CommuteTrackingPage />} />
            <Route path="/commute/dashboard" element={<CommuteDashboardPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <BottomNavigation />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

