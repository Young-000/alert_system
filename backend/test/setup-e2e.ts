/**
 * E2E 테스트 환경변수 기본값.
 *
 * E2E는 인메모리 sqljs + 실제 AppModule 배선으로 돌기 때문에,
 * 부팅 시점에 env를 요구하는 프로바이더(EventBridgeSchedulerService 등)가
 * 없으면 DI 그래프 자체가 무너져 전 스위트가 죽는다.
 * 프로덕션 fail-fast 동작은 그대로 두고, 테스트에만 더미 값을 주입한다.
 *
 * 이미 설정된 값(CI의 JWT_SECRET 등)은 덮어쓰지 않는다.
 */
const E2E_ENV_DEFAULTS: Record<string, string> = {
  NODE_ENV: 'test',
  USE_SQLITE: 'true',
  JWT_SECRET: 'test-secret-for-e2e',
  // AWS는 실제로 호출하지 않는다. 부팅 시 필수값 검증만 통과시키기 위한 더미다.
  AWS_REGION: 'ap-northeast-2',
  AWS_ACCOUNT_ID: '000000000000',
  SCHEDULE_GROUP_NAME: 'alert-system-test-alerts',
};

for (const [key, value] of Object.entries(E2E_ENV_DEFAULTS)) {
  if (!process.env[key]) {
    process.env[key] = value;
  }
}
