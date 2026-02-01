import '@testing-library/jest-dom';

// Mock import.meta.env for Jest
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_BASE_URL: 'http://localhost:3000',
        VITE_VAPID_PUBLIC_KEY: 'test-vapid-key',
      },
    },
  },
});
