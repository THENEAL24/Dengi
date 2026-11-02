import { useLiveQuery } from 'dexie-react-hooks';
import { countPendingBankInbox } from '@/db/bankSmsActions';

export function usePendingBankInboxCount(): number {
  return useLiveQuery(() => countPendingBankInbox(), [], 0) ?? 0;
}
