import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * 모바일은 Expo(Metro) 앱이라 앱 코드는 번들러가 빌드한다. 여기서 검증하는 대상은
 * React Native에 의존하지 않는 **순수 로직**(`src/utils`, `src/services`)이다.
 * 프론트엔드가 이미 vitest를 쓰므로 러너를 하나로 맞췄다.
 *
 * RN 컴포넌트 렌더 테스트가 필요해지면 jest-expo를 추가로 붙인다 — 두 러너는
 * 파일 패턴이 겹치지 않는 한 공존한다.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url).href),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
