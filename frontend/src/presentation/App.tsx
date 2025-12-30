import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { AlertSettingsPage } from './pages/AlertSettingsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/alerts" element={<AlertSettingsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

