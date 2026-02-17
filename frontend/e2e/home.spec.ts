import { test, expect } from './fixtures/test-fixtures';
import { setupAuthenticatedPage, setupGuestPage } from './fixtures/test-fixtures';

test.describe('HomePage - 게스트 (비로그인)', () => {
  test.beforeEach(async ({ page }) => {
    await setupGuestPage(page);
  });

  test('게스트 랜딩 페이지가 올바르게 표시된다', async ({ page }) => {
    await page.goto('/');

    // Brand name
    await expect(page.getByText('출퇴근 메이트').first()).toBeVisible();

    // Hero headline
    await expect(page.getByRole('heading', { name: /출퇴근을.*책임지는 앱/ })).toBeVisible();

    // CTA button
    await expect(page.getByRole('link', { name: '무료로 시작하기' })).toBeVisible();

    // Feature cards
    await expect(page.getByText('경로 등록')).toBeVisible();
    await expect(page.getByText('자동 알림')).toBeVisible();
    await expect(page.getByText('기록 & 분석')).toBeVisible();
  });

  test('시작하기 버튼으로 로그인 페이지로 이동한다', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: '시작하기' }).first().click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('CTA 버튼으로 로그인 페이지로 이동한다', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('link', { name: '무료로 시작하기' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('스킵 링크가 존재한다', async ({ page }) => {
    await page.goto('/');

    const skipLink = page.getByRole('link', { name: '본문으로 건너뛰기' });
    await expect(skipLink).toBeAttached();
  });

  test('푸터가 표시된다', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('footer').getByText('출퇴근 메이트')).toBeVisible();
  });
});

test.describe('HomePage - 인증된 사용자', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthenticatedPage(page);
  });

  test('인사말과 사용자 이름이 표시된다', async ({ page }) => {
    await page.goto('/');

    // Greeting heading should exist (time-based: 좋은 아침, 좋은 오후, 좋은 저녁)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // User name
    await expect(page.getByText('Test User님')).toBeVisible();
  });

  test('스킵 링크가 존재한다', async ({ page }) => {
    await page.goto('/');

    const skipLink = page.getByRole('link', { name: '본문으로 건너뛰기' });
    await expect(skipLink).toBeAttached();
  });

  test('하단 내비게이션이 표시된다', async ({ page }) => {
    await page.goto('/');

    const nav = page.getByRole('navigation', { name: '메인 메뉴' });
    await expect(nav).toBeVisible();
    await expect(nav.getByText('홈')).toBeVisible();
    await expect(nav.getByText('경로')).toBeVisible();
    await expect(nav.getByText('알림')).toBeVisible();
    await expect(nav.getByText('설정')).toBeVisible();
  });

  test('홈 탭이 활성화되어 있다', async ({ page }) => {
    await page.goto('/');

    const homeLink = page.getByRole('navigation', { name: '메인 메뉴' })
      .getByRole('link', { name: '홈' });
    await expect(homeLink).toHaveAttribute('aria-current', 'page');
  });
});
