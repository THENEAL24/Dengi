import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from './db';
import { addTx, completeOnboarding, getMonth, savingsTotal } from './repo';
import { closeMonth, findPendingClose } from './monthActions';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

async function setup() {
  await completeOnboarding({
    monthlyLimitMinor: 3_000_00,
    savingsMinor: 10_000_00,
    startDate: '2026-09-19',
  });
}

describe('закрытие месяца', () => {
  it('первый месяц создаётся с начислением от даты старта', async () => {
    await setup();
    const month = await getMonth('2026-09');
    expect(month?.accrualStartDay).toBe(19);
    expect(month?.accrualDays).toBe(12);
    expect(month?.openingBalanceMinor).toBe(0);
    expect(await savingsTotal()).toBe(10_000_00);
  });

  it('не предлагает закрывать месяц, пока он не кончился', async () => {
    await setup();
    expect(await findPendingClose('2026-09-30')).toBeNull();
    expect((await findPendingClose('2026-10-01'))?.month.id).toBe('2026-09');
  });

  it('перенос остатка делает его стартовым балансом следующего месяца', async () => {
    await setup();
    await addTx({ date: '2026-09-20', amountMinor: 1_000_00 });

    // старт 19 сентября: за 12 дней начисляется 1200 ₽, а не весь лимит
    const pending = await findPendingClose('2026-10-01');
    expect(pending?.closingBalanceMinor).toBe(200_00);

    await closeMonth('2026-09', 'carry');
    expect((await getMonth('2026-10'))?.openingBalanceMinor).toBe(200_00);
    expect((await getMonth('2026-09'))?.status).toBe('closed');
    expect(await savingsTotal()).toBe(10_000_00);
  });

  it('остаток в копилку оставляет новый месяц с нуля', async () => {
    await setup();
    await addTx({ date: '2026-09-20', amountMinor: 1_000_00 });

    await closeMonth('2026-09', 'savings');
    expect((await getMonth('2026-10'))?.openingBalanceMinor).toBe(0);
    expect(await savingsTotal()).toBe(10_200_00);
  });

  it('минус покрывается из копилки', async () => {
    await setup();
    await addTx({ date: '2026-09-20', amountMinor: 3_500_00 });

    await closeMonth('2026-09', 'savings');
    expect(await savingsTotal()).toBe(10_000_00 - 2_300_00);
    expect((await getMonth('2026-10'))?.openingBalanceMinor).toBe(0);
  });

  it('минус можно перенести долгом на следующий месяц', async () => {
    await setup();
    await addTx({ date: '2026-09-20', amountMinor: 3_500_00 });

    await closeMonth('2026-09', 'carry');
    expect((await getMonth('2026-10'))?.openingBalanceMinor).toBe(-2_300_00);
    expect(await savingsTotal()).toBe(10_000_00);
  });

  it('повторное закрытие ничего не меняет', async () => {
    await setup();
    await closeMonth('2026-09', 'savings');
    await closeMonth('2026-09', 'carry');
    expect(await savingsTotal()).toBe(11_200_00);
    expect((await getMonth('2026-10'))?.openingBalanceMinor).toBe(0);
  });

  it('пропущенные месяцы закрываются по цепочке, от старого к новому', async () => {
    await setup();
    // пользователь не заходил до декабря
    let pending = await findPendingClose('2026-12-05');
    expect(pending?.month.id).toBe('2026-09');
    await closeMonth('2026-09', 'carry');

    pending = await findPendingClose('2026-12-05');
    expect(pending?.month.id).toBe('2026-10');
    expect(pending?.month.accrualDays).toBe(31);
    expect(pending?.month.openingBalanceMinor).toBe(1_200_00);
    await closeMonth('2026-10', 'carry');

    pending = await findPendingClose('2026-12-05');
    expect(pending?.month.id).toBe('2026-11');
    await closeMonth('2026-11', 'carry');

    expect(await findPendingClose('2026-12-05')).toBeNull();
    // неполный сентябрь даёт 1200, октябрь и ноябрь — по 3000
    expect((await getMonth('2026-12'))?.openingBalanceMinor).toBe(7_200_00);
  });

  it('трата задним числом попадает в свой месяц', async () => {
    await setup();
    await addTx({ date: '2026-10-03', amountMinor: 250_00 });
    const october = await getMonth('2026-10');
    expect(october?.accrualStartDay).toBe(1);
    expect(october?.limitMinor).toBe(3_000_00);
  });
});
