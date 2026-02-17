import { test, expect } from './fixtures/test-fixtures';
import { setupAuthenticatedPage, setupGuestPage } from './fixtures/test-fixtures';

test.describe('Navigation - 하단 내비게이션', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  test('하단 내비게이션의 모든 링크가 표시된다', async ({ page }) => {
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: '메인 메뉴' });
    await expect(nav).toBeVisible();

    await expect(nav.getByRole('link', { name: '홈' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '경로' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '알림' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '설정' })).toBeVisible();
  });

  test('경로 탭을 클릭하면 경로 페이지로 이동한다', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('navigation', { name: '메인 메뉴' })
      .getByRole('link', { name: '경로' }).click();
    await expect(page).toHaveURL('/routes');
  });

  test('알림 탭을 클릭하면 알림 페이지로 이동한다', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('navigation', { name: '메인 메뉴' })
      .getByRole('link', { name: '알림' }).click();
    await expect(page).toHaveURL('/alerts');
  });

  test('설정 탭을 클릭하면 설정 페이지로 이동한다', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('navigation', { name: '메인 메뉴' })
      .getByRole('link', { name: '설정' }).click();
    await expect(page).toHaveURL('/settings');
  });

  test('현재 페이지의 탭이 활성화 상태로 표시된다', async ({ page }) => {
    await page.goto('/routes');

    const routeLink = page.getByRole('navigation', { name: '메인 메뉴' })
      .getByRole('link', { name: '경로' });
    await expect(routeLink).toHaveAttribute('aria-current', 'page');
  });

  test('로그인 페이지에서 하단 내비게이션이 숨겨진다', async ({ page }) => {
    await page.goto('/login');

    const nav = page.getByRole('navigation', { name: '메인 메뉴' });
    await expect(nav).not.toBeVisible();
  });

  test('온보딩 페이지에서 하단 내비게이션이 숨겨진다', async ({ page }) => {
    await page.goto('/onboarding');

    const nav = page.getByRole('navigation', { name: '메인 메뉴' });
    await expect(nav).not.toBeVisible();
  });
});

test.describe('Navigation - 404 페이지', () => {
  test.beforeEach(async ({ page }) => {
    await setupGuestPage(page);
  });

  test('존재하지 않는 경로에서 404 페이지가 표시된다', async ({ page }) => {
    await page.goto('/this-does-not-exist');

    await expect(page.getByText('404')).toBeVisible();
    await expect(page.getByText('페이지를 찾을 수 없습니다')).toBeVisible();
  });

  test('404 페이지에서 홈으로 이동할 수 있다', async ({ page }) => {
    await page.goto('/nonexistent-page');

    await page.getByRole('link', { name: '홈으로' }).click();
    await expect(page).toHaveURL('/');
  });

  test('404 페이지에서 알림 설정으로 이동할 수 있다', async ({ page }) => {
    await page.goto('/nonexistent-page');

    await page.getByRole('link', { name: '알림 설정' }).click();
    await expect(page).toHaveURL('/alerts');
  });
});

test.describe('Navigation - 뒤로가기', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  test('홈에서 경로 페이지로 이동 후 뒤로가기가 동작한다', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('navigation', { name: '메인 메뉴' })
      .getByRole('link', { name: '경로' }).click();
    await expect(page).toHaveURL('/routes');

    await page.goBack();
    await expect(page).toHaveURL('/');
  });
});
