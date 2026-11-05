import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ExpenseSheet } from '@/components/ExpenseSheet';
import { MonthCloseSheet } from '@/components/MonthCloseSheet';
import { TabBar, type TabKey } from '@/components/ui/TabBar';
import type { Tx } from '@/db/db';
import { syncAutoSavings } from '@/db/balanceActions';
import { seedCategoriesIfEmpty } from '@/db/repo';
import { hydrateExchangeRates, refreshExchangeRatesOnline } from '@/lib/exchangeRates';
import { History } from '@/screens/History';
import { Onboarding } from '@/screens/Onboarding';
import { Settings } from '@/screens/Settings';
import { Stats } from '@/screens/Stats';
import { Today } from '@/screens/Today';
import {
  useApplyTheme,
  usePendingClose,
  useSavingsTotal,
  useSettings,
  useToday,
} from '@/state/hooks';

export function App() {
  const settingsQuery = useSettings();
  const settings = settingsQuery?.value;
  const today = useToday();
  const pending = usePendingClose(today);
  const savings = useSavingsTotal();

  const [tab, setTab] = useState<TabKey>('today');
  const [expense, setExpense] = useState<{ open: boolean; editing: Tx | null }>({
    open: false,
    editing: null,
  });

  useApplyTheme(settings?.theme);

  useEffect(() => {
    void seedCategoriesIfEmpty();
    void hydrateExchangeRates();
  }, []);

  useEffect(() => {
    const syncRates = () => {
      if (!navigator.onLine) return;
      void refreshExchangeRatesOnline();
    };
    syncRates();
    window.addEventListener('online', syncRates);
    const onVisible = () => {
      if (document.visibilityState === 'visible') syncRates();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', syncRates);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  useEffect(() => {
    if (!settings?.onboarded) return;
    void syncAutoSavings(today);
  }, [settings?.onboarded, today]);

  const openNewExpense = () => setExpense({ open: true, editing: null });
  const openEditExpense = (tx: Tx) => setExpense({ open: true, editing: tx });
  const closeExpense = () => setExpense((prev) => ({ ...prev, open: false }));

  return (
    <>
      <div className="app-bg">
        <span />
      </div>

      {settingsQuery === undefined ? null : !settings?.onboarded ? (
        <Onboarding />
      ) : (
        <>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
            >
              {tab === 'today' && (
                <Today
                  settings={settings}
                  onAddExpense={openNewExpense}
                  onEditExpense={openEditExpense}
                  onOpenHistory={() => setTab('history')}
                />
              )}
              {tab === 'history' && <History settings={settings} onEdit={openEditExpense} />}
              {tab === 'stats' && <Stats settings={settings} />}
              {tab === 'settings' && <Settings settings={settings} />}
            </motion.div>
          </AnimatePresence>

          <TabBar active={tab} onChange={setTab} />

          <ExpenseSheet
            open={expense.open}
            onClose={closeExpense}
            currency={settings.currency}
            editing={expense.editing}
          />

          {pending && (
            <MonthCloseSheet
              pending={pending}
              currency={settings.currency}
              savingsMinor={savings}
            />
          )}
        </>
      )}
    </>
  );
}
