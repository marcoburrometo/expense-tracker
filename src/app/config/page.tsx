import { ExpenseForm } from '@/components/ExpenseForm';
import { ExpenseList } from '@/components/ExpenseList';
import { BudgetForm } from '@/components/BudgetForm';
import { BudgetSummary } from '@/components/BudgetSummary';

export default function Config() {
  return (
    <main className="mx-auto max-w-7xl p-6 md:p-10 space-y-8">
      <header className="space-y-2">
  <h1 className="text-2xl md:text-3xl font-bold tracking-tight heading-gradient">Configurazione Movimenti</h1>
  <p className="text-sm text-neutral-800 dark:text-neutral-400">Crea e modifica spese una tantum o ricorrenti e gestisci i budget mensili. Questa sezione configura i dati che alimentano i movimenti.</p>
      </header>
      <section className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-6 col-span-1">
          <div className="glass-panel p-4 space-y-6 fade-in">
            <ExpenseForm />
            <div className="glass-divider" />
            <BudgetForm />
          </div>
          <div className="glass-panel p-4 fade-in" style={{ animationDelay: '.05s' }}>
            <BudgetSummary />
          </div>
        </div>
        <div className="col-span-1 md:col-span-1 lg:col-span-2">
          <div className="glass-panel p-4 fade-in" style={{ animationDelay: '.1s' }}>
            <ExpenseList />
          </div>
        </div>
      </section>
    </main>
  );
}
