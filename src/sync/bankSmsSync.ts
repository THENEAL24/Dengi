import type { IngressEnvelope } from '@bank/crypto';
import { decryptIngressPayload, encryptIngressPayload } from '@bank/crypto';
import {
  addBankInboxItem,
  applyBankExpense,
  buildPreview,
  contentIdForSms,
  expenseDateFromReceivedAt,
  hasBankEventId,
  parseSber900Sms,
} from '@/db/bankSmsActions';
import { getSettings, updateSettings } from '@/db/repo';
import { suggestCategoryId } from '@/lib/bankMerchant';
import {
  apiAckEvents,
  apiFetchEvents,
  apiPostHook,
  type ServerEvent,
} from '@/lib/syncApi';

export async function syncBankSmsIfEnabled(): Promise<{ processed: number; error?: string }> {
  const settings = await getSettings();
  if (!settings?.bankSmsEnabled || !settings.bankSmsSyncSecret || !settings.bankSmsIngressKey) {
    return { processed: 0 };
  }

  try {
    let cursor: string | undefined = settings.bankSmsLastSyncCursor ?? '0';
    let total = 0;
    const ackIds: string[] = [];

    for (;;) {
      const page = await apiFetchEvents(settings.bankSmsSyncSecret, cursor);
      for (const event of page.events) {
        const ack = await processServerEvent(settings, event);
        if (ack) ackIds.push(event.id);
        total += 1;
      }
      if (ackIds.length > 0) {
        await apiAckEvents(settings.bankSmsSyncSecret, ackIds);
        ackIds.length = 0;
      }
      if (!page.nextCursor || page.events.length === 0) break;
      cursor = page.nextCursor;
    }

    await updateSettings({
      bankSmsLastSyncAt: Date.now(),
      bankSmsLastSyncCursor: cursor,
    });

    return { processed: total };
  } catch {
    return { processed: 0, error: 'sync_failed' };
  }
}

async function processServerEvent(
  settings: NonNullable<Awaited<ReturnType<typeof getSettings>>>,
  event: ServerEvent,
): Promise<boolean> {
  const envelope: IngressEnvelope = {
    v: event.v,
    alg: event.alg,
    kid: event.kid,
    iv: event.iv,
    ct: event.ct,
  };

  let payload;
  try {
    payload = await decryptIngressPayload(settings.bankSmsIngressKey!, envelope);
  } catch {
    return true;
  }

  const expenseDate = expenseDateFromReceivedAt(payload.receivedAt);
  const parsed = parseSber900Sms(payload.text, {
    sender: payload.sender,
    expenseDate,
  });

  if (parsed.kind === 'skip') return true;

  const contentId = contentIdForSms(
    payload.text,
    parsed.amountMinor,
    parsed.merchant,
    expenseDate,
  );
  if (await hasBankEventId(contentId)) return true;

  const categoryId = await suggestCategoryId(parsed.merchant);
  const preview = buildPreview(parsed.merchant, parsed.amountMinor);

  if (settings.bankSmsMode === 'auto') {
    await applyBankExpense({
      contentId,
      date: expenseDate,
      amountMinor: parsed.amountMinor,
      merchant: parsed.merchant,
      categoryId,
    });
    return true;
  }

  await addBankInboxItem({
    serverEventId: event.id,
    contentId,
    kind: 'expense',
    amountMinor: parsed.amountMinor,
    date: expenseDate,
    merchant: parsed.merchant,
    rawPreview: preview,
    suggestedCategoryId: categoryId,
  });
  return true;
}

export async function testBankSmsChannel(settings: {
  bankSmsWebhookToken?: string;
  bankSmsIngressKey?: string;
}): Promise<void> {
  if (!settings.bankSmsWebhookToken || !settings.bankSmsIngressKey) {
    throw new Error('not configured');
  }
  const envelope = await encryptIngressPayload(settings.bankSmsIngressKey, {
    v: 1,
    text: 'Счёт карты VISA3921 12:00 Покупка 1р TEST Баланс: 1р',
    sender: '9-00',
    receivedAt: new Date().toISOString(),
  });
  await apiPostHook(settings.bankSmsWebhookToken, envelope);
  await syncBankSmsIfEnabled();
}
