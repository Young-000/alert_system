import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { BottomNavigation } from './components/BottomNavigation';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { AlertSettingsPage } from './pages/AlertSettingsPage';
import { LocationSettingsPage } from './pages/LocationSettingsPage';

function AppContent() {
  const location = useLocation();
  const showBottomNav = !location.pathname.includes('/login');

  return (
    <div className="min-h-screen bg-gray-50">
      {!location.pathname.includes('/login') && <Header />}
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/alerts" element={<AlertSettingsPage />} />
        <Route path="/location" element={<LocationSettingsPage />} />
      </Routes>
      {showBottomNav && <BottomNavigation />}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;

