import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isAnalyze = env.ANALYZE === 'true';

  return {
    define: {
      'process.env.VITE_API_BASE_URL': JSON.stringify(env.VITE_API_BASE_URL || ''),
      'process.env.VITE_VAPID_PUBLIC_KEY': JSON.stringify(env.VITE_VAPID_PUBLIC_KEY || ''),
    },
    plugins: [
      react(),
      VitePWA({
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        includeAssets: ['robots.txt', 'pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          name: '출퇴근 메이트',
          short_name: '출퇴근',
          description: '출근/퇴근 시 필요한 정보를 통합 제공하는 알림 시스템',
          start_url: '/',
          display: 'standalone',
          theme_color: '#ffffff',
          background_color: '#ffffff',
          orientation: 'portrait',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          shortcuts: [
            {
              name: '출근 시작',
              short_name: '출근',
              url: '/commute?mode=morning',
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
            },
            {
              name: '퇴근 시작',
              short_name: '퇴근',
              url: '/commute?mode=evening',
              icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
            },
          ]
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        },
      }),
      // Bundle analyzer: enabled via ANALYZE=true
      ...(isAnalyze
        ? [
            (async () => {
              const { visualizer } = await import('rollup-plugin-visualizer');
              return visualizer({
                open: false,
                filename: 'bundle-stats.html',
                gzipSize: true,
                brotliSize: false,
              });
            })(),
          ]
        : []),
    ],
    build: {
      target: 'es2020',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            // React core (react + react-dom + scheduler) — cached long-term
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/scheduler/')
            ) {
              return 'vendor-react';
            }
            // React Router
            if (id.includes('/react-router')) {
              return 'vendor-router';
            }
            // TanStack React Query
            if (id.includes('/@tanstack/react-query')) {
              return 'vendor-query';
            }
            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        '@domain': path.resolve(__dirname, './src/domain'),
        '@application': path.resolve(__dirname, './src/application'),
        '@infrastructure': path.resolve(__dirname, './src/infrastructure'),
        '@presentation': path.resolve(__dirname, './src/presentation'),
      },
    },
  };
});
