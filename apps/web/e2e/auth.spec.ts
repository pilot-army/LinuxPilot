import { expect, test, type Page } from '@playwright/test';

const email = process.env.E2E_EMAIL ?? 'e2e-admin@example.com';
const password = process.env.E2E_PASSWORD ?? 'CorrectHorse-Battery9';

const TOKEN_LEAK = /lp_access_token|lp_refresh_token|eyJ[A-Za-z0-9_-]{10,}\./;

async function assertNoTokenLeak(page: Page, consoleText: string[] = []) {
  const leaked = await page.evaluate(() => {
    const storage = {
      localStorage: { ...window.localStorage },
      sessionStorage: { ...window.sessionStorage },
    };
    const html = document.documentElement.outerHTML;
    return { storage, html, href: window.location.href };
  });

  const serialized = JSON.stringify(leaked);
  expect(serialized).not.toMatch(TOKEN_LEAK);
  expect(leaked.href).not.toMatch(/accessToken|refreshToken|token=/i);
  expect(consoleText.join('\n')).not.toMatch(TOKEN_LEAK);
}

test.describe('auth smoke', () => {
  test('wrong password stays on login with a safe error', async ({ page }) => {
    const consoleText: string[] = [];
    page.on('console', (message) => consoleText.push(message.text()));

    await page.goto('/login');
    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill('definitely-wrong-password');
    await page.getByTestId('login-submit').click();

    await expect(page.getByTestId('login-submit')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator('[role="alert"]').first()).toBeVisible();
    expect(consoleText.join('\n')).not.toMatch(/lp_access_token|lp_refresh_token|Bearer /);
    await assertNoTokenLeak(page, consoleText);
  });

  test('login, refresh, logout, and 404', async ({ page }) => {
    const consoleText: string[] = [];
    page.on('console', (message) => consoleText.push(message.text()));

    await page.goto('/login');
    await expect(page.getByTestId('passkey-button')).toBeDisabled();

    await page.getByTestId('login-email').fill(email);
    await page.getByTestId('login-password').fill(password);
    await page.getByTestId('login-submit').click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId('sign-out')).toBeVisible();
    await assertNoTokenLeak(page, consoleText);

    const refreshStatus = await page.evaluate(async () => {
      const csrf = document.cookie
        .split('; ')
        .find((part) => part.startsWith('lp_csrf_token='))
        ?.slice('lp_csrf_token='.length);
      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-csrf-token': csrf ?? '' },
      });
      return response.status;
    });
    expect(refreshStatus).toBe(200);
    await page.reload();
    await expect(page.getByTestId('sign-out')).toBeVisible();

    await page.getByTestId('sign-out').click();
    await expect(page).toHaveURL(/\/login/);

    await page.reload();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByTestId('login-submit')).toBeVisible();

    await page.goto('/this-route-does-not-exist');
    await expect(page.getByTestId('not-found-page')).toBeVisible();
    await expect(page.getByText('404')).toBeVisible();

    expect(consoleText.join('\n')).not.toMatch(TOKEN_LEAK);
    await assertNoTokenLeak(page, consoleText);
  });
});
