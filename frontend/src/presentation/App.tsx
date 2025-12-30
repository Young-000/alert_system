import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { AlertSettingsPage } from './pages/AlertSettingsPage';
import { LocationSettingsPage } from './pages/LocationSettingsPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/alerts" element={<AlertSettingsPage />} />
          <Route path="/location" element={<LocationSettingsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;

