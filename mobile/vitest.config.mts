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
  /**
   * `__DEV__`는 React Native(Metro)가 전역으로 주입하는 값이라 node 환경에는 없다.
   * 정의해 두지 않으면 이 값을 읽는 모듈(`constants/config`)을 거쳐 import되는
   * 테스트가 전부 `ReferenceError`로 죽는다 — 테스트 파일마다 config를 mock하면
   * 실제 상수 대신 가짜를 검증하게 되므로 여기서 한 번만 정의한다.
   */
  define: {
    __DEV__: 'true',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
