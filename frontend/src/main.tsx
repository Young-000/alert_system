import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@infrastructure/query/query-client';
import { installGlobalErrorHandlers } from '@infrastructure/monitoring/error-logger';
import App from './presentation/App';
import './presentation/styles/index.css';

// Install global error handlers before rendering
installGlobalErrorHandlers();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);

// PWA: detect SW updates and auto-refresh for the latest version
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((registration) => {
    // Check for updates every 60 seconds
    setInterval(() => {
      registration.update().catch(() => {
        // Silently ignore update check failures (e.g., offline)
      });
    }, 60 * 1000);
  });

  // When a new SW takes over, reload to use the latest assets
  let isRefreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isRefreshing) return;
    isRefreshing = true;
    window.location.reload();
  });
}
