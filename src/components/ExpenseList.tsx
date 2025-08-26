"use client";
import React, { useMemo, useState } from 'react';
import { useTracker } from '@/state/TrackerContext';
import { mergeCategories } from '@/domain/categories';
import { isTemplate, isRecurringInstance, AnyExpense } from '@/domain/types';

export const ExpenseList: React.FC = () => {
  const { expenses, deleteExpense, updateExpense } = useTracker();
  const categories = useMemo(()=> mergeCategories(expenses.map(e=> e.category)), [expenses]);
  const [filter, setFilter] = useState<'all'|'oneoff'|'recurring'>('all');
  const [editingId, setEditingId] = useState<string|null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string|null>(null);
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
  <div className="glass-panel p-5 w-full space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-lg">Spese</h2>
  <select value={filter} onChange={e=>setFilter(e.target.value as 'all'|'oneoff'|'recurring')} className="text-xs md:text-sm glass-input">
          <option value="all">Tutte</option>
          <option value="oneoff">Una Tantum</option>
          <option value="recurring">Ricorrenti</option>
        </select>
      </div>
  <ul className="divide-y divide-white/40 dark:divide-white/10 text-sm max-h-80 overflow-auto glass-scroll pr-1">
        {filtered.map(e=> {
          const isEditing = editingId === e.id;
          return (
            <li key={e.id} className="py-2 flex flex-col gap-2">
              {!isEditing && (
                <div className="flex gap-3 items-start">
                  <div className="flex-1">
                    <div className="flex gap-2 items-center">
                      <span className="font-medium">{e.description}</span>
                      {e.type==='recurring-template' && <span className="glass-badge badge-template">TEMPLATE</span>}
                      {e.type==='recurring-instance' && <span className="glass-badge badge-instance">RICORRENZA</span>}
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400">
                      {e.type !== 'recurring-template' ? e.date.slice(0,10) : '—'} · {e.category}
                    </div>
                  </div>
                  <div className="text-right min-w-[110px]">
                    <div className={`font-mono ${e.direction==='in'?'text-green-600':'text-red-600'}`}>{e.direction==='in'?'+':'-'}€ {e.amount.toFixed(2)}</div>
                    <div className="flex gap-2 justify-end mt-1">
                      {confirmDeleteId === e.id ? (
                        <>
                          <span className="text-[10px] self-center font-medium text-red-600">Confermi?</span>
                          <button onClick={()=>{ deleteExpense(e.id); setConfirmDeleteId(null); }} className="glass-button glass-button--danger text-[10px]">Elimina</button>
                          <button onClick={()=>setConfirmDeleteId(null)} className="glass-button text-[10px]">Annulla</button>
                        </>
                      ) : (
                        <>
                          <button onClick={()=>startEdit(e)} className="glass-button glass-button--primary text-[10px]">Modifica</button>
                          <button onClick={()=>setConfirmDeleteId(e.id)} className="glass-button glass-button--danger text-[10px]" aria-label="Elimina">X</button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {isEditing && (
                <form onSubmit={(ev)=>{ev.preventDefault(); submitEdit(e.id, e.type);}} className="glass-panel p-3 flex flex-col gap-2 text-xs">
                  <div className="grid grid-cols-5 gap-2">
                    <input className="col-span-2 glass-input" value={form.description} onChange={ev=>setForm(f=>({...f, description: ev.target.value}))} />
                    <input className="glass-input" type="number" step="0.01" value={form.amount} onChange={ev=>setForm(f=>({...f, amount: ev.target.value}))} />
                    {e.type!=='recurring-template' && <input className="glass-input" type="date" value={form.date} onChange={ev=>setForm(f=>({...f, date: ev.target.value}))} />}
                    <select className="glass-input" value={form.direction} onChange={ev=>setForm(f=>({...f, direction: ev.target.value as 'in'|'out'}))}>
                      <option value="out">Uscita</option>
                      <option value="in">Entrata</option>
                    </select>
                    <select className="col-span-2 glass-input" value={form.category} onChange={ev=>setForm(f=>({...f, category: ev.target.value}))}>
                      {categories.map(c=> <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={()=>setEditingId(null)} className="glass-button">Annulla</button>
                    <button type="submit" className="glass-button glass-button--success">Salva</button>
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
