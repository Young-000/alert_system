# Q-1: E2E 테스트 기반 구축 (Playwright)

**작성일**: 2026-02-18
**버전**: v1.0
**담당자**: PM Agent

---

## 1. 개요

### 1.1 목적
Alert System의 핵심 사용자 플로우를 자동화된 E2E 테스트로 검증하여 배포 전 회귀(regression) 버그를 방지하고, 프로덕션 환경에서의 안정성을 보장한다.

### 1.2 현재 상태
| 항목 | 상태 |
|------|:----:|
| Playwright 설치 | ✅ (`@playwright/test@1.57.0`) |
| 설정 파일 | ✅ (`playwright.config.ts`) |
| 기존 E2E 테스트 | ⚠️ 2개 파일 (auth.spec.ts, alert-system.spec.ts) - 제한적 |
| CI 통합 | ❌ E2E 테스트가 CI 파이프라인에 포함 안 됨 |
| API Mocking | ❌ 실제 API 호출 (프로덕션 영향) |
| 접근성 검증 | ❌ axe-core 미포함 |
| 모바일 뷰포트 | ❌ Desktop Chrome만 테스트 |

### 1.3 목표
- ✅ 핵심 사용자 플로우 10개 시나리오 E2E 테스트 작성
- ✅ API Mocking (MSW 또는 Playwright route.fulfill)으로 프로덕션 격리
- ✅ 모바일 뷰포트 테스트 추가 (PWA 검증)
- ✅ 접근성 검증 (axe-core 통합)
- ✅ CI/CD에 E2E 단계 추가 (병렬 실행)
- ✅ 테스트 헬퍼/픽스처 표준화

---

## 2. 기술 스택

### 2.1 선택된 기술
| 영역 | 기술 | 버전 | 선택 이유 |
|------|------|------|----------|
| **E2E 프레임워크** | Playwright | 1.57.0 | 이미 설치됨, 업계 표준, 빠른 실행, 병렬 지원 |
| **API Mocking** | Playwright `route.fulfill()` | Built-in | 별도 의존성 불필요, 설정 간단 |
| **접근성 검증** | axe-core + @axe-core/playwright | Latest | WCAG 2.1 자동 검증 표준 도구 |
| **시각적 회귀** | Playwright Screenshots | Built-in | 선택사항, 핵심 플로우만 |

### 2.2 MSW vs Playwright route.fulfill
**결정: Playwright `route.fulfill()` 사용**

| 항목 | MSW | Playwright route.fulfill | 선택 |
|------|-----|---------------------------|------|
| 설정 복잡도 | 중 (service worker) | 낮 (test 내 직접 mock) | ✅ route.fulfill |
| 의존성 | 추가 패키지 필요 | Built-in | ✅ route.fulfill |
| 디버깅 | Harder (worker 분리) | Easier (test 코드 안) | ✅ route.fulfill |
| 재사용성 | 높음 (전역 handlers) | 중 (test별 mock) | ⚠️ MSW |

**최종 선택**: Playwright `route.fulfill()` - 설정이 간단하고, E2E에서 test별 mock이 더 직관적.

---

## 3. 테스트 아키텍처

### 3.1 폴더 구조
```
frontend/
  e2e/
    ├── fixtures/           # 테스트 데이터, 커스텀 픽스처
    │   ├── auth.ts         # 인증 헬퍼
    │   ├── mock-api.ts     # API mocking 유틸리티
    │   └── test-data.ts    # 샘플 데이터 (routes, alerts)
    ├── helpers/            # 재사용 가능한 헬퍼 함수
    │   ├── login.ts        # 로그인/회원가입 헬퍼
    │   ├── navigation.ts   # 공통 네비게이션
    │   └── assertions.ts   # 커스텀 assertion
    ├── specs/              # 실제 테스트 파일
    │   ├── auth/
    │   │   ├── login.spec.ts
    │   │   └── registration.spec.ts
    │   ├── routes/
    │   │   ├── route-setup.spec.ts
    │   │   └── route-management.spec.ts
    │   ├── alerts/
    │   │   ├── alert-creation.spec.ts
    │   │   └── alert-management.spec.ts
    │   ├── commute/
    │   │   ├── commute-tracking.spec.ts
    │   │   └── commute-dashboard.spec.ts
    │   ├── home/
    │   │   ├── guest-landing.spec.ts
    │   │   └── authenticated-home.spec.ts
    │   └── accessibility/
    │       └── a11y.spec.ts
    └── playwright.config.ts
```

### 3.2 테스트 레이어
```
User Flow Tests (specs/)
       ↓
  Helpers (helpers/) ← 로그인, 네비게이션 등 재사용
       ↓
  Fixtures (fixtures/) ← 커스텀 픽스처, API mocking
       ↓
  Playwright Core
```

---

## 4. 핵심 테스트 시나리오

### 4.1 인증 플로우 (Priority: P0)
**파일**: `e2e/specs/auth/login.spec.ts`, `registration.spec.ts`

| 시나리오 | 검증 항목 | 현재 상태 |
|---------|----------|:--------:|
| 비로그인 홈 방문 → GuestLanding 표시 | Hero 텍스트, CTA 버튼 | ⚠️ 부분적 |
| 회원가입 폼 → 계정 생성 → /alerts 리다이렉트 | 입력 검증, 성공 메시지, URL 변경 | ✅ 있음 |
| 로그인 폼 → 로그인 → localStorage 토큰 저장 | 토큰 존재, 사용자 정보 | ✅ 있음 (일부 skip) |
| 잘못된 비밀번호 → 에러 메시지 | 에러 텍스트, 폼 상태 유지 | ✅ 있음 |
| 페이지 새로고침 → 세션 유지 | 로그인 상태 지속 | ✅ 있음 |

**개선 필요**:
- API mocking으로 rate limit 회피 (현재 skip된 테스트 복원)
- 에러 상태 더 많은 케이스 (네트워크 오류, 서버 500 등)

### 4.2 경로 설정 플로우 (Priority: P0)
**파일**: `e2e/specs/routes/route-setup.spec.ts`, `route-management.spec.ts`

| 시나리오 | 검증 항목 | 현재 상태 |
|---------|----------|:--------:|
| 비로그인 → /routes 접근 → 로그인 유도 메시지 | 경고 메시지 표시 | ❌ |
| 템플릿 선택 → 저장 → /commute 리다이렉트 | URL 변경, 경로 목록에 추가 | ❌ |
| "직접 만들기" 버튼 → 커스텀 폼 표시 (다른 UI 숨김) | 조건부 렌더링 검증 | ❌ |
| 체크포인트 추가 → 목록에 새 항목 표시 | 동적 목록 업데이트 | ❌ |
| 체크포인트 삭제 → 최소 2개 유지 | 삭제 제한 검증 | ❌ |
| 경로 저장 → 저장된 경로 목록에 표시 | API 호출 → 목록 새로고침 | ❌ |
| 저장된 경로 클릭 → /commute?routeId=xxx 이동 | 쿼리 파라미터 전달 | ❌ |
| 수정 버튼 → 폼에 기존 데이터 로드 | 데이터 로딩, 폼 초기화 | ❌ |
| 삭제 버튼 → 확인 모달 → 목록에서 제거 | 확인 프롬프트, 삭제 완료 | ❌ |

**CLAUDE.md 체크리스트 기반**:
- JSX 조건부 렌더링 검증 (showForm 상태에 따른 UI 전환)
- 이벤트 핸들러 검증 (버튼 클릭, 부모-자식 이벤트 충돌)

### 4.3 알림 설정 플로우 (Priority: P0)
**파일**: `e2e/specs/alerts/alert-creation.spec.ts`, `alert-management.spec.ts`

| 시나리오 | 검증 항목 | 현재 상태 |
|---------|----------|:--------:|
| 새 알림 생성 → 폼 표시 | 마법사 단계 표시 | ⚠️ 부분적 (wizard step만) |
| 알림 저장 → 목록에 표시 | API 호출 → 목록 새로고침 | ❌ |
| 알림 활성화/비활성화 토글 | 토글 상태 변경, API 업데이트 | ❌ |
| 알림 삭제 → 확인 모달 → 제거 | 확인 프롬프트, 삭제 완료 | ❌ |
| 마법사 단계별 검증 (날씨/교통 선택 → 루틴 설정 → 확인) | 단계 전환, 데이터 유지 | ⚠️ 부분적 |

### 4.4 출퇴근 트래킹 플로우 (Priority: P1)
**파일**: `e2e/specs/commute/commute-tracking.spec.ts`

| 시나리오 | 검증 항목 | 현재 상태 |
|---------|----------|:--------:|
| 경로 선택 → 세션 시작 | 경로 드롭다운, 시작 버튼 | ❌ |
| 스톱워치 모드 → 시간만 기록 | 타이머 동작, 시간 저장 | ❌ |
| 체크포인트 도착 → 시간 기록 및 다음 단계로 | 체크포인트 UI 전환 | ❌ |
| 세션 완료 → /commute/dashboard 리다이렉트 | URL 변경, 완료 메시지 | ❌ |
| 세션 취소 → 확인 모달 → 데이터 삭제 | 확인 프롬프트, 세션 초기화 | ❌ |

### 4.5 홈페이지 플로우 (Priority: P1)
**파일**: `e2e/specs/home/guest-landing.spec.ts`, `authenticated-home.spec.ts`

| 시나리오 | 검증 항목 | 현재 상태 |
|---------|----------|:--------:|
| 비로그인 → GuestLanding 표시 | Hero 섹션, CTA 버튼 | ⚠️ 부분적 |
| 로그인 상태 → 날씨/알림/경로 섹션 표시 | 각 섹션 존재, 데이터 로딩 | ❌ |
| "알림 시작하기" 버튼 → /alerts 이동 | 네비게이션 | ✅ 있음 |
| 경로 추천 카드 클릭 → /commute 이동 | 네비게이션 | ❌ |
| 주간 리포트 카드 표시 (데이터 있을 때) | 조건부 렌더링 | ❌ |

### 4.6 대시보드 플로우 (Priority: P2)
**파일**: `e2e/specs/commute/commute-dashboard.spec.ts`

| 시나리오 | 검증 항목 | 현재 상태 |
|---------|----------|:--------:|
| 탭 전환 (Overview/History/Analytics) | 탭 UI, 콘텐츠 변경 | ❌ |
| 경로별 통계 표시 | 차트/표 렌더링 | ❌ |
| 히스토리 목록 페이지네이션 | 더보기 버튼, 목록 추가 | ❌ |

### 4.7 접근성 검증 (Priority: P2)
**파일**: `e2e/specs/accessibility/a11y.spec.ts`

| 시나리오 | 검증 항목 | 현재 상태 |
|---------|----------|:--------:|
| 전체 페이지 axe 스캔 (/, /login, /routes, /alerts, /commute) | WCAG 2.1 AA 위반 0개 | ❌ |
| 키보드 네비게이션 (Tab, Enter, Esc) | 모든 인터랙티브 요소 접근 가능 | ❌ |
| 포커스 트랩 (모달 열림/닫힘) | 포커스 관리 | ❌ |
| 스크린 리더 레이블 (아이콘 버튼, 이미지) | aria-label, alt 속성 | ❌ |

---

## 5. API Mocking 전략

### 5.1 Playwright route.fulfill 패턴
```typescript
// e2e/fixtures/mock-api.ts
import { Page, Route } from '@playwright/test';

export async function mockAuthAPI(page: Page) {
  // Mock successful registration
  await page.route('**/auth/register', async (route: Route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        userId: 'mock-user-123',
        token: 'mock-jwt-token',
        name: 'Test User',
      }),
    });
  });

  // Mock successful login
  await page.route('**/auth/login', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        userId: 'mock-user-123',
        token: 'mock-jwt-token',
        name: 'Test User',
      }),
    });
  });

  // Mock auth error (duplicate email)
  await page.route('**/auth/register', async (route: Route) => {
    const request = route.request();
    const postData = request.postDataJSON();
    if (postData.email === 'duplicate@example.com') {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({ message: '이미 등록된 이메일입니다' }),
      });
    } else {
      await route.continue();
    }
  });
}

export async function mockRoutesAPI(page: Page) {
  // Mock get routes
  await page.route('**/routes', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: '1', name: '강남역 → 판교역', checkpoints: [...] },
          { id: '2', name: '홍대입구 → 신촌', checkpoints: [...] },
        ]),
      });
    }
  });

  // Mock create route
  await page.route('**/routes', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const data = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'new-route-123', ...data }),
      });
    }
  });
}
```

### 5.2 샘플 데이터 관리
```typescript
// e2e/fixtures/test-data.ts
export const mockUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  name: 'E2E Test User',
  token: 'mock-jwt-token-xyz',
};

export const mockRoutes = [
  {
    id: 'route-1',
    name: '강남역 → 판교역',
    checkpoints: [
      { id: 'cp-1', type: 'subway', station: '강남역', line: '2호선' },
      { id: 'cp-2', type: 'subway', station: '판교역', line: '신분당선' },
    ],
  },
];

export const mockAlerts = [
  {
    id: 'alert-1',
    type: 'weather',
    routine: 'morning',
    time: '08:00',
    enabled: true,
  },
];
```

### 5.3 Fixture 적용 예시
```typescript
// e2e/specs/routes/route-setup.spec.ts
import { test, expect } from '@playwright/test';
import { mockAuthAPI, mockRoutesAPI } from '../../fixtures/mock-api';
import { mockUser } from '../../fixtures/test-data';

test.describe('Route Setup', () => {
  test.beforeEach(async ({ page }) => {
    // Setup API mocks
    await mockAuthAPI(page);
    await mockRoutesAPI(page);

    // Pre-login for protected route tests
    await page.goto('/');
    await page.evaluate((user) => {
      localStorage.setItem('userId', user.id);
      localStorage.setItem('token', user.token);
    }, mockUser);
  });

  test('should save route and redirect to /commute', async ({ page }) => {
    await page.goto('/routes');

    // ... test steps
  });
});
```

---

## 6. 테스트 헬퍼 패턴

### 6.1 인증 헬퍼
```typescript
// e2e/helpers/login.ts
import { Page } from '@playwright/test';

export async function loginAsUser(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('input#email', email);
  await page.fill('input#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/alerts/, { timeout: 10000 });
}

export async function registerUser(page: Page, email: string, name: string, password: string) {
  await page.goto('/login');
  await page.click('text=회원가입');
  await page.fill('input#email', email);
  await page.fill('input#name', name);
  await page.fill('input#password', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/alerts/, { timeout: 10000 });
}

export async function ensureLoggedIn(page: Page, userId = 'test-user-123', token = 'mock-token') {
  await page.goto('/');
  await page.evaluate(({ userId, token }) => {
    localStorage.setItem('userId', userId);
    localStorage.setItem('token', token);
  }, { userId, token });
}

export async function ensureLoggedOut(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
}
```

### 6.2 네비게이션 헬퍼
```typescript
// e2e/helpers/navigation.ts
import { Page, expect } from '@playwright/test';

export async function navigateToRoutes(page: Page) {
  await page.click('nav >> text=경로');
  await expect(page).toHaveURL(/\/routes/);
}

export async function navigateToAlerts(page: Page) {
  await page.click('nav >> text=알림');
  await expect(page).toHaveURL(/\/alerts/);
}

export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('body:not(.loading)'); // 커스텀 로딩 클래스
}
```

### 6.3 커스텀 Assertion
```typescript
// e2e/helpers/assertions.ts
import { Page, expect } from '@playwright/test';

export async function assertNoEmptyState(page: Page, emptyMessage: string) {
  await expect(page.locator(`text=${emptyMessage}`)).not.toBeVisible();
}

export async function assertLoadingComplete(page: Page) {
  await expect(page.locator('.skeleton')).not.toBeVisible();
  await expect(page.locator('[aria-busy="true"]')).not.toBeVisible();
}

export async function assertErrorMessage(page: Page, errorText: string) {
  await expect(page.locator(`text=${errorText}`)).toBeVisible({ timeout: 5000 });
}

export async function assertToastMessage(page: Page, message: string) {
  await expect(page.locator('.toast')).toContainText(message);
}
```

---

## 7. 접근성 검증

### 7.1 axe-core 설정
```bash
npm install --save-dev @axe-core/playwright
```

```typescript
// e2e/specs/accessibility/a11y.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  const pages = [
    { path: '/', name: 'Home' },
    { path: '/login', name: 'Login' },
    { path: '/routes', name: 'Routes' },
    { path: '/alerts', name: 'Alerts' },
    { path: '/commute', name: 'Commute Tracking' },
  ];

  for (const { path, name } of pages) {
    test(`${name} page should have no a11y violations`, async ({ page }) => {
      await page.goto(path);

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }

  test('Modal should trap focus', async ({ page }) => {
    await page.goto('/routes');
    // ... 모달 열기
    await page.click('button:has-text("삭제")');

    // First focusable element
    const firstButton = page.locator('dialog button').first();
    await expect(firstButton).toBeFocused();

    // Tab to last element
    await page.keyboard.press('Tab');
    const lastButton = page.locator('dialog button').last();
    await expect(lastButton).toBeFocused();

    // Tab again should cycle back
    await page.keyboard.press('Tab');
    await expect(firstButton).toBeFocused();

    // Esc should close
    await page.keyboard.press('Escape');
    await expect(page.locator('dialog')).not.toBeVisible();
  });

  test('All interactive elements accessible via keyboard', async ({ page }) => {
    await page.goto('/');

    // Tab through all interactive elements
    const buttons = await page.locator('button, a, input').all();

    for (const button of buttons) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(['BUTTON', 'A', 'INPUT']).toContain(focused);
    }
  });
});
```

---

## 8. 모바일 뷰포트 테스트

### 8.1 playwright.config.ts 업데이트
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'Desktop Chrome',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }, // PWA 검증용
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] }, // iOS PWA 검증
    },
    // CI에서는 Desktop만 실행 (속도)
    ...(process.env.CI ? [] : [
      {
        name: 'Desktop Firefox',
        use: { ...devices['Desktop Firefox'] },
      },
    ]),
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

### 8.2 모바일 전용 테스트
```typescript
// e2e/specs/mobile/mobile-navigation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('Bottom navigation should be visible', async ({ page }) => {
    await page.goto('/');

    const bottomNav = page.locator('nav.bottom-navigation');
    await expect(bottomNav).toBeVisible();

    // Check all nav items
    await expect(bottomNav.locator('text=홈')).toBeVisible();
    await expect(bottomNav.locator('text=경로')).toBeVisible();
    await expect(bottomNav.locator('text=알림')).toBeVisible();
  });

  test('Touch targets should be at least 44x44px', async ({ page }) => {
    await page.goto('/');

    const buttons = await page.locator('button, a[role="button"]').all();

    for (const button of buttons) {
      const box = await button.boundingBox();
      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });

  test('No horizontal scroll on mobile', async ({ page }) => {
    await page.goto('/');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
```

---

## 9. CI/CD 통합

### 9.1 GitHub Actions 워크플로우 업데이트
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

permissions:
  contents: write
  pull-requests: write

jobs:
  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint:check
      - run: npm run type-check
      - run: npm test
      - run: npm run build

  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    env:
      USE_SQLITE: 'true'
      NODE_ENV: test
      JWT_SECRET: test-secret-for-ci
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: npm run lint:check
      - run: npm run type-check
      - run: npm test -- --passWithNoTests
      - run: npm run build

  # 새로 추가: E2E Tests
  e2e:
    runs-on: ubuntu-latest
    needs: [frontend, backend] # 빌드 성공 후 실행
    defaults:
      run:
        working-directory: frontend
    env:
      E2E_BASE_URL: http://localhost:5173
      E2E_API_URL: http://localhost:3000
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Build frontend
        run: npm run build

      - name: Run E2E tests
        run: npx playwright test
        env:
          CI: true

      - name: Upload Playwright report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: frontend/playwright-report/
          retention-days: 7

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-test-results
          path: frontend/test-results/
          retention-days: 7

  auto-merge:
    if: github.event_name == 'pull_request'
    needs: [frontend, backend, e2e] # E2E도 통과해야 머지
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: gh pr merge ${{ github.event.pull_request.number }} --squash --auto
        env:
          GH_TOKEN: ${{ github.token }}
```

### 9.2 병렬 실행 최적화
```yaml
# CI에서만 1 worker (안정성), 로컬에서는 병렬
workers: process.env.CI ? 1 : undefined
```

**예상 CI 실행 시간**:
- Frontend unit tests: ~30s
- Backend unit tests: ~45s
- E2E tests (10 scenarios): ~3-5분 (mocked API)
- **Total**: ~7분 이내

---

## 10. 패키지 업데이트

### 10.1 package.json 스크립트 추가
```json
// frontend/package.json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:cov": "vitest run --coverage",

    // E2E 스크립트 추가
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report"
  },
  "devDependencies": {
    "@playwright/test": "^1.57.0", // 이미 설치됨
    "@axe-core/playwright": "^4.10.2", // 추가 필요
    // ... 기존 의존성
  }
}
```

### 10.2 설치 명령
```bash
cd /Users/Young/Desktop/claude-workspace/projects/alert_system/frontend
npm install --save-dev @axe-core/playwright
npx playwright install --with-deps chromium
```

---

## 11. 구현 순서

### Phase 1: 인프라 설정 (1일)
1. ✅ Playwright 설정 확인 (이미 완료)
2. ✅ axe-core 설치
3. ✅ 폴더 구조 생성 (`fixtures/`, `helpers/`, `specs/`)
4. ✅ CI 워크플로우 업데이트
5. ✅ API mocking 유틸리티 작성

### Phase 2: 핵심 플로우 테스트 (3일)
1. **Day 1**: 인증 플로우 (login.spec.ts, registration.spec.ts)
   - 기존 auth.spec.ts 리팩토링 (API mocking 적용)
2. **Day 2**: 경로 설정 플로우 (route-setup.spec.ts, route-management.spec.ts)
   - CLAUDE.md 체크리스트 전체 검증
3. **Day 3**: 알림 설정 플로우 (alert-creation.spec.ts, alert-management.spec.ts)
   - 마법사 단계 전체 검증

### Phase 3: 추가 플로우 + 접근성 (2일)
1. **Day 4**: 출퇴근 트래킹 (commute-tracking.spec.ts)
2. **Day 5**: 홈페이지 + 접근성 (guest-landing.spec.ts, a11y.spec.ts)

### Phase 4: 모바일 + 최적화 (1일)
1. 모바일 뷰포트 테스트 추가
2. CI 실행 검증 및 최적화
3. 리포트 분석 및 문서화

**총 예상 기간**: 7일 (1주)

---

## 12. 성공 지표

### 12.1 정량적 지표
| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| E2E 테스트 수 | 50+ scenarios | `npx playwright test --list` |
| 코드 커버리지 (E2E) | 핵심 플로우 100% | 수동 검증 (E2E는 coverage 측정 어려움) |
| CI 실행 시간 | < 10분 | GitHub Actions 로그 |
| 접근성 위반 | 0개 (WCAG 2.1 AA) | axe-core 스캔 결과 |
| 모바일 뷰포트 | 2개 이상 (iOS/Android) | playwright.config.ts projects |

### 12.2 정성적 지표
- [ ] 모든 핵심 사용자 플로우가 E2E로 검증됨
- [ ] API mocking으로 프로덕션 격리 완료
- [ ] 개발자가 로컬에서 쉽게 E2E 실행 가능 (`npm run test:e2e`)
- [ ] CI에서 E2E 실패 시 PR 머지 차단
- [ ] Playwright 리포트가 디버깅에 유용함 (스크린샷, trace)

---

## 13. 리스크 및 완화 전략

### 13.1 리스크
| 리스크 | 영향 | 확률 | 완화 전략 |
|--------|------|------|----------|
| E2E 실행 시간 > 10분 (CI 지연) | 높음 | 중 | 병렬 실행, 시나리오 우선순위화 |
| Flaky tests (간헐적 실패) | 중 | 높음 | 재시도 2회, waitFor 명시적 사용 |
| API mocking 불완전 (실제 API와 불일치) | 중 | 중 | Integration 테스트로 보완, 정기 프로덕션 smoke test |
| 접근성 위반 발견 시 수정 비용 | 중 | 중 | 단계적 수정, critical만 우선 처리 |

### 13.2 Flaky Test 방지 패턴
```typescript
// ❌ Flaky: Implicit wait
await page.click('button');
expect(page.locator('.result')).toBeVisible(); // 바로 체크하면 실패할 수 있음

// ✅ Stable: Explicit wait
await page.click('button');
await expect(page.locator('.result')).toBeVisible({ timeout: 10000 });

// ✅ Wait for network idle
await page.goto('/');
await page.waitForLoadState('networkidle');

// ✅ Wait for specific element
await page.waitForSelector('.data-loaded');
```

---

## 14. 다음 단계 (Q-2 이후)

### 14.1 시각적 회귀 테스트 (선택사항)
- Playwright Screenshot Comparison 도입
- 핵심 페이지 스크린샷 저장 → 변경 감지

```typescript
test('HomePage visual regression', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixels: 100, // 허용 오차
  });
});
```

### 14.2 프로덕션 Smoke Test
- 배포 후 프로덕션 환경에서 간단한 E2E 실행
- 예: 홈페이지 로드, 로그인, 경로 조회만 검증 (API mocking 없음)

### 14.3 성능 테스트 (Lighthouse CI)
```yaml
# .github/workflows/lighthouse.yml
- name: Run Lighthouse CI
  run: lhci autorun
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_TOKEN }}
```

---

## 15. 참고 자료

### 15.1 내부 문서
- [CLAUDE.md - 코드 품질 체크리스트](/Users/Young/Desktop/claude-workspace/projects/alert_system/CLAUDE.md)
- [frontend/playwright.config.ts](/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/playwright.config.ts)
- [기존 E2E 테스트](/Users/Young/Desktop/claude-workspace/projects/alert_system/frontend/e2e/)

### 15.2 외부 문서
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [axe-core Playwright Integration](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| v1.0 | 2026-02-18 | 초안 작성 (PM Agent) |

---

**승인 대기 중** — 구현 시작 전 사용자 확인 필요
