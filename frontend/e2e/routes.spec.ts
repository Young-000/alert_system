import { test, expect } from './fixtures/test-fixtures';
import { setupAuthenticatedPage, setupGuestPage } from './fixtures/test-fixtures';
import { mockApiRoute } from './fixtures/api-mocks';

test.describe('RouteSetupPage - 비로그인', () => {
  test.beforeEach(async ({ page }) => {
    await setupGuestPage(page);
  });

  test('비로그인 시 로그인 안내가 표시된다', async ({ page }) => {
    await page.goto('/routes');

    await expect(page.getByText('로그인이 필요해요')).toBeVisible();
    await expect(page.getByText('출퇴근 경로를 저장하려면 먼저 로그인하세요')).toBeVisible();
    await expect(page.getByRole('link', { name: '로그인' })).toBeVisible();
  });

  test('로그인 링크를 클릭하면 로그인 페이지로 이동한다', async ({ page }) => {
    await page.goto('/routes');

    await page.getByRole('link', { name: '로그인' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('RouteSetupPage - 인증된 사용자', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  test('기존 경로 목록이 표시된다', async ({ page }) => {
    await page.goto('/routes');

    await expect(page.getByText('출근 경로')).toBeVisible();
    await expect(page.getByText('퇴근 경로')).toBeVisible();
  });

  test('경로가 없을 때 빈 상태가 표시된다', async ({ page }) => {
    await mockApiRoute(page, /\/routes\/user\//, []);
    await page.goto('/routes');

    await expect(page.getByText(/경로.*없/)).toBeVisible();
  });

  test('새 경로 만들기 버튼이 존재한다', async ({ page }) => {
    await page.goto('/routes');

    const createButton = page.getByRole('button', { name: /새 경로|경로 만들기/ });
    await expect(createButton).toBeVisible();
  });

  test('새 경로 만들기를 시작하면 경로 유형 선택이 표시된다', async ({ page }) => {
    await page.goto('/routes');

    await page.getByRole('button', { name: /새 경로|경로 만들기/ }).click();

    // Route type step shows options
    await expect(page.getByText(/출근|morning/i)).toBeVisible();
  });
});
