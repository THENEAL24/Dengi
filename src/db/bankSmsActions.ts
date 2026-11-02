import { generateIngressKeyBase64Url } from '@bank/crypto';
import type { BankInboxItem, Settings } from './db';
import { db } from './db';
import { addTx } from './repo';
import { topUpAvailable } from './balanceActions';
import type { IsoDate } from '@/lib/date';
import { todayIso } from '@/lib/date';
import { contentIdForSms, parseSber900Sms } from '@bank/sms';
import { suggestCategoryId } from '@/lib/bankMerchant';

export async function listPendingBankInbox(): Promise<BankInboxItem[]> {
  const items = await db.bankInbox.where('status').equals('pending').toArray();
  return items.sort((a, b) => b.createdAt - a.createdAt);
}

export async function countPendingBankInbox(): Promise<number> {
  return db.bankInbox.where('status').equals('pending').count();
}

export async function hasBankEventId(contentId: string): Promise<boolean> {
  const inTx = await db.tx.where('bankEventId').equals(contentId).count();
  if (inTx > 0) return true;
  return (await db.bankInbox.where('contentId').equals(contentId).count()) > 0;
}

export async function addBankInboxItem(
  item: Omit<BankInboxItem, 'id' | 'status' | 'createdAt'>,
): Promise<void> {
  await db.bankInbox.add({
    ...item,
    status: 'pending',
    createdAt: Date.now(),
  } as BankInboxItem);
}

export async function acceptBankInboxItem(
  id: number,
  patch?: { categoryId?: number; amountMinor?: number },
): Promise<void> {
  const item = await db.bankInbox.get(id);
  if (!item || item.status !== 'pending') return;
  const amount = patch?.amountMinor ?? item.amountMinor;
  if (!amount || !item.date) throw new Error('Нет суммы');

  if (item.kind === 'expense') {
    await addTx({
      date: item.date,
      amountMinor: amount,
      categoryId: patch?.categoryId ?? item.suggestedCategoryId,
      note: item.merchant,
      bankEventId: item.contentId,
    });
  } else if (item.kind === 'income') {
    await topUpAvailable(amount, item.merchant, item.date);
    const topUp = await db.topUps.orderBy('createdAt').last();
    if (topUp?.id) await db.topUps.update(topUp.id, { bankEventId: item.contentId });
  }

  await db.bankInbox.update(id, { status: 'accepted' });
}

export async function rejectBankInboxItem(id: number): Promise<void> {
  await db.bankInbox.update(id, { status: 'rejected' });
}

export async function applyBankExpense(input: {
  contentId: string;
  date: IsoDate;
  amountMinor: number;
  merchant: string;
  categoryId?: number;
}): Promise<void> {
  if (await hasBankEventId(input.contentId)) return;
  await addTx({
    date: input.date,
    amountMinor: input.amountMinor,
    categoryId: input.categoryId ?? (await suggestCategoryId(input.merchant)),
    note: input.merchant,
    bankEventId: input.contentId,
  });
}

export function stripBankSmsSecrets(settings: Settings): Settings {
  const copy = { ...settings };
  delete copy.bankSmsSyncSecret;
  delete copy.bankSmsIngressKey;
  delete copy.bankSmsWebhookToken;
  delete copy.bankSmsSyncDeviceId;
  copy.bankSmsEnabled = false;
  return copy;
}

export function newBankSmsCredentials(): {
  deviceId: string;
  webhookToken: string;
  syncSecret: string;
  ingressKey: string;
} {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return {
    deviceId: `d_${hex}`,
    webhookToken: `w_${hex}`,
    syncSecret: `s_${crypto.randomUUID().replace(/-/g, '')}`,
    ingressKey: generateIngressKeyBase64Url(),
  };
}

export function expenseDateFromReceivedAt(receivedAt?: string): IsoDate {
  if (receivedAt) {
    const d = receivedAt.slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d as IsoDate;
  }
  return todayIso();
}

export function buildPreview(merchant: string, amountMinor: number): string {
  const rub = (amountMinor / 100).toFixed(2);
  return `${merchant} · ${rub} ₽`;
}

export { contentIdForSms, parseSber900Sms };
