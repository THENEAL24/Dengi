import { generateIngressKeyBase64Url } from '@bank/crypto';
import { updateSettings } from './repo';
import { apiEnroll, apiRevoke } from '@/lib/syncApi';

export async function enableBankSmsSync(): Promise<void> {
  const ingressKey = generateIngressKeyBase64Url();
  const enrolled = await apiEnroll();
  await updateSettings({
    bankSmsEnabled: true,
    bankSmsIngressKey: ingressKey,
    bankSmsSyncDeviceId: enrolled.deviceId,
    bankSmsWebhookToken: enrolled.webhookToken,
    bankSmsSyncSecret: enrolled.syncSecret,
    bankSmsLastSyncCursor: undefined,
    bankSmsLastSyncAt: undefined,
  });
}

export async function disableBankSmsSync(settings: {
  bankSmsSyncSecret?: string;
}): Promise<void> {
  if (settings.bankSmsSyncSecret) {
    try {
      await apiRevoke(settings.bankSmsSyncSecret);
    } catch {
      /* offline */
    }
  }
  await updateSettings({
    bankSmsEnabled: false,
    bankSmsSyncSecret: undefined,
    bankSmsIngressKey: undefined,
    bankSmsWebhookToken: undefined,
    bankSmsSyncDeviceId: undefined,
    bankSmsLastSyncCursor: undefined,
  });
}

export async function rotateBankSmsKeys(settings: {
  bankSmsSyncSecret?: string;
}): Promise<void> {
  await disableBankSmsSync(settings);
  await enableBankSmsSync();
}
