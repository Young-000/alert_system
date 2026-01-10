import { test, expect } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000';

test.describe('Authentication E2E Tests', () => {
  const testEmail = `e2e-test-${Date.now()}@example.com`;
  const testPassword = 'testPassword123';
  const testName = 'E2E Test User';

  test.describe('Registration', () => {
    test('should display registration form when switching from login', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Initially shows login form
      await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();

      // Click to switch to registration
      await page.getByRole('button', { name: '회원가입' }).click();

      // Should show registration form
      await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible();
      await expect(page.getByPlaceholder('홍길동')).toBeVisible();
    });

    test('should register a new user successfully', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Switch to registration mode
      await page.getByRole('button', { name: '회원가입' }).click();

      // Fill registration form
      await page.getByRole('textbox', { name: '이메일' }).fill(testEmail);
      await page.getByRole('textbox', { name: '이름' }).fill(testName);
      await page.getByRole('textbox', { name: '비밀번호' }).fill(testPassword);

      // Submit registration
      await page.getByRole('button', { name: '회원가입' }).last().click();

      // Should redirect to alerts page
      await expect(page).toHaveURL(/\/alerts/, { timeout: 10000 });
    });

    test('should show error for duplicate email', async ({ page }) => {
      // First register a user
      const duplicateEmail = `duplicate-${Date.now()}@example.com`;

      await page.goto(`${BASE_URL}/login`);
      await page.getByRole('button', { name: '회원가입' }).click();
      await page.getByRole('textbox', { name: '이메일' }).fill(duplicateEmail);
      await page.getByRole('textbox', { name: '이름' }).fill('First User');
      await page.getByRole('textbox', { name: '비밀번호' }).fill(testPassword);
      await page.getByRole('button', { name: '회원가입' }).last().click();
      await expect(page).toHaveURL(/\/alerts/, { timeout: 10000 });

      // Clear localStorage and try to register again with same email
      await page.evaluate(() => localStorage.clear());
      await page.goto(`${BASE_URL}/login`);
      await page.getByRole('button', { name: '회원가입' }).click();
      await page.getByRole('textbox', { name: '이메일' }).fill(duplicateEmail);
      await page.getByRole('textbox', { name: '이름' }).fill('Second User');
      await page.getByRole('textbox', { name: '비밀번호' }).fill(testPassword);
      await page.getByRole('button', { name: '회원가입' }).last().click();

      // Should show error message
      await expect(page.getByText('이미 등록된 이메일입니다')).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Login', () => {
    test.beforeAll(async ({ request }) => {
      // Create a test user via API for login tests
      await request.post(`${API_URL}/auth/register`, {
        data: {
          email: 'login-test@example.com',
          password: 'loginTest123',
          name: 'Login Test User',
        },
      }).catch(() => {
        // User might already exist
      });
    });

    test('should display login form', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
      await expect(page.getByPlaceholder('email@example.com')).toBeVisible();
      await expect(page.getByRole('textbox', { name: '비밀번호' })).toBeVisible();
      await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
    });

    test('should login with valid credentials', async ({ page }) => {
      // Create a unique user for this test
      const uniqueEmail = `login-valid-${Date.now()}@example.com`;
      const uniquePassword = 'validPass123';

      // Register the user first
      await page.goto(`${BASE_URL}/login`);
      await page.getByRole('button', { name: '회원가입' }).click();
      await page.getByRole('textbox', { name: '이메일' }).fill(uniqueEmail);
      await page.getByRole('textbox', { name: '이름' }).fill('Valid User');
      await page.getByRole('textbox', { name: '비밀번호' }).fill(uniquePassword);
      await page.getByRole('button', { name: '회원가입' }).last().click();
      await expect(page).toHaveURL(/\/alerts/, { timeout: 10000 });

      // Logout by clearing localStorage
      await page.evaluate(() => localStorage.clear());

      // Now login
      await page.goto(`${BASE_URL}/login`);
      await page.getByRole('textbox', { name: '이메일' }).fill(uniqueEmail);
      await page.getByRole('textbox', { name: '비밀번호' }).fill(uniquePassword);
      await page.getByRole('button', { name: '로그인' }).click();

      // Should redirect to alerts page
      await expect(page).toHaveURL(/\/alerts/, { timeout: 10000 });

      // Verify user is logged in (userId should be in localStorage)
      const userId = await page.evaluate(() => localStorage.getItem('userId'));
      expect(userId).toBeTruthy();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      await page.getByRole('textbox', { name: '이메일' }).fill('nonexistent@example.com');
      await page.getByRole('textbox', { name: '비밀번호' }).fill('wrongPassword');
      await page.getByRole('button', { name: '로그인' }).click();

      // Should show error message (matches Korean error message in LoginPage)
      await expect(page.getByText(/이메일 또는 비밀번호가 일치하지 않습니다/)).toBeVisible({ timeout: 5000 });
    });

    test('should show error for wrong password', async ({ page }) => {
      // Create a user first
      const uniqueEmail = `wrong-pass-${Date.now()}@example.com`;

      await page.goto(`${BASE_URL}/login`);
      await page.getByRole('button', { name: '회원가입' }).click();
      await page.getByRole('textbox', { name: '이메일' }).fill(uniqueEmail);
      await page.getByRole('textbox', { name: '이름' }).fill('Wrong Pass User');
      await page.getByRole('textbox', { name: '비밀번호' }).fill('correctPassword123');
      await page.getByRole('button', { name: '회원가입' }).last().click();
      await expect(page).toHaveURL(/\/alerts/, { timeout: 10000 });

      // Clear and try to login with wrong password
      await page.evaluate(() => localStorage.clear());
      await page.goto(`${BASE_URL}/login`);
      await page.getByRole('textbox', { name: '이메일' }).fill(uniqueEmail);
      await page.getByRole('textbox', { name: '비밀번호' }).fill('wrongPassword');
      await page.getByRole('button', { name: '로그인' }).click();

      // Should show error (same generic error message for wrong password)
      await expect(page.getByText(/이메일 또는 비밀번호가 일치하지 않습니다/)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Session Management', () => {
    test('should persist login state after page refresh', async ({ page }) => {
      const uniqueEmail = `persist-${Date.now()}@example.com`;

      // Register and login
      await page.goto(`${BASE_URL}/login`);
      await page.getByRole('button', { name: '회원가입' }).click();
      await page.getByRole('textbox', { name: '이메일' }).fill(uniqueEmail);
      await page.getByRole('textbox', { name: '이름' }).fill('Persist User');
      await page.getByRole('textbox', { name: '비밀번호' }).fill('persistPass123');
      await page.getByRole('button', { name: '회원가입' }).last().click();
      await expect(page).toHaveURL(/\/alerts/, { timeout: 10000 });

      // Refresh page
      await page.reload();

      // Should still be on alerts page (not redirected to login)
      await expect(page).toHaveURL(/\/alerts/);

      // userId should still be in localStorage
      const userId = await page.evaluate(() => localStorage.getItem('userId'));
      expect(userId).toBeTruthy();
    });

    test('should redirect to login when accessing protected page without auth', async ({ page }) => {
      // Clear any existing session
      await page.goto(`${BASE_URL}`);
      await page.evaluate(() => localStorage.clear());

      // Try to access alerts page
      await page.goto(`${BASE_URL}/alerts`);

      // Should show warning message
      await expect(page.getByText('먼저 계정을 만들어주세요')).toBeVisible();
    });
  });
});
