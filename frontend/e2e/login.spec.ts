import { test, expect } from './fixtures/test-fixtures';
import { setupGuestPage } from './fixtures/test-fixtures';
import { mockApiRoute } from './fixtures/api-mocks';

test.describe('LoginPage', () => {
  test.beforeEach(async ({ page }) => {
    await setupGuestPage(page);
  });

  test('로그인 폼이 올바르게 표시된다', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
    await expect(page.getByLabel('이메일')).toBeVisible();
    await expect(page.getByLabel('비밀번호', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '로그인' })).toBeVisible();
  });

  test('로그인/회원가입 모드를 전환할 수 있다', async ({ page }) => {
    await page.goto('/login');

    // Initially login mode
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
    await expect(page.getByText('다시 오셨군요!')).toBeVisible();

    // Switch to register
    await page.getByRole('button', { name: '회원가입' }).click();

    await expect(page.getByRole('heading', { name: '회원가입' })).toBeVisible();
    await expect(page.getByText('처음이신가요?')).toBeVisible();
    await expect(page.getByLabel('이름')).toBeVisible();
    await expect(page.getByLabel('전화번호')).toBeVisible();

    // Switch back to login
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
  });

  test('빈 필드로 제출하면 HTML 유효성 검사가 동작한다', async ({ page }) => {
    await page.goto('/login');

    // HTML5 required attribute prevents submission
    const emailInput = page.getByLabel('이메일');
    await expect(emailInput).toHaveAttribute('required', '');

    const passwordInput = page.getByLabel('비밀번호', { exact: true });
    await expect(passwordInput).toHaveAttribute('required', '');
  });

  test('로그인 성공 시 홈으로 리다이렉트된다', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('이메일').fill('test@example.com');
    await page.getByLabel('비밀번호', { exact: true }).fill('password123');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL('/');
  });

  test('로그인 실패 시 에러 메시지가 표시된다', async ({ page }) => {
    // Override login to return error
    await mockApiRoute(page, /\/auth\/login$/, { message: 'Invalid credentials' }, 401);

    await page.goto('/login');

    await page.getByLabel('이메일').fill('wrong@example.com');
    await page.getByLabel('비밀번호', { exact: true }).fill('wrongpassword');
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page.getByText('이메일 또는 비밀번호가 일치하지 않습니다')).toBeVisible();
  });

  test('회원가입 성공 시 온보딩으로 리다이렉트된다', async ({ page }) => {
    await page.goto('/login');

    // Switch to register mode
    await page.getByRole('button', { name: '회원가입' }).click();

    await page.getByLabel('이메일').fill('new@example.com');
    await page.getByLabel('이름').fill('New User');
    await page.getByLabel('전화번호').fill('01098765432');
    await page.getByLabel('비밀번호', { exact: true }).fill('newpassword123');

    await page.getByRole('button', { name: '회원가입' }).click();

    await expect(page).toHaveURL(/\/onboarding/);
  });

  test('중복 이메일로 회원가입 시 에러가 표시된다', async ({ page }) => {
    // Override register to return 409
    await mockApiRoute(page, /\/auth\/register$/, { message: 'Email already exists' }, 409);

    await page.goto('/login');
    await page.getByRole('button', { name: '회원가입' }).click();

    await page.getByLabel('이메일').fill('existing@example.com');
    await page.getByLabel('이름').fill('Existing User');
    await page.getByLabel('전화번호').fill('01012345678');
    await page.getByLabel('비밀번호', { exact: true }).fill('password123');

    await page.getByRole('button', { name: '회원가입' }).click();

    await expect(page.getByText('이미 등록된 이메일입니다')).toBeVisible();
  });

  test('비밀번호 표시/숨기기 토글이 동작한다', async ({ page }) => {
    await page.goto('/login');

    const passwordInput = page.getByLabel('비밀번호', { exact: true });
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click show password button
    await page.getByRole('button', { name: '비밀번호 표시' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click hide password button
    await page.getByRole('button', { name: '비밀번호 숨기기' }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('홈 링크가 동작한다', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('link', { name: '홈' }).click();
    await expect(page).toHaveURL('/');
  });

  test('로그인 페이지에서 하단 내비게이션이 숨겨진다', async ({ page }) => {
    await page.goto('/login');

    const bottomNav = page.getByRole('navigation', { name: '메인 메뉴' });
    await expect(bottomNav).not.toBeVisible();
  });
});
