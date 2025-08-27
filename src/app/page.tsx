"use client";
import { DashboardStats } from '../components/DashboardStats';
import { MovementTable } from '@/components/MovementTable';
import { LedgerChart } from '@/components/LedgerChart';
import { BudgetUsageList } from '@/components/dashboard/BudgetUsageList';
import { TopCategories } from '@/components/dashboard/TopCategories';
import { ExtremesCards } from '@/components/dashboard/ExtremesCards';
import NetForecastCard from '@/components/dashboard/NetForecastCard';
import NextUpcomingCards from '@/components/dashboard/NextUpcomingCards';
import GlassPanel from '@/components/GlassPanel';
import { useI18n } from '@/state/I18nContext';

export default function HomeMovements() {
  const { t } = useI18n();
  return (
    <main className="app-content-wrap w-full py-4 md:py-8 space-y-6 flex flex-col flex-1 min-h-0">
      <header className="space-y-2 fade-in">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight heading-gradient">{t('page.home.title')}</h1>
        <p className="text-sm text-neutral-800 dark:text-neutral-400">{t('page.home.desc')}</p>
      </header>
      <div className="fade-in" style={{ animationDelay: '.1s' }}>
        <DashboardStats />
      </div>
      <div className="grid gap-6 lg:grid-cols-5 flex-1 min-h-0">
        <div className="lg:col-span-2 space-y-6  max-w-[95vw] fade-in" style={{ animationDelay: '.2s' }}>
          <LedgerChart />
          <GlassPanel variant='pure' className="p-3 flex flex-col gap-5 glass-panel--overflow-visible">
            <NetForecastCard />
            <NextUpcomingCards />
            <ExtremesCards />
            <BudgetUsageList />
            <TopCategories />
          </GlassPanel>
        </div>
        <div className="lg:col-span-3 space-y-6 h-full flex flex-col min-h-0 max-w-[95vw] fade-in" style={{ animationDelay: '.3s' }}>
          <MovementTable />
        </div>
      </div>
    </main>
  );
}
