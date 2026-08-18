import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
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
const MissionsPage = lazy(() => import('./pages/MissionsPage').then(m => ({ default: m.MissionsPage })));
const MissionSettingsPage = lazy(() => import('./pages/missions/MissionSettingsPage').then(m => ({ default: m.MissionSettingsPage })));
const ReportPage = lazy(() => import('./pages/report/ReportPage').then(m => ({ default: m.ReportPage })));
const PatternAnalysisPage = lazy(() => import('./pages/patterns/PatternAnalysisPage').then(m => ({ default: m.PatternAnalysisPage })));
const InsightsPage = lazy(() => import('./pages/insights/InsightsPage').then(m => ({ default: m.InsightsPage })));

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
      import('./pages/MissionsPage').catch(() => {});
      import('./pages/report/ReportPage').catch(() => {});
      import('./pages/insights/InsightsPage').catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, []);
}

/**
 * 로그인한 사용자가 바뀌면 이 기기의 푸시 구독 소유권을 서버에서 옮긴다.
 * 로그아웃은 브라우저 구독을 지우지 않으므로, 이게 없으면 같은 기기의 다음 사용자가
 * 이전 사용자의 출퇴근 알림을 계속 받는다. 사용자가 시작한 동작이 아니라 화면에
 * 알리지 않고, 실패하면 소유자 표시가 남지 않아 다음 실행에서 다시 시도한다.
 */
export function usePushSubscriptionOwner(): void {
  const { userId } = useAuth();
  useEffect(() => {
    if (!userId) return;
    // 정적 import는 push-manager와 그 의존 사슬을 초기 청크로 끌어온다.
    // 첫 화면에 필요 없는 배경 작업이므로 실행 시점에 가져온다.
    void import('@infrastructure/push/push-manager')
      .then((m) => m.syncPushSubscriptionOwner(userId))
      .catch(() => undefined);
  }, [userId]);
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
  usePushSubscriptionOwner();
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
            <Route path="/missions" element={<MissionsPage />} />
            <Route path="/missions/settings" element={<MissionSettingsPage />} />
            <Route path="/reports" element={<ReportPage />} />
            <Route path="/patterns" element={<PatternAnalysisPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <BottomNavigation />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

