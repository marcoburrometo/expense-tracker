"use client";
import React, { useState } from 'react';
import { useMonthlyTotals, useTracker } from '@/state/TrackerContext';

export const BudgetSummary: React.FC = () => {
  const { budgets, deleteBudget, updateBudget } = useTracker();
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm] = useState<{category:string; limit:string}>({category:'', limit:''});
  function startEdit(b:any){
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
  if (!budgets.length) return <div className="p-4 border rounded-md bg-white/70 dark:bg-neutral-800/60 text-sm">Nessun budget definito.</div>;
  return (
    <div className="p-4 border rounded-md bg-white/70 dark:bg-neutral-800/60 w-full max-w-md">
      <h2 className="font-semibold text-lg mb-2">Budgets (Mese Corrente)</h2>
      <ul className="space-y-2 text-sm">
        {budgets.map(b => {
          const spent = totals[b.category] || 0;
            const pct = b.limit ? Math.min(100, (spent / b.limit) * 100) : 0;
            const remaining = b.limit - spent;
          return (
            <li key={b.id} className="border rounded p-2 bg-white/60 dark:bg-neutral-700/50">
              {editingId!==b.id && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{b.category}</span>
                    <div className="flex gap-2">
                      <button onClick={()=>startEdit(b)} className="text-xs text-blue-600 hover:underline">Modifica</button>
                      <button onClick={()=>deleteBudget(b.id)} className="text-xs text-red-600 hover:underline">Elimina</button>
                    </div>
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-300">€ {spent.toFixed(2)} / € {b.limit.toFixed(2)} {remaining>=0?`(restano € ${remaining.toFixed(2)})`:`(superato di € ${(Math.abs(remaining)).toFixed(2)})`}</div>
                  <div className="h-2 bg-neutral-200 dark:bg-neutral-600 rounded overflow-hidden mt-1">
                    <div className={`${remaining<0?'bg-red-500':'bg-green-500'} h-full`} style={{ width: pct + '%' }} />
                  </div>
                </>
              )}
              {editingId===b.id && (
                <form onSubmit={e=>{e.preventDefault(); submit(b.id);}} className="flex flex-col gap-2 text-xs">
                  <input className="px-1 py-0.5 border rounded" value={form.category} onChange={e=>setForm(f=>({...f, category: e.target.value}))} />
                  <input className="px-1 py-0.5 border rounded" type="number" step="0.01" value={form.limit} onChange={e=>setForm(f=>({...f, limit: e.target.value}))} />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={()=>setEditingId(null)} className="px-2 py-0.5 border rounded">Annulla</button>
                    <button type="submit" className="px-2 py-0.5 rounded bg-blue-600 text-white">Salva</button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
