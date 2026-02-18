import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { BottomNavigation } from './components/BottomNavigation';

// All pages are lazy-loaded for optimal code splitting
const HomePage = lazy(() => import('./pages/home/HomePage').then(m => ({ default: m.HomePage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const AlertSettingsPage = lazy(() => import('./pages/AlertSettingsPage').then(m => ({ default: m.AlertSettingsPage })));
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const RouteSetupPage = lazy(() => import('./pages/RouteSetupPage').then(m => ({ default: m.RouteSetupPage })));
const CommuteTrackingPage = lazy(() => import('./pages/CommuteTrackingPage').then(m => ({ default: m.CommuteTrackingPage })));
const CommuteDashboardPage = lazy(() => import('./pages/CommuteDashboardPage').then(m => ({ default: m.CommuteDashboardPage })));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const NotificationHistoryPage = lazy(() => import('./pages/NotificationHistoryPage').then(m => ({ default: m.NotificationHistoryPage })));

function PageLoader() {
  return (
    <div className="page-skeleton" role="status" aria-live="polite">
      <div className="skeleton page-skeleton-title" />
      <div className="skeleton-card page-skeleton-hero" />
      <div className="skeleton-card page-skeleton-card" />
      <span className="sr-only">페이지 로딩 중...</span>
    </div>
  );
}

// Idle preload: after mount, preload key pages in background
function useIdlePreload(): void {
  useEffect(() => {
    const timer = setTimeout(() => {
      import('./pages/RouteSetupPage').catch(() => {});
      import('./pages/AlertSettingsPage').catch(() => {});
      import('./pages/SettingsPage').catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, []);
}

function ScrollToTop(): null {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  useIdlePreload();
  return (
    <ErrorBoundary>
      <OfflineBanner />
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <ScrollToTop />
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
            <Route path="/notifications" element={<NotificationHistoryPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <BottomNavigation />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

