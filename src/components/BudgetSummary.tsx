"use client";
import React, { useMemo, useState } from 'react';
import { Confirm } from '@/components/Confirm';
import { useMonthlyTotals, useTracker } from '@/state/TrackerContext';
import { mergeCategories } from '@/domain/categories';
import { Budget } from '@/domain/types';

export const BudgetSummary: React.FC = () => {
  const { budgets, deleteBudget, updateBudget, expenses } = useTracker();
  const categories = useMemo(()=> mergeCategories(expenses.map(e=>e.category)), [expenses]);
  const [editingId, setEditingId] = useState<string|null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string|null>(null);
  const [form, setForm] = useState<{category:string; limit:string}>({category:'', limit:''});
  function startEdit(b: Budget){
    setEditingId(b.id);
    setForm({category: b.category, limit: String(b.limit)});
  }
  function submit(id:string){
    const lim = parseFloat(form.limit);
    if (isNaN(lim)) return;
    updateBudget(id, { category: form.category, limit: lim });
    setEditingId(null);
  }
  const totals = useMonthlyTotals();
  if (!budgets.length) return <div className="glass-panel p-4 text-sm fade-in">
    <div className="flex flex-col gap-3 max-w-[220px]">
      <div className="skeleton h-3 w-20" />
      <div className="skeleton h-3 w-28" />
      <div className="skeleton h-2 w-full" />
      <div className="text-[11px] opacity-60">Nessun budget definito.</div>
    </div>
  </div>;
  const deleteTarget = confirmDeleteId ? budgets.find(b=> b.id===confirmDeleteId) : null;
  const confirmDetails = deleteTarget ? (
    <>
      <div><span className="opacity-70">Categoria:</span> {deleteTarget.category}</div>
      <div><span className="opacity-70">Limite:</span> € {deleteTarget.limit.toFixed(2)}</div>
      <div><span className="opacity-70">Speso mese:</span> € {(totals[deleteTarget.category]||0).toFixed(2)}</div>
    </>
  ) : null;
  return (
  <>
  <div className="glass-panel p-5 w-full max-w-md space-y-2 fade-in">
      <h2 className="font-semibold text-lg mb-2">Budgets (Mese Corrente)</h2>
      <ul className="space-y-2 text-sm">
        {budgets.map(b => {
          const spent = totals[b.category] || 0;
            const pct = b.limit ? Math.min(100, (spent / b.limit) * 100) : 0;
            const remaining = b.limit - spent;
          return (
            <li key={b.id} className="glass-panel p-3 space-y-1 fade-in" style={{animationDelay: '.05s'}}>
              {editingId!==b.id && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{b.category}</span>
                    <div className="flex gap-2">
                      <button onClick={()=>startEdit(b)} className="glass-button glass-button--primary text-[10px] pressable">Modifica</button>
                      <button onClick={()=>setConfirmDeleteId(b.id)} className="glass-button glass-button--danger text-[10px] pressable">Elimina</button>
                    </div>
                  </div>
                  <div className="text-xs text-muted">€ {spent.toFixed(2)} / € {b.limit.toFixed(2)} {remaining>=0?`(restano € ${remaining.toFixed(2)})`:`(superato di € ${(Math.abs(remaining)).toFixed(2)})`}</div>
                  <div className="h-2 bg-neutral-200 dark:bg-neutral-600 rounded overflow-hidden mt-1">
                    <div className={`${remaining<0?'bg-red-500':'bg-green-500'} h-full`} style={{ width: pct + '%' }} />
                  </div>
                </>
              )}
              {editingId===b.id && (
                <form onSubmit={e=>{e.preventDefault(); submit(b.id);}} className="flex flex-col gap-2 text-xs fade-in" style={{animationDelay: '.1s'}}>
                  <select className="glass-input" value={form.category} onChange={e=>setForm(f=>({...f, category: e.target.value}))}>
                    {categories.map(c=> <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input className="glass-input" type="number" step="0.01" value={form.limit} onChange={e=>setForm(f=>({...f, limit: e.target.value}))} />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={()=>setEditingId(null)} className="glass-button pressable">Annulla</button>
                    <button type="submit" className="glass-button glass-button--success pressable">Salva</button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
    <Confirm
      open={!!deleteTarget}
      title="Elimina budget"
      description={deleteTarget ? <>Confermi l&apos;eliminazione del budget selezionato? I progressi del mese andranno persi.</> : null}
      details={confirmDetails}
      confirmLabel="Elimina"
      variant="danger"
      onCancel={()=> setConfirmDeleteId(null)}
  onConfirm={()=> { if(deleteTarget){ deleteBudget(deleteTarget.id); } setConfirmDeleteId(null); }}
    />
  </>
  );
};
