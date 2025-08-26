"use client";
import React, { useMemo, useState } from 'react';
import { useTracker } from '@/state/TrackerContext';
import { isTemplate, isRecurringInstance, AnyExpense } from '@/domain/types';

export const ExpenseList: React.FC = () => {
  const { expenses, deleteExpense, updateExpense } = useTracker();
  const [filter, setFilter] = useState<'all'|'oneoff'|'recurring'>('all');
  const [editingId, setEditingId] = useState<string|null>(null);
  const [form, setForm] = useState<{description:string; amount:string; category:string; direction:'in'|'out'; date:string}>({description:'', amount:'', category:'', direction:'out', date:''});

  function startEdit(e: AnyExpense){
    setEditingId(e.id);
    setForm({
      description: e.description,
      amount: String(e.amount),
      category: e.category,
      direction: e.direction || 'out',
      date: e.type!== 'recurring-template' ? e.date.slice(0,10) : e.startDate.slice(0,10),
    });
  }

  function submitEdit(id:string, type:string){
    const amt = parseFloat(form.amount);
    if (isNaN(amt)) return;
    if (type === 'recurring-template') {
      updateExpense(id, { description: form.description, amount: amt, category: form.category, direction: form.direction });
    } else {
      updateExpense(id, { description: form.description, amount: amt, category: form.category, direction: form.direction, date: form.date });
    }
    setEditingId(null);
  }

  const filtered = useMemo(()=>{
    return expenses.filter(e=>{
      if (filter==='all') return true;
      if (filter==='oneoff') return e.type==='oneoff';
      if (filter==='recurring') return isTemplate(e) || isRecurringInstance(e);
      return true;
    });
  }, [expenses, filter]);

  return (
    <div className="p-4 border rounded-md bg-white/70 dark:bg-neutral-800/60 w-full max-w-2xl">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-lg">Spese</h2>
  <select value={filter} onChange={e=>setFilter(e.target.value as 'all'|'oneoff'|'recurring')} className="text-sm border rounded px-2 py-1">
          <option value="all">Tutte</option>
          <option value="oneoff">Una Tantum</option>
          <option value="recurring">Ricorrenti</option>
        </select>
      </div>
      <ul className="divide-y text-sm max-h-80 overflow-auto">
        {filtered.map(e=> {
          const isEditing = editingId === e.id;
          return (
            <li key={e.id} className="py-2 flex flex-col gap-2">
              {!isEditing && (
                <div className="flex gap-3 items-start">
                  <div className="flex-1">
                    <div className="flex gap-2 items-center">
                      <span className="font-medium">{e.description}</span>
                      {e.type==='recurring-template' && <span className="text-[10px] px-1 py-0.5 rounded bg-amber-200 text-amber-900">TEMPLATE</span>}
                      {e.type==='recurring-instance' && <span className="text-[10px] px-1 py-0.5 rounded bg-emerald-200 text-emerald-900">RICORRENZA</span>}
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400">
                      {e.type !== 'recurring-template' ? e.date.slice(0,10) : '—'} · {e.category}
                    </div>
                  </div>
                  <div className="text-right min-w-[110px]">
                    <div className={`font-mono ${e.direction==='in'?'text-green-600':'text-red-600'}`}>{e.direction==='in'?'+':'-'}€ {e.amount.toFixed(2)}</div>
                    <div className="flex gap-2 justify-end mt-1">
                      <button onClick={()=>startEdit(e)} className="text-xs text-blue-600 hover:underline">Modifica</button>
                      <button onClick={()=>deleteExpense(e.id)} className="text-xs text-red-600 hover:underline">X</button>
                    </div>
                  </div>
                </div>
              )}
              {isEditing && (
                <form onSubmit={(ev)=>{ev.preventDefault(); submitEdit(e.id, e.type);}} className="bg-neutral-50 dark:bg-neutral-700 p-2 rounded border flex flex-col gap-2 text-xs">
                  <div className="grid grid-cols-5 gap-2">
                    <input className="col-span-2 px-1 py-0.5 border rounded" value={form.description} onChange={ev=>setForm(f=>({...f, description: ev.target.value}))} />
                    <input className="px-1 py-0.5 border rounded" type="number" step="0.01" value={form.amount} onChange={ev=>setForm(f=>({...f, amount: ev.target.value}))} />
                    {e.type!=='recurring-template' && <input className="px-1 py-0.5 border rounded" type="date" value={form.date} onChange={ev=>setForm(f=>({...f, date: ev.target.value}))} />}
                    <select className="px-1 py-0.5 border rounded" value={form.direction} onChange={ev=>setForm(f=>({...f, direction: ev.target.value as 'in'|'out'}))}>
                      <option value="out">Uscita</option>
                      <option value="in">Entrata</option>
                    </select>
                    <input className="col-span-2 px-1 py-0.5 border rounded" value={form.category} onChange={ev=>setForm(f=>({...f, category: ev.target.value}))} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={()=>setEditingId(null)} className="px-2 py-0.5 rounded border">Annulla</button>
                    <button type="submit" className="px-2 py-0.5 rounded bg-blue-600 text-white">Salva</button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
        {!filtered.length && <li className="py-6 text-center text-neutral-500">Nessuna spesa</li>}
      </ul>
    </div>
  );
};
