import { MovementTable } from '@/components/MovementTable';
import { LedgerChart } from '@/components/LedgerChart';

export default function MovimentiPage() {
  return (
    <main className="mx-auto max-w-7xl p-6 md:p-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Movimenti</h1>
  <p className="text-sm text-muted">Elenco cronologico di entrate e uscite con saldo progressivo e trend.</p>
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