import { expect, test, type Page } from '@playwright/test';

const email = process.env.E2E_EMAIL ?? 'e2e-admin@example.com';
const password = process.env.E2E_PASSWORD ?? 'CorrectHorse-Battery9';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page.getByTestId('sign-out')).toBeVisible();
}

async function ensureSpace(page: Page) {
  await page.goto('/server-spaces');
  const firstCard = page.locator('[data-testid^="group-card-"]').first();
  if (await firstCard.isVisible().catch(() => false)) {
    return;
  }
  await page.getByTestId('create-group').click();
  await page.getByTestId('group-name').fill(`e2e-space-${Date.now()}`);
  await page.getByTestId('create-group-submit').click();
  await expect(page.getByTestId('space-detail-page')).toBeVisible();
  await page.goto('/server-spaces');
  await expect(page.locator('[data-testid^="group-card-"]').first()).toBeVisible();
}

test.describe('server space pages', () => {
  test('opening a space navigates to its slug page and back restores the list', async ({
    page,
  }) => {
    await login(page);
    await ensureSpace(page);

    await page.goto('/server-spaces?q=e2e');
    await page.evaluate(() => window.scrollTo(0, 120));
    const listUrl = page.url();
    await page.locator('[data-testid^="group-open-"]').first().click();

    await expect(page.getByTestId('space-detail-page')).toBeVisible();
    expect(page.url()).toMatch(/\/server-spaces\/[a-z0-9-]+$/);
    expect(page.url()).not.toMatch(/spaceId=/);
    await expect(page.getByTestId('groups-inspector')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.goBack();
    await expect(page.getByTestId('server-groups-page')).toBeVisible();
    expect(page.url()).toBe(listUrl);
    await expect(page.getByTestId('groups-inspector')).toHaveCount(0);
  });
});
