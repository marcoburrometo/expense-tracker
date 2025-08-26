import { DashboardStats } from '../components/DashboardStats';
import { MovementTable } from '@/components/MovementTable';
import { LedgerChart } from '@/components/LedgerChart';

export default function HomeMovements() {
  return (
    <main className="w-full p-4 md:p-8 space-y-6 flex flex-col flex-1 min-h-0">
      <header className="space-y-2 fade-in">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight heading-gradient">Movimenti</h1>
        <p className="text-sm text-neutral-800 dark:text-neutral-400">Vista principale dei movimenti con saldo cumulato, proiezioni e grafico.</p>
      </header>
      <div className="fade-in" style={{ animationDelay: '.05s' }}>
        <DashboardStats />
      </div>
      <div className="grid gap-6 lg:grid-cols-5 flex-1 min-h-0">
        <div className="lg:col-span-3 space-y-6 h-full flex flex-col min-h-0">
          <div className="glass-panel p-2 md:p-3 fade-in flex-1 min-h-0 flex flex-col" style={{ animationDelay: '.1s' }}>
            <MovementTable />
          </div>
        </div>
        <div className="lg:col-span-2 space-y-6 fade-in" style={{ animationDelay: '.15s' }}>
          <LedgerChart />
        </div>
      </div>
    </main>
  );
}
