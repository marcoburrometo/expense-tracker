"use client";
import { MovementTable } from '@/components/MovementTable';
import { LedgerChart } from '@/components/LedgerChart';
import { useI18n } from '@/state/I18nContext';

export default function MovimentiPage() {
  const { t } = useI18n();
  return (
    <main className="app-content-wrap py-6 md:py-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('page.movimenti.title')}</h1>
        <p className="text-sm text-muted">{t('page.movimenti.desc')}</p>
      </header>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <MovementTable />
        </div>
        <div className="md:col-span-1 space-y-4">
          <LedgerChart />
        </div>
      </div>
    </main>
  );
}