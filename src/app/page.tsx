import { MovementTable } from '@/components/MovementTable';
import { LedgerChart } from '@/components/LedgerChart';

export default function HomeMovements() {
  return (
    <main className="mx-auto max-w-7xl p-4 md:p-8 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Movimenti</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Vista principale dei movimenti con saldo cumulato, proiezioni e grafico.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 space-y-6">
          <MovementTable />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <LedgerChart />
        </div>
      </div>
    </main>
  );
}
