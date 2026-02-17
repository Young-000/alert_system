import { defineConfig, mergeConfig } from 'vitest/config';
import path from 'path';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig({ mode: 'test', command: 'serve' }),
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      environmentOptions: {
        jsdom: {
          url: 'http://localhost:3000',
        },
      },
      setupFiles: ['./src/setupTests.ts'],
      include: ['**/?(*.)+(spec|test).(ts|tsx)'],
      exclude: ['node_modules', 'e2e'],
      css: true,
      alias: [
        {
          find: /^@infrastructure\/api$/,
          replacement: path.resolve(__dirname, './src/__mocks__/infrastructure/api/index.ts'),
        },
        {
          find: /^@infrastructure\/api\/(.*)$/,
          replacement: path.resolve(__dirname, './src/__mocks__/infrastructure/api/index.ts'),
        },
        {
          find: /^@infrastructure\/analytics\/(.*)$/,
          replacement: path.resolve(__dirname, './src/__mocks__/infrastructure/analytics/$1'),
        },
        {
          find: /^uuid$/,
          replacement: path.resolve(__dirname, './src/__mocks__/uuid.ts'),
        },
      ],
    },
  }),
);
