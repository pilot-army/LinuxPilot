import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const playwrightCore = process.env.PLAYWRIGHT_CORE ?? 'playwright-core';
const playwrightModule = await import(playwrightCore);
const chromium = playwrightModule.chromium ?? playwrightModule.default?.chromium;

const baseUrl = process.env.LOGIN_CAPTURE_URL ?? 'http://127.0.0.1:5173/login';
const outDir = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../../../docs/screenshots/login',
);

const shots = [
  { name: '01-desktop-1440x900-ua', width: 1440, height: 900, locale: 'uk' },
  { name: '02-desktop-1440x900-en', width: 1440, height: 900, locale: 'en' },
  { name: '03-desktop-language-menu', width: 1440, height: 900, locale: 'uk', openLanguage: true },
  { name: '04-tablet-portrait-768x1024', width: 768, height: 1024, locale: 'en' },
  { name: '05-tablet-landscape-1024x768', width: 1024, height: 768, locale: 'en' },
  { name: '06-mobile-390x844-ua', width: 390, height: 844, locale: 'uk' },
  { name: '07-mobile-390x844-en', width: 390, height: 844, locale: 'en' },
  { name: '08-mobile-320x568', width: 320, height: 568, locale: 'en' },
  { name: '09-error-state', width: 1440, height: 900, locale: 'en', error: true },
  { name: '10-loading-state', width: 1440, height: 900, locale: 'en', loading: true },
];

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
});

for (const shot of shots) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  await page.addInitScript((locale) => {
    window.localStorage.setItem('linuxpilot.locale', locale);
  }, shot.locale);

  if (shot.loading) {
    await page.route('**/api/v1/auth/login', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 15_000));
      await route.abort();
    });
  }

  if (shot.error) {
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Invalid credentials', details: [] },
          meta: { requestId: 'visual' },
        }),
      });
    });
  }

  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'AUTH_UNAUTHORIZED', message: 'no', details: [] },
        meta: { requestId: 'visual' },
      }),
    });
  });

  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByRole('form', { name: shot.locale === 'uk' ? 'Увійти' : 'Sign in' }).waitFor();

  if (shot.openLanguage) {
    await page.getByRole('button', { name: shot.locale === 'uk' ? 'Мова' : 'Language' }).click();
    await page.getByRole('listbox').waitFor();
  }

  if (shot.error || shot.loading) {
    await page.locator('#field-emailOrUsername').fill('operator@linuxpilot.local');
    await page.locator('#field-password').fill('not-the-password');
    const submit = page.getByRole('button', { name: shot.locale === 'uk' ? 'Увійти' : 'Sign in' });
    if (shot.loading) {
      await Promise.all([page.waitForTimeout(250), submit.click()]);
    } else {
      await submit.click();
      await page.getByRole('alert').waitFor();
    }
  }

  const file = path.join(outDir, `${shot.name}.png`);
  const fullPage = shot.height > 900 || shot.width < 1024;
  await page.screenshot({ path: file, fullPage });
  await writeFile(
    path.join(outDir, `${shot.name}.txt`),
    `${shot.name} ${shot.width}x${shot.height} ${shot.locale}\n`,
  );
  await context.close();
  console.log(file);
}

await browser.close();
