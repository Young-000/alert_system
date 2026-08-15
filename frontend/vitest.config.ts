import { defineConfig, mergeConfig } from 'vitest/config';
import path from 'path';
import viteConfig from './vite.config';

/**
 * jsdom 환경 생성과 최초 모듈 임포트가 파일당 수 초를 먹는다 (74개 파일 전체 실행 기준
 * environment 약 644초 / import 약 625초 누적). 이 비용은 각 파일의 **첫 테스트**에
 * 붙으므로, 기본 제한 5,000ms에서는 부하가 걸린 러너에서 첫 테스트가 임의로 터진다.
 * 실제로 같은 커밋을 두 번 돌렸을 때 실패 집합이 7건 → 14건으로 달라졌고 사유는 전부
 * "Test timed out in 5000ms"였다 (단독 실행하면 같은 테스트가 300ms대에 통과).
 *
 * 진짜 행(hang)은 어차피 영원히 끝나지 않으므로 이 상향으로도 잡힌다 — 감지가 늦어질 뿐이다.
 */
const TEST_TIMEOUT_MS = 15_000;

export default mergeConfig(
  viteConfig({ mode: 'test', command: 'serve' }),
  defineConfig({
    test: {
      globals: true,
      testTimeout: TEST_TIMEOUT_MS,
      hookTimeout: TEST_TIMEOUT_MS,
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
