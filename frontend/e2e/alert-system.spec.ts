import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

test.describe('Alert System E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
  });

  test('HomePage should render correctly', async ({ page }) => {
    await expect(page.locator('text=Alert System')).toBeVisible();
    await expect(page.locator('text=출근과 퇴근 사이')).toBeVisible();
    await expect(page.locator('text=알림 시작하기').first()).toBeVisible();
  });

  test('Should navigate to login page', async ({ page }) => {
    await page.click('text=시작하기');
    await expect(page).toHaveURL(/\/login/);
    // Login page initially shows login form (email + password)
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    // Name field is only visible after switching to registration mode
    await page.getByRole('button', { name: '회원가입' }).click();
    await expect(page.locator('input#name')).toBeVisible();
  });

  test('Should create account and navigate to alerts page', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Switch to registration mode first
    await page.getByRole('button', { name: '회원가입' }).click();

    const timestamp = Date.now();
    await page.fill('input#email', `test${timestamp}@example.com`);
    await page.fill('input#name', `Test User ${timestamp}`);
    await page.fill('input#password', 'testPassword123');

    await page.click('button[type="submit"]');

    // Wait for navigation to alerts page
    await page.waitForURL(/\/alerts/, { timeout: 10000 });
    await expect(page.locator('text=어떤 정보를 받고 싶으세요?')).toBeVisible();
  });

  test('Should show alert wizard steps', async ({ page }) => {
    // Set userId to simulate logged in state
    await page.evaluate(() => {
      localStorage.setItem('userId', 'test-user-id');
    });

    await page.goto(`${BASE_URL}/alerts`);

    // Step 1: Type selection
    await expect(page.locator('text=어떤 정보를 받고 싶으세요?')).toBeVisible();
    await expect(page.locator('text=날씨')).toBeVisible();
    await expect(page.locator('text=교통')).toBeVisible();

    // Select weather
    await page.click('text=날씨');
    await page.click('text=다음 →');

    // Step 2: Routine (skipping transport steps)
    await expect(page.locator('text=하루 루틴을 알려주세요')).toBeVisible();
  });

  test('Should show login warning when not logged in', async ({ page }) => {
    // Clear localStorage
    await page.evaluate(() => {
      localStorage.clear();
    });

    await page.goto(`${BASE_URL}/alerts`);
    await expect(page.locator('text=먼저 계정을 만들어주세요')).toBeVisible();
  });

  test('Should navigate back to home from alerts page', async ({ page }) => {
    await page.goto(`${BASE_URL}/alerts`);
    await page.click('text=홈');
    await expect(page).toHaveURL(BASE_URL);
  });
});
