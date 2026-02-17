import { test, expect } from './fixtures/test-fixtures';
import { setupAuthenticatedPage, setupGuestPage } from './fixtures/test-fixtures';
import { mockAlertsResponse } from './fixtures/api-mocks';

test.describe('AlertSettingsPage - 비로그인', () => {
  test.beforeEach(async ({ page }) => {
    await setupGuestPage(page);
  });

  test('비로그인 시 로그인 안내가 표시된다', async ({ page }) => {
    await page.goto('/alerts');

    await expect(page.getByText('로그인이 필요해요')).toBeVisible();
    await expect(page.getByText('알림을 설정하려면 먼저 로그인하세요')).toBeVisible();
    await expect(page.getByRole('link', { name: '로그인' })).toBeVisible();
  });

  test('로그인 링크를 클릭하면 로그인 페이지로 이동한다', async ({ page }) => {
    await page.goto('/alerts');

    await page.getByRole('link', { name: '로그인' }).click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('AlertSettingsPage - 인증된 사용자 (기존 알림 있음)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  test('기존 알림 목록이 표시된다', async ({ page }) => {
    await page.goto('/alerts');

    await expect(page.getByText('아침 날씨 알림')).toBeVisible();
    await expect(page.getByText('교통 알림')).toBeVisible();
  });

  test('위저드 단계 표시가 보인다', async ({ page }) => {
    await page.goto('/alerts');

    // The wizard auto-opens alongside the alerts list
    // Check that the type selection step heading is visible
    await expect(page.getByText('어떤 정보를 받고 싶으세요?')).toBeVisible();
  });

  test('알림 기록 링크가 존재한다', async ({ page }) => {
    await page.goto('/alerts');

    await expect(page.getByRole('link', { name: /알림.*기록/ })).toBeVisible();
  });

  test('알림 기록 링크를 클릭하면 알림 기록 페이지로 이동한다', async ({ page }) => {
    await page.goto('/alerts');

    await page.getByRole('link', { name: /알림.*기록/ }).click();
    await expect(page).toHaveURL(/\/notifications/);
  });
});

test.describe('AlertSettingsPage - 인증된 사용자 (알림 없음, 위저드)', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
    // Override alerts to return empty array so wizard is the sole content
    await mockAlertsResponse(page, []);
  });

  test('알림이 없으면 위저드가 자동으로 표시된다', async ({ page }) => {
    await page.goto('/alerts');

    await expect(page.getByText('어떤 정보를 받고 싶으세요?')).toBeVisible();
  });

  test('위저드 타입 선택 단계에서 날씨와 교통 옵션이 표시된다', async ({ page }) => {
    await page.goto('/alerts');

    // Use the aria-label on the choice-card buttons
    await expect(page.getByRole('button', { name: '날씨 알림 선택' })).toBeVisible();
    await expect(page.getByRole('button', { name: '교통 알림 선택' })).toBeVisible();
  });

  test('날씨를 선택하고 다음으로 진행할 수 있다', async ({ page }) => {
    await page.goto('/alerts');

    // Select weather using the aria-labeled button
    await page.getByRole('button', { name: '날씨 알림 선택' }).click();

    // Next button
    const nextButton = page.getByRole('button', { name: /다음/ });
    await expect(nextButton).toBeVisible();
    await nextButton.click();

    // Should be on routine step (skipping transport steps)
    await expect(page.getByText('하루 루틴을 알려주세요')).toBeVisible();
  });
});
