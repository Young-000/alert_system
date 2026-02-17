import { test, expect } from './fixtures/test-fixtures';
import { setupAuthenticatedPage, setupGuestPage } from './fixtures/test-fixtures';

test.describe('SettingsPage - 비로그인', () => {
  test.beforeEach(async ({ page }) => {
    await setupGuestPage(page);
  });

  test('비로그인 시 로그인 안내가 표시된다', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.getByText('로그인이 필요해요')).toBeVisible();
    await expect(page.getByText('설정을 관리하려면 먼저 로그인하세요')).toBeVisible();
    await expect(page.getByRole('link', { name: '로그인' })).toBeVisible();
  });
});

test.describe('SettingsPage - 인증된 사용자', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  test('설정 페이지가 올바르게 렌더링된다', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.getByText('내 설정')).toBeVisible();
  });

  test('탭이 올바르게 표시된다', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.getByRole('tab', { name: '프로필' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '경로' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '알림' })).toBeVisible();
    await expect(page.getByRole('tab', { name: '앱' })).toBeVisible();
  });

  test('프로필 탭이 기본으로 선택된다', async ({ page }) => {
    await page.goto('/settings');

    const profileTab = page.getByRole('tab', { name: '프로필' });
    await expect(profileTab).toHaveAttribute('aria-selected', 'true');
  });

  test('탭 간 전환이 동작한다', async ({ page }) => {
    await page.goto('/settings');

    // Click routes tab
    await page.getByRole('tab', { name: '경로' }).click();
    await expect(page.getByRole('tab', { name: '경로' })).toHaveAttribute('aria-selected', 'true');

    // Click alerts tab
    await page.getByRole('tab', { name: '알림' }).click();
    await expect(page.getByRole('tab', { name: '알림' })).toHaveAttribute('aria-selected', 'true');

    // Click app tab
    await page.getByRole('tab', { name: '앱' }).click();
    await expect(page.getByRole('tab', { name: '앱' })).toHaveAttribute('aria-selected', 'true');
  });

  test('프로필 탭에서 로그아웃 버튼이 표시된다', async ({ page }) => {
    await page.goto('/settings');

    await expect(page.getByRole('button', { name: /로그아웃/ })).toBeVisible();
  });

  test('로그아웃 버튼 클릭 시 홈으로 이동한다', async ({ page }) => {
    await page.goto('/settings');

    await page.getByRole('button', { name: /로그아웃/ }).click();

    // After logout, should navigate to home page
    await expect(page).toHaveURL('/');
  });

  test('설정 탭이 하단 내비게이션에서 활성화되어 있다', async ({ page }) => {
    await page.goto('/settings');

    const settingsLink = page.getByRole('navigation', { name: '메인 메뉴' })
      .getByRole('link', { name: '설정' });
    await expect(settingsLink).toHaveAttribute('aria-current', 'page');
  });
});
