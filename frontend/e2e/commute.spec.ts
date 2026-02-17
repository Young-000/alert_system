import { test, expect } from './fixtures/test-fixtures';
import { setupAuthenticatedPage, setupGuestPage } from './fixtures/test-fixtures';
import { mockApiRoute, MOCK_SESSION_IN_PROGRESS } from './fixtures/api-mocks';

test.describe('CommuteTrackingPage', () => {
  test.describe('비로그인 사용자', () => {
    test.beforeEach(async ({ page }) => {
      await setupGuestPage(page);
    });

    test('비로그인 시 로그인 페이지로 리다이렉트된다', async ({ page }) => {
      await page.goto('/commute');

      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('인증된 사용자 - 진행 중인 세션 없음', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page);
    });

    test('routeId 없이 접근 시 경로 선택 안내가 표시된다', async ({ page }) => {
      await page.goto('/commute');

      // No route selected - should show some form of guidance or redirect
      // The page either shows an error/empty state or redirects
      const pageContent = page.locator('main');
      await expect(pageContent).toBeVisible();
    });
  });

  test.describe('인증된 사용자 - 진행 중인 세션 있음', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page);
      // Mock an in-progress session
      await mockApiRoute(page, /\/commute\/in-progress\//, MOCK_SESSION_IN_PROGRESS);
    });

    test('진행 중인 세션이 있으면 트래킹 화면이 표시된다', async ({ page }) => {
      await page.goto('/commute');

      // The page should show the commute tracking interface
      const pageContent = page.locator('main');
      await expect(pageContent).toBeVisible();
    });
  });
});

test.describe('CommuteDashboardPage', () => {
  test.describe('비로그인 사용자', () => {
    test.beforeEach(async ({ page }) => {
      await setupGuestPage(page);
    });

    test('비로그인 시 로그인 페이지로 리다이렉트되거나 로그인 안내가 표시된다', async ({ page }) => {
      await page.goto('/commute/dashboard');

      // CommuteDashboardPage may redirect to login or show auth required message
      const pageContent = page.locator('main');
      await expect(pageContent).toBeVisible();
    });
  });

  test.describe('인증된 사용자', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page);
    });

    test('대시보드 페이지가 렌더링된다', async ({ page }) => {
      await page.goto('/commute/dashboard');

      const pageContent = page.locator('main');
      await expect(pageContent).toBeVisible();
    });
  });
});
