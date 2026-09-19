// Проверяет, что собранное приложение регистрирует service worker и открывается офлайн.
// Запуск: npm run build && node scripts/check-pwa.mjs
import { chromium } from 'playwright';
import { preview } from 'vite';
import { readFile } from 'node:fs/promises';

const PORT = 5210;
const server = await preview({ preview: { port: PORT, strictPort: true } });
const baseUrl = `http://localhost:${PORT}/`;

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 393, height: 852 },
  locale: 'ru-RU',
});
const page = await context.newPage();

const problems = [];
const ok = (label) => console.log(`ok   ${label}`);
const fail = (label) => {
  problems.push(label);
  console.log(`FAIL ${label}`);
};

await page.goto(baseUrl, { waitUntil: 'networkidle' });

// 1. Service worker
const swReady = await page.evaluate(async () => {
  const registration = await navigator.serviceWorker.ready;
  return Boolean(registration.active);
});
swReady ? ok('service worker активен') : fail('service worker не активировался');

// 2. Манифест и iOS-мета
const manifestHref = await page.getAttribute('link[rel="manifest"]', 'href');
manifestHref ? ok(`манифест подключён (${manifestHref})`) : fail('нет link[rel=manifest]');

const manifest = await (await page.request.get(new URL(manifestHref, baseUrl).href)).json();
manifest.display === 'standalone'
  ? ok('display: standalone')
  : fail(`display = ${manifest.display}`);
manifest.icons?.some((icon) => icon.purpose === 'maskable')
  ? ok('есть maskable-иконка')
  : fail('нет maskable-иконки');

for (const icon of manifest.icons ?? []) {
  const response = await page.request.get(new URL(icon.src, baseUrl).href);
  response.ok() ? ok(`иконка ${icon.src}`) : fail(`иконка ${icon.src} → ${response.status()}`);
}

const appleIcon = await page.getAttribute('link[rel="apple-touch-icon"]', 'href');
const appleResponse = await page.request.get(new URL(appleIcon, baseUrl).href);
appleResponse.ok() ? ok('apple-touch-icon доступна') : fail('apple-touch-icon недоступна');

const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
html.includes('viewport-fit=cover') ? ok('viewport-fit=cover') : fail('нет viewport-fit=cover');
html.includes('black-translucent')
  ? ok('status bar black-translucent')
  : fail('нет apple-mobile-web-app-status-bar-style');

// 3. Офлайн: заходим в приложение без сети
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForTimeout(1200);
await context.setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);

const onboardingVisible = await page
  .getByText('Сколько можно тратить в месяц?')
  .isVisible()
  .catch(() => false);
onboardingVisible ? ok('приложение открылось офлайн') : fail('офлайн приложение не отрисовалось');

await context.setOffline(false);
await browser.close();
await server.close();

console.log(problems.length ? `\nПроблемы: ${problems.length}` : '\nВсе проверки прошли');
process.exit(problems.length ? 1 : 0);
