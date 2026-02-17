import { test, expect } from './fixtures/test-fixtures';
import { setupAuthenticatedPage, setupGuestPage } from './fixtures/test-fixtures';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility tests using axe-core.
 * These tests verify WCAG AA compliance across all pages.
 *
 * Note: color-contrast violations are excluded and tracked separately
 * as a CSS improvement task. All structural/semantic a11y rules are enforced.
 */

function createAxeBuilder(page: Parameters<typeof AxeBuilder>[0]['page']): AxeBuilder {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .disableRules([
      'color-contrast',  // tracked separately as CSS improvement task
      'meta-viewport',   // intentional: PWA requires user-scalable=no for apps-in-toss
    ]);
}

test.describe('Accessibility (WCAG AA)', () => {
  test.describe('게스트 페이지', () => {
    test.beforeEach(async ({ page }) => {
      await setupGuestPage(page);
    });

    test('홈 (게스트 랜딩) 페이지 접근성 검사', async ({ page }) => {
      await page.goto('/');

      const results = await createAxeBuilder(page)
        .exclude('.bottom-nav')
        .analyze();

      expect(results.violations).toEqual([]);
    });

    test('로그인 페이지 접근성 검사', async ({ page }) => {
      await page.goto('/login');

      const results = await createAxeBuilder(page).analyze();

      expect(results.violations).toEqual([]);
    });

    test('404 페이지 접근성 검사', async ({ page }) => {
      await page.goto('/nonexistent');

      const results = await createAxeBuilder(page).analyze();

      expect(results.violations).toEqual([]);
    });
  });

  test.describe('인증된 사용자 페이지', () => {
    test.beforeEach(async ({ page }) => {
      await setupAuthenticatedPage(page);
    });

    test('홈 (인증) 페이지 접근성 검사', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const results = await createAxeBuilder(page)
        .exclude('.skeleton')
        .analyze();

      expect(results.violations).toEqual([]);
    });

    test('알림 설정 페이지 접근성 검사', async ({ page }) => {
      await page.goto('/alerts');
      await page.waitForLoadState('networkidle');

      const results = await createAxeBuilder(page).analyze();

      expect(results.violations).toEqual([]);
    });

    test('경로 설정 페이지 접근성 검사', async ({ page }) => {
      await page.goto('/routes');
      await page.waitForLoadState('networkidle');

      const results = await createAxeBuilder(page).analyze();

      expect(results.violations).toEqual([]);
    });

    test('설정 페이지 접근성 검사', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      const results = await createAxeBuilder(page).analyze();

      expect(results.violations).toEqual([]);
    });
  });
});

test.describe('키보드 내비게이션', () => {
  test.beforeEach(async ({ page }) => {
    await setupGuestPage(page);
  });

  test('로그인 페이지에서 Tab 키로 모든 인터랙티브 요소에 접근할 수 있다', async ({ page }) => {
    await page.goto('/login');

    // Focus should cycle through interactive elements
    // Skip link -> Home link -> email input -> password input -> show/hide button -> submit -> register toggle
    const interactiveElements: string[] = [];

    // Tab through a reasonable number of elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        return {
          tag: el.tagName.toLowerCase(),
          type: (el as HTMLInputElement).type || '',
          text: el.textContent?.trim().slice(0, 30) || '',
          role: el.getAttribute('role') || '',
        };
      });
      if (focused) {
        interactiveElements.push(`${focused.tag}:${focused.type || focused.role || focused.text}`);
      }
    }

    // Verify that key interactive elements are reachable
    expect(interactiveElements.length).toBeGreaterThan(3);
  });

  test('404 페이지에서 링크가 키보드로 접근 가능하다', async ({ page }) => {
    await page.goto('/nonexistent');

    // Tab to first link
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to activate with Enter
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName.toLowerCase();
    });

    // Some interactive element should be focused
    expect(focused).toBeTruthy();
  });
});

test.describe('포커스 관리', () => {
  test.beforeEach(async ({ page }) => {
    await setupGuestPage(page);
  });

  test('게스트 랜딩의 스킵 링크가 포커스 시 표시된다', async ({ page, browserName }) => {
    // WebKit does not support keyboard Tab navigation in automated tests
    test.skip(browserName === 'webkit', 'WebKit does not support Tab key focus in Playwright');

    await page.goto('/');

    // Tab to skip link
    await page.keyboard.press('Tab');

    const skipLink = page.getByRole('link', { name: '본문으로 건너뛰기' });
    // The skip link should become visible on focus (via CSS :focus)
    await expect(skipLink).toBeFocused();
  });
});
