import { expect, test, type Page } from '@playwright/test';

const email = process.env.E2E_EMAIL ?? 'e2e-admin@example.com';
const password = process.env.E2E_PASSWORD ?? 'CorrectHorse-Battery9';
const viewerEmail = process.env.E2E_VIEWER_EMAIL ?? 'e2e-viewer@example.com';
const viewerPassword = process.env.E2E_VIEWER_PASSWORD ?? 'CorrectHorse-Battery9';

const TOKEN_LEAK = /lp_access_token|lp_refresh_token|eyJ[A-Za-z0-9_-]{10,}\./;

async function login(page: Page, user = email, pass = password) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(user);
  await page.getByTestId('login-password').fill(pass);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('sign-out')).toBeVisible();
}

async function assertNoSecretLeak(page: Page, consoleText: string[]) {
  const leaked = await page.evaluate(() => ({
    href: window.location.href,
    localStorage: { ...window.localStorage },
    sessionStorage: { ...window.sessionStorage },
    html: document.documentElement.outerHTML,
  }));
  const serialized = JSON.stringify(leaked);
  expect(serialized).not.toMatch(TOKEN_LEAK);
  expect(leaked.href).not.toMatch(/enrollmentToken|token=/i);
  expect(consoleText.join('\n')).not.toMatch(TOKEN_LEAK);
}

test.describe('servers ui', () => {
  test('empty or populated list, add flow, and no token leak', async ({ page }) => {
    const consoleText: string[] = [];
    page.on('console', (message) => consoleText.push(message.text()));

    await login(page);
    await page.getByTestId('nav-servers').click();
    await expect(page).toHaveURL(/\/servers/);
    await expect(
      page
        .getByTestId('servers-empty')
        .or(page.getByTestId('servers-table'))
        .or(page.getByTestId('servers-cards')),
    ).toBeVisible();

    await page.getByTestId('add-server').click();
    await expect(page.getByTestId('enrollment-wizard')).toBeVisible();
    const serverName = `e2e-${Date.now()}`;
    await page.getByTestId('server-name').fill(serverName);
    await page.getByTestId('server-address').fill('192.0.2.10');
    await expect(page.getByTestId('space-select')).toBeVisible();
    await expect(page.getByTestId('server-environment')).toHaveCount(0);
    await page.getByTestId('enrollment-next').click();
    await page.getByTestId('check-connection').click();
    await expect(page.getByTestId('connection-check-status')).toContainText(/Ready|Можна/);
    await page.getByTestId('enrollment-next').click();
    await page.getByTestId('install-mode-manual').click();
    await page.getByTestId('enrollment-next').click();
    await page.getByTestId('confirm-add').check();
    await page.getByTestId('create-server').click();
    await expect(page.getByTestId('enrollment-token-panel')).toBeVisible();
    const masked = await page.getByTestId('enroll-command').innerText();
    await page.getByTestId('toggle-token').click();
    const revealed = await page.getByTestId('enroll-command').innerText();
    const token = revealed.match(/printf '%s\\n' '([^']+)'/)?.[1] ?? '';
    expect(token.length).toBeGreaterThan(16);
    expect(masked).not.toContain(token);
    await page.getByTestId('toggle-token').click();
    await expect(page.getByTestId('enroll-command')).not.toContainText(token);
    expect(page.url()).not.toContain(token);
    await page.getByTestId('enrollment-skip').click();
    await expect(page).toHaveURL(/\/servers$/);
    await expect(page.getByText(serverName)).toBeVisible();
    await assertNoSecretLeak(page, consoleText);
  });

  test('viewer cannot create servers', async ({ page }) => {
    await login(page, viewerEmail, viewerPassword);
    await page.goto('/servers');
    await expect(page.getByTestId('add-server')).toHaveCount(0);
    await page.goto('/servers/new');
    await expect(page.getByRole('alert')).toBeVisible();
  });

  test('unknown server shows a safe error', async ({ page }) => {
    await login(page);
    await page.goto('/servers/00000000-0000-4000-8000-000000000000');
    await expect(page.getByTestId('server-detail-error')).toBeVisible();
  });
});
