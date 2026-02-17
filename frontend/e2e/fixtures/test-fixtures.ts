import { test as base, expect } from '@playwright/test';
import {
  mockApiRoutes,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from './api-mocks';

/**
 * Extended test fixtures for the Alert System E2E tests.
 *
 * - `authedPage`: A page with localStorage pre-set for an authenticated user
 *   and all API routes mocked.
 * - `guestPage`: A page with no auth data and all API routes mocked.
 */
export const test = base.extend<{
  authedPage: ReturnType<typeof base['extend']> extends never ? never : typeof base extends { extend: infer E } ? never : never;
}>({
  // Default: mock API routes for every test in the base page fixture
  page: async ({ page }, use) => {
    await mockApiRoutes(page);
    await use(page);
  },
});

/**
 * Create a page fixture that is pre-authenticated.
 * Usage: call `setupAuthenticatedPage(page)` in beforeEach.
 */
export async function setupAuthenticatedPage(page: Parameters<typeof mockAuthenticatedUser>[0]): Promise<void> {
  await mockAuthenticatedUser(page);
}

/**
 * Create a page fixture that is unauthenticated (guest).
 * Usage: call `setupGuestPage(page)` in beforeEach.
 */
export async function setupGuestPage(page: Parameters<typeof mockUnauthenticatedUser>[0]): Promise<void> {
  await mockUnauthenticatedUser(page);
}

export { expect };
