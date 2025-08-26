import { ExpenseForm } from '@/components/ExpenseForm';
import { ExpenseList } from '@/components/ExpenseList';
import { BudgetForm } from '@/components/BudgetForm';
import { BudgetSummary } from '@/components/BudgetSummary';

export default function ConfigurazioneMovimentiPage() {
  return (
    <main className="mx-auto max-w-7xl p-6 md:p-10 space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Configurazione Movimenti</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Crea e modifica spese una tantum o ricorrenti e gestisci i budget mensili. Questa sezione configura i dati che alimentano i movimenti.</p>
      </header>
      <section className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-6 col-span-1">
          <ExpenseForm />
          <BudgetForm />
          <BudgetSummary />
        </div>
        <div className="col-span-1 md:col-span-1 lg:col-span-2">
          <ExpenseList />
        </div>
      </section>
    </main>
  );
}
