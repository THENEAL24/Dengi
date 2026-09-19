// Прогон UI в WebKit (движок Safari) на вьюпорте iPhone.
// Vite поднимается внутри скрипта, чтобы прогон был самодостаточным.
// Запуск: node scripts/screenshots.mjs
import { webkit, devices } from 'playwright';
import { createServer } from 'vite';
import { mkdir } from 'node:fs/promises';

const PORT = 5199;
const baseUrl = `http://localhost:${PORT}/`;
const outDir = '/tmp/dengi-shots';

await mkdir(outDir, { recursive: true });

const server = await createServer({ server: { port: PORT, strictPort: true } });
await server.listen();

const browser = await webkit.launch();
const context = await browser.newContext({
  ...devices['iPhone 15 Pro'],
  locale: 'ru-RU',
  timezoneId: 'Europe/Moscow',
});
const page = await context.newPage();

const errors = [];
page.on('console', (message) => {
  if (message.type() === 'error') errors.push(message.text());
});
page.on('pageerror', (error) => errors.push(String(error)));

const shot = async (name) => {
  await page.waitForTimeout(450);
  await page.screenshot({ path: `${outDir}/${name}.png` });
  console.log(`shot: ${name}`);
};

const tapDigits = async (digits) => {
  for (const digit of digits)
    await page.getByRole('button', { name: digit, exact: true }).last().click();
};

const tapCategory = async (name) =>
  page.getByRole('button', { name: new RegExp(`\\s${name}$`) }).last().click();

await page.goto(baseUrl, { waitUntil: 'networkidle' });

// Онбординг
await shot('01-onboarding-limit');
await tapDigits('60000');
await page.getByRole('button', { name: 'Далее' }).click();

await tapDigits('150000');
await page.getByRole('button', { name: 'Далее' }).click();
await shot('02-onboarding-start');

await page.getByRole('button', { name: /С сегодня/ }).click();
await page.waitForTimeout(200);
await shot('03-onboarding-start-selected');
await page.getByRole('button', { name: 'Далее' }).click();

// начальный остаток — именно он становится точкой отсчёта «доступно»
await tapDigits('5000');
await page.getByRole('button', { name: 'Далее' }).click();
await shot('04-onboarding-summary');
await page.getByRole('button', { name: 'Начать' }).click();

// Главный экран
await page.waitForTimeout(700);
await shot('05-today-empty');

// Добавление трат
const addExpense = async (digits, category) => {
  await page.getByRole('button', { name: 'Добавить трату' }).first().click();
  await page.waitForTimeout(400);
  await tapDigits(digits);
  if (category) await tapCategory(category);
  await page.getByRole('button', { name: 'Добавить', exact: true }).click();
  await page.waitForTimeout(500);
};

await page.getByRole('button', { name: 'Добавить трату' }).first().click();
await page.waitForTimeout(400);
await tapDigits('1250');
await tapCategory('Продукты');
await shot('06-expense-sheet');
await page.getByRole('button', { name: 'Добавить', exact: true }).click();
await page.waitForTimeout(500);

await addExpense('340', 'Кафе');
await addExpense('90', 'Транспорт');
await addExpense('2500', 'Одежда');
await addExpense('120');
await shot('07-today-filled');

// Остальные табы
await page.getByRole('button', { name: 'История' }).click();
await shot('08-history');

await page.getByRole('button', { name: 'Статистика' }).click();
await shot('09-stats-categories');
await page.getByRole('button', { name: 'По дням' }).click();
await shot('10-stats-days');

await page.getByRole('button', { name: 'Настройки' }).click();
await shot('11-settings');

// Тёмная тема
await page.getByRole('button', { name: 'Тёмная' }).click();
await page.waitForTimeout(400);
await shot('12-settings-dark');

await page.getByRole('button', { name: 'Сегодня' }).click();
await shot('13-today-dark');

await page.getByRole('button', { name: 'Добавить трату' }).first().click();
await page.waitForTimeout(400);
await tapDigits('890');
await tapCategory('Кафе');
await shot('14-expense-sheet-dark');
await page.getByRole('button', { name: 'Отмена' }).click();
await page.waitForTimeout(300);

await page.getByRole('button', { name: 'История' }).click();
await shot('15-history-dark');
await page.getByRole('button', { name: 'Статистика' }).click();
await shot('16-stats-dark');

// Закрытие месяца: перематываем время на следующий месяц
await page.evaluate(() => {
  const fixed = new Date('2026-10-02T10:00:00+03:00').getTime();
  const OriginalDate = Date;
  class MockDate extends OriginalDate {
    constructor(...args) {
      super(...(args.length ? args : [fixed]));
    }
    static now() {
      return fixed;
    }
  }
  globalThis.Date = MockDate;
  window.dispatchEvent(new Event('focus'));
});
await page.waitForTimeout(1200);
await shot('17-month-close');

// Переносим остаток и смотрим новый месяц
await page.getByRole('button', { name: /Перенести в/ }).click();
await page.waitForTimeout(1000);
await page.getByRole('button', { name: 'Сегодня' }).click();
await shot('18-october-carried');

// Свайп по строке истории должен открывать «Удалить»
await page.getByRole('button', { name: 'История' }).click();
await page.waitForTimeout(500);
// после переноса открыт новый месяц, траты лежат в предыдущем
await page.getByRole('button', { name: 'Предыдущий месяц' }).click();
await page.waitForTimeout(600);
const row = page.getByText('Одежда').first();
const box = await row.boundingBox();
if (box) {
  const y = box.y + box.height / 2;
  const startX = box.x + box.width - 20;
  await page.mouse.move(startX, y);
  await page.mouse.down();
  for (let offset = 6; offset <= 110; offset += 8) {
    await page.mouse.move(startX - offset, y);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(120);
  await shot('19a-swipe-hold');
  await page.mouse.up();
  await page.waitForTimeout(600);
  await shot('19b-swipe-released');

  // у закрытых строк кнопка есть в DOM, но с opacity-0 и pointer-events-none
  const deleteButton = page.locator('button[aria-label="Удалить"]:not(.pointer-events-none)');
  const deleteVisible = (await deleteButton.count()) === 1;
  console.log(deleteVisible ? 'свайп открыл «Удалить»' : 'ВНИМАНИЕ: свайп не открыл «Удалить»');

  if (deleteVisible) {
    await deleteButton.click();
    await page.waitForTimeout(700);
    const gone = (await page.getByText('Одежда').count()) === 0;
    console.log(gone ? 'трата удалена' : 'ВНИМАНИЕ: трата осталась в списке');
    await shot('20-history-after-delete');
  }
}

console.log(errors.length ? `\nОшибки консоли:\n${errors.join('\n')}` : '\nОшибок консоли нет');

await browser.close();
await server.close();
