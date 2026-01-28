import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineBanner } from './components/OfflineBanner';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { AlertSettingsPage } from './pages/AlertSettingsPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { NotFoundPage } from './pages/NotFoundPage';
// Commute tracking pages
import { RouteSetupPage } from './pages/RouteSetupPage';
import { CommuteTrackingPage } from './pages/CommuteTrackingPage';
import { CommuteDashboardPage } from './pages/CommuteDashboardPage';

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
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/alerts" element={<AlertSettingsPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          {/* Commute tracking routes */}
          <Route path="/routes" element={<RouteSetupPage />} />
          <Route path="/commute" element={<CommuteTrackingPage />} />
          <Route path="/commute/dashboard" element={<CommuteDashboardPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;

