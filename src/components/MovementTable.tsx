"use client";
import React, { useMemo, useCallback } from 'react';
import { useTracker } from '@/state/TrackerContext';
import { AnyExpense, RecurringExpenseTemplate, GeneratedRecurringExpenseInstance, isTemplate } from '@/domain/types';
import { useMovementFilters } from '@/state/MovementFiltersContext';

interface Row { id: string; date: string; description: string; category: string; direction: 'in'|'out'; amount: number; balance: number; projected?: boolean; }

function formatCSV(rows: Row[]): string {
  const header = 'id,date,description,category,direction,amount,balance';
  const body = rows.map(r => [r.id, r.date, r.description.replace(/"/g,'""'), r.category.replace(/"/g,'""'), r.direction, r.amount.toFixed(2), r.balance.toFixed(2)]
    .map(f => (/[,"\n]/.test(String(f)) ? `"${f}"` : f)).join(','));
  return [header, ...body].join('\n');
}

export const MovementTable: React.FC = () => {
  const { expenses } = useTracker();

  // Shared filters from context
  const { from, to, q, dir, category, sortDesc, update, includeProj } = useMovementFilters();

  // Generate future projected recurring instances up to 'to' date if in future
  const projectFutureInstances = useCallback((templates: RecurringExpenseTemplate[], existing: (Exclude<AnyExpense,{type:'recurring-template'}>)[], fromDate: Date, toDate: Date): GeneratedRecurringExpenseInstance[] => {
    const existingByTemplate = new Map<string, Set<string>>();
    for (const e of existing) {
      if (e.type === 'recurring-instance') {
        let set = existingByTemplate.get(e.templateId);
        if (!set) { set = new Set(); existingByTemplate.set(e.templateId, set); }
        set.add(e.date.slice(0,10));
      }
    }
    const out: GeneratedRecurringExpenseInstance[] = [];
    const today = new Date();
    const pushInstance = (t: RecurringExpenseTemplate, date: Date) => {
      const iso = date.toISOString().slice(0,10);
      if (date < fromDate || date > toDate) return;
      if (date < today) return;
      if (t.endDate && date > new Date(t.endDate)) return;
      if (existingByTemplate.get(t.id)?.has(iso)) return;
      out.push({
        id: `proj-${t.id}-${iso}`,
        type: 'recurring-instance',
        templateId: t.id,
        description: t.description,
        amount: t.amount,
        category: t.category,
        direction: t.direction,
        date: date.toISOString(),
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      });
    };
    for (const t of templates) {
      if (t.endDate && new Date(t.endDate) < fromDate) continue;
      const start = new Date(t.startDate);
      if (t.frequency === 'weekly') projectWeekly(t, start, fromDate, toDate, pushInstance);
      else if (t.frequency === 'monthly') projectMonthly(t, start, fromDate, toDate, pushInstance);
      else if (t.frequency === 'yearly') projectYearly(t, start, fromDate, toDate, pushInstance);
    }
    return out;
  }, []);

  const baseItems: (Exclude<AnyExpense,{type:'recurring-template'}>)[] = useMemo(()=> {
    const nonTemplates = expenses.filter(e => e.type !== 'recurring-template');
    if (!includeProj || !to) return nonTemplates;
    const toDate = new Date(to + 'T00:00:00');
    const today = new Date();
    if (toDate <= today) return nonTemplates;
    const fromDate = from ? new Date(from + 'T00:00:00') : today;
    return [...nonTemplates, ...projectFutureInstances(expenses.filter(isTemplate), nonTemplates, fromDate, toDate)];
  }, [expenses, to, from, includeProj, projectFutureInstances]);


  function projectWeekly(t: RecurringExpenseTemplate, start: Date, fromDate: Date, toDate: Date, push: (t: RecurringExpenseTemplate, d: Date)=>void) {
    let cursor = new Date(start);
    while (cursor < fromDate) cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
    while (cursor <= toDate) { push(t, cursor); cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7); }
  }
  function projectMonthly(t: RecurringExpenseTemplate, start: Date, fromDate: Date, toDate: Date, push: (t: RecurringExpenseTemplate, d: Date)=>void) {
    const first = start > fromDate ? start : fromDate;
    let cursor = new Date(first.getFullYear(), first.getMonth(), 1);
    const day = start.getDate();
    while (cursor <= toDate) {
      const lastDay = new Date(cursor.getFullYear(), cursor.getMonth()+1, 0).getDate();
      const occurrence = new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(day, lastDay));
      if (occurrence >= start) push(t, occurrence);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth()+1, 1);
    }
  }
  function projectYearly(t: RecurringExpenseTemplate, start: Date, fromDate: Date, toDate: Date, push: (t: RecurringExpenseTemplate, d: Date)=>void) {
    const firstYear = Math.max(start.getFullYear(), fromDate.getFullYear());
    for (let y = firstYear; y <= toDate.getFullYear(); y++) {
      const occurrence = new Date(y, start.getMonth(), start.getDate());
      if (occurrence >= start && occurrence <= toDate) push(t, occurrence);
    }
  }

  const categories = useMemo(()=> Array.from(new Set(baseItems.map(i=>i.category))).sort((a,b)=> a.localeCompare(b)), [baseItems]);

  const filteredSorted = useMemo(()=> {
    const start = from ? new Date(from) : null;
    const end = to ? new Date(to) : null;
    const text = q.trim().toLowerCase();
    return baseItems
      .filter(i => {
        const d = new Date(i.date);
        if (start && d < start) return false;
        if (end && d > end) return false;
        if (dir !== 'all' && i.direction !== dir) return false;
        if (category && i.category !== category) return false;
        if (text && !(i.description.toLowerCase().includes(text) || i.category.toLowerCase().includes(text))) return false;
        return true;
      })
      .sort((a,b)=> sortDesc ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
  }, [baseItems, from, to, q, dir, category, sortDesc]);

  const rows = useMemo<Row[]>(() => {
    let balance = 0;
    // For chronological balance calculation we need ascending order
    const chronological = [...filteredSorted].sort((a,b)=> a.date.localeCompare(b.date));
    const computed: Row[] = chronological.map(e => {
      balance += e.direction === 'in' ? e.amount : -e.amount;
      const projected = e.id.startsWith('proj-');
      return { id: e.id, date: e.date.slice(0,10), description: e.description, category: e.category, direction: e.direction, amount: e.amount, balance, projected };
    });
    // Present rows in current sort direction
    return sortDesc ? [...computed].sort((a,b)=> b.date.localeCompare(a.date)) : computed;
  }, [filteredSorted, sortDesc]);

  const totals = useMemo(()=> {
    let inc = 0, out = 0;
    rows.forEach(r => { if (r.direction==='in') inc += r.amount; else out += r.amount; });
    return { inc, out, net: inc - out };
  }, [rows]);

  function exportCSV(){
    const csv = formatCSV(rows.slice().sort((a,b)=> a.date.localeCompare(b.date)));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimenti-${from || 'start'}-${to || 'end'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="glass-panel flex flex-col">
      <div className="p-3 border-b border-white/40 dark:border-white/10 flex flex-wrap gap-3 items-end text-xs md:text-[13px]">
        <div className="flex flex-col">
          <label htmlFor="mov-from" className="uppercase tracking-wide text-[10px] font-semibold">Da</label>
          <input id="mov-from" type="date" value={from} onChange={e=>update({ from: e.target.value })} className="glass-input" />
        </div>
        <div className="flex flex-col">
          <label htmlFor="mov-to" className="uppercase tracking-wide text-[10px] font-semibold">A</label>
          <input id="mov-to" type="date" value={to} onChange={e=>update({ to: e.target.value })} className="glass-input" />
        </div>
        <div className="flex flex-col min-w-[140px]">
          <label htmlFor="mov-dir" className="uppercase tracking-wide text-[10px] font-semibold">Direzione</label>
          <select id="mov-dir" value={dir} onChange={e=>update({ dir: e.target.value as 'all'|'in'|'out' })} className="glass-input">
            <option value="all">Entrate + Uscite</option>
            <option value="in">Solo Entrate</option>
            <option value="out">Solo Uscite</option>
          </select>
        </div>
        <div className="flex flex-col min-w-[140px]">
          <label htmlFor="mov-cat" className="uppercase tracking-wide text-[10px] font-semibold">Categoria</label>
          <select id="mov-cat" value={category} onChange={e=>update({ category: e.target.value })} className="glass-input">
            <option value="">Tutte</option>
            {categories.map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col flex-1 min-w-[160px]">
          <label htmlFor="mov-search" className="uppercase tracking-wide text-[10px] font-semibold">Cerca</label>
          <input id="mov-search" placeholder="testo o categoria" value={q} onChange={e=>update({ q: e.target.value })} className="glass-input" />
        </div>
        <div className="flex gap-2 ml-auto">
          <button onClick={()=>update({ sortDesc: !sortDesc })} className="glass-button" aria-label="Cambia ordinamento">{sortDesc?'↓':'↑'} Ordina</button>
          <button onClick={exportCSV} className="glass-button glass-button--primary" aria-label="Esporta file CSV">Export CSV</button>
        </div>
      </div>
      <div className="px-3 py-2 border-b border-white/40 dark:border-white/10 flex gap-6 text-xs flex-wrap">
        <span className="text-green-700 dark:text-green-400">Entrate: € {totals.inc.toFixed(2)}</span>
        <span className="text-red-600 dark:text-red-400">Uscite: € {totals.out.toFixed(2)}</span>
        <span className={`${totals.net>=0?'text-emerald-700 dark:text-emerald-400':'text-red-700 dark:text-red-400'}`}>Saldo Netto: € {totals.net.toFixed(2)}</span>
  {rows.length>0 && <span className="text-neutral-500">Saldo Finale: € {rows[rows.length-1].balance.toFixed(2)}</span>}
      </div>
      <div className="overflow-auto max-h-[480px] glass-scroll">
        <table className="glass-table">
          <thead className="sticky top-0 bg-white/55 dark:bg-slate-800/45 backdrop-blur text-neutral-700 dark:text-neutral-200 shadow-sm">
            <tr>
              <th className="px-2 py-1 text-left">Data</th>
              <th className="px-2 py-1 text-left">Descrizione</th>
              <th className="px-2 py-1 text-left">Categoria</th>
              <th className="px-2 py-1 text-right">Entrate</th>
              <th className="px-2 py-1 text-right">Uscite</th>
              <th className="px-2 py-1 text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id}>
                <td className="px-2 py-1 font-mono tabular-nums">{r.date}</td>
                <td className="px-2 py-1">{r.description} {r.projected && <span className="ml-1 glass-badge badge-future">FUTURO</span>}</td>
                <td className="px-2 py-1">{r.category}</td>
                <td className="px-2 py-1 text-right text-green-600 font-mono">{r.direction==='in'?`€ ${r.amount.toFixed(2)}`:''}</td>
                <td className="px-2 py-1 text-right text-red-600 font-mono">{r.direction==='out'?`€ ${r.amount.toFixed(2)}`:''}</td>
                <td className={`px-2 py-1 text-right font-mono ${r.balance>=0?'text-emerald-700':'text-red-700'}`}>€ {r.balance.toFixed(2)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="text-center px-2 py-6 text-neutral-500">Nessun movimento</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};