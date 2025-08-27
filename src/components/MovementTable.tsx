"use client";
import React, { useMemo, useCallback, useState } from 'react';
import { Confirm } from '@/components/Confirm';
import { useTracker } from '@/state/TrackerContext';
import { AnyExpense, RecurringExpenseTemplate, GeneratedRecurringExpenseInstance, isTemplate } from '@/domain/types';
import { useMovementFilters } from '@/state/MovementFiltersContext';
import { useI18n } from '@/state/I18nContext';
import { useCurrencyFormatter } from '@/lib/format';

interface Row { id: string; date: string; description: string; category: string; direction: 'in' | 'out'; amount: number; balance: number; projected?: boolean; }

function formatCSV(rows: Row[]): string {
  const header = 'id,date,description,category,direction,amount,balance';
  const body = rows.map(r => [r.id, r.date, r.description.replace(/"/g, '""'), r.category.replace(/"/g, '""'), r.direction, r.amount.toFixed(2), r.balance.toFixed(2)]
    .map(f => (/[,"\n]/.test(String(f)) ? `"${f}"` : f)).join(','));
  return [header, ...body].join('\n');
}

export const MovementTable: React.FC = () => {
  const { expenses, deleteExpense, updateExpense } = useTracker();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [density, setDensity] = useState<'normal' | 'compact'>('normal');
  const [sortField, setSortField] = useState<'date' | 'amount' | 'balance'>('date');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ description: string; amount: string; category: string; direction: 'in' | 'out'; date: string } | null>(null);
  const { t } = useI18n();
  const format = useCurrencyFormatter({ signDisplay: 'always' });

  function startEdit(id: string) {
    const target = rows.find(r => r.id === id);
    if (!target) return;
    setEditingId(id);
    setEditValues({
      description: target.description,
      amount: String(target.amount),
      category: target.category,
      direction: target.direction,
      date: target.date,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditValues(null);
  }

  function commitEdit() {
    if (!editingId || !editValues) return;
    const amt = parseFloat(editValues.amount);
    if (isNaN(amt) || amt <= 0) { return; }
    updateExpense(editingId, {
      description: editValues.description.trim(),
      amount: amt,
      category: editValues.category.trim(),
      direction: editValues.direction,
      date: editValues.date,
    });
    cancelEdit();
  }

  // Shared filters from context
  const { from, to, q, dir, category, sortDesc, update, includeProj } = useMovementFilters();

  // Mobile filters collapse state
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (dir !== 'all') c++;
    if (category) c++;
    if (q.trim()) c++;
    if (!includeProj) c++; // show when projections toggled off
    return c;
  }, [dir, category, q, includeProj]);



  // (moved up)

  // Generate future projected recurring instances up to 'to' date if in future
  const projectFutureInstances = useCallback((templates: RecurringExpenseTemplate[], existing: (Exclude<AnyExpense, { type: 'recurring-template' }>)[], fromDate: Date, toDate: Date): GeneratedRecurringExpenseInstance[] => {
    const existingByTemplate = new Map<string, Set<string>>();
    for (const e of existing) {
      if (e.type === 'recurring-instance') {
        let set = existingByTemplate.get(e.templateId);
        if (!set) { set = new Set(); existingByTemplate.set(e.templateId, set); }
        set.add(e.date.slice(0, 10));
      }
    }
    const out: GeneratedRecurringExpenseInstance[] = [];
    const today = new Date();
    const pushInstance = (t: RecurringExpenseTemplate, date: Date) => {
      const iso = date.toISOString().slice(0, 10);
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

  const baseItems: (Exclude<AnyExpense, { type: 'recurring-template' }>)[] = useMemo(() => {
    const nonTemplates = expenses.filter(e => e.type !== 'recurring-template');
    if (!includeProj || !to) return nonTemplates;
    const toDate = new Date(to + 'T00:00:00');
    const today = new Date();
    if (toDate <= today) return nonTemplates;
    const fromDate = from ? new Date(from + 'T00:00:00') : today;
    return [...nonTemplates, ...projectFutureInstances(expenses.filter(isTemplate), nonTemplates, fromDate, toDate)];
  }, [expenses, to, from, includeProj, projectFutureInstances]);


  function projectWeekly(t: RecurringExpenseTemplate, start: Date, fromDate: Date, toDate: Date, push: (t: RecurringExpenseTemplate, d: Date) => void) {
    let cursor = new Date(start);
    while (cursor < fromDate) cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
    while (cursor <= toDate) { push(t, cursor); cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7); }
  }
  function projectMonthly(t: RecurringExpenseTemplate, start: Date, fromDate: Date, toDate: Date, push: (t: RecurringExpenseTemplate, d: Date) => void) {
    const first = start > fromDate ? start : fromDate;
    let cursor = new Date(first.getFullYear(), first.getMonth(), 1);
    const day = start.getDate();
    while (cursor <= toDate) {
      const lastDay = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
      const occurrence = new Date(cursor.getFullYear(), cursor.getMonth(), Math.min(day, lastDay));
      if (occurrence >= start) push(t, occurrence);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  }
  function projectYearly(t: RecurringExpenseTemplate, start: Date, fromDate: Date, toDate: Date, push: (t: RecurringExpenseTemplate, d: Date) => void) {
    const firstYear = Math.max(start.getFullYear(), fromDate.getFullYear());
    for (let y = firstYear; y <= toDate.getFullYear(); y++) {
      const occurrence = new Date(y, start.getMonth(), start.getDate());
      if (occurrence >= start && occurrence <= toDate) push(t, occurrence);
    }
  }

  const categories = useMemo(() => Array.from(new Set(baseItems.map(i => i.category))).sort((a, b) => a.localeCompare(b)), [baseItems]);

  const filteredSorted = useMemo(() => {
    const start = from ? new Date(from) : null;
    const end = to ? new Date(to) : null;
    const text = q.trim().toLowerCase();
    const filtered = baseItems
      .filter(i => {
        const d = new Date(i.date);
        if (start && d < start) return false;
        if (end && d > end) return false;
        if (dir !== 'all' && i.direction !== dir) return false;
        if (category && i.category !== category) return false;
        if (text && !(i.description.toLowerCase().includes(text) || i.category.toLowerCase().includes(text))) return false;
        return true;
      });
    const sorted = [...filtered].sort((a, b) => {
      if (sortField === 'date') {
        return (sortDesc ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date));
      } else if (sortField === 'amount') {
        return sortDesc ? b.amount - a.amount : a.amount - b.amount;
      } else { // balance sort requires computing running balances first; fallback to amount for now
        return sortDesc ? b.amount - a.amount : a.amount - b.amount;
      }
    });
    return sorted;
  }, [baseItems, from, to, q, dir, category, sortDesc, sortField]);

  const rows = useMemo<Row[]>(() => {
    let balance = 0;
    // For chronological balance calculation we need ascending order
    const chronological = [...filteredSorted].sort((a, b) => a.date.localeCompare(b.date));
    const computed: Row[] = chronological.map(e => {
      balance += e.direction === 'in' ? e.amount : -e.amount;
      const projected = e.id.startsWith('proj-');
      return { id: e.id, date: e.date.slice(0, 10), description: e.description, category: e.category, direction: e.direction, amount: e.amount, balance, projected };
    });
    // Present rows in current sort direction
    let presented = computed;
    if (sortField === 'date') {
      presented = sortDesc ? [...computed].sort((a, b) => b.date.localeCompare(a.date)) : computed;
    } else if (sortField === 'amount') {
      presented = [...computed].sort((a, b) => sortDesc ? b.amount - a.amount : a.amount - b.amount);
    } else if (sortField === 'balance') {
      presented = [...computed].sort((a, b) => sortDesc ? b.balance - a.balance : a.balance - b.balance);
    }
    return presented;
  }, [filteredSorted, sortDesc, sortField]);

  const totals = useMemo(() => {
    let inc = 0, out = 0;
    rows.forEach(r => { if (r.direction === 'in') inc += r.amount; else out += r.amount; });
    return { inc, out, net: inc - out };
  }, [rows]);

  // Replaced Intl.NumberFormat with centralized formatter

  function exportCSV() {
    const csv = formatCSV(rows.slice().sort((a, b) => a.date.localeCompare(b.date)));
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `movimenti-${from || 'start'}-${to || 'end'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSort(field: typeof sortField) {
    if (sortField === field) {
      update({ sortDesc: !sortDesc });
    } else {
      setSortField(field);
    }
  }

  const headerBase = 'px-2 py-1 text-left select-none cursor-pointer hover:text-accent transition-colors';
  const headerRight = headerBase + ' text-right';

  const deleteTarget = deleteId ? rows.find(r => r.id === deleteId) : null;
  const confirmDescription = deleteTarget ? <>{t('mov.delete.confirm')} <span className="font-medium">{deleteTarget.description}</span>? {t('mov.delete.irreversible')}</> : null;
  const confirmDetails = deleteTarget ? (
    <>
      <div><span className="opacity-70">{t('mov.field.date')}:</span> {deleteTarget.date}</div>
      <div><span className="opacity-70">{t('mov.field.category')}:</span> {deleteTarget.category}</div>
      <div><span className="opacity-70">{t('mov.field.amount')}:</span> {deleteTarget.direction === 'in' ? '+' : '-'}€ {deleteTarget.amount?.toFixed(2)}</div>
      <div><span className="opacity-70">{t('mov.field.balanceAfter')}:</span> € {deleteTarget.balance.toFixed(2)}</div>
    </>
  ) : null;

  return (
    <div data-density={density} className={`flex flex-col h-full min-h-0 glass-panel glass-panel--pure p-2 md:p-3 gap-2 ${density === 'compact' ? 'density-compact' : ''}`}>
      {/* Mobile top controls */}
      <div className="sm:hidden flex items-center gap-2 text-[11px]">
        <button
          onClick={() => setFiltersOpen(o => !o)}
          className="glass-button glass-button--xs"
          aria-expanded={filtersOpen}
          aria-controls="mov-filters"
        >{filtersOpen ? '−' : '+'} {t('mov.search')}{activeFilterCount > 0 && <span className="ml-1 inline-block px-1 rounded bg-accent/80 text-[10px] text-white">{activeFilterCount}</span>}</button>
        <button onClick={() => setDensity(d => d === 'normal' ? 'compact' : 'normal')} className="glass-button glass-button--xs" aria-label={t('mov.density')}>{density === 'normal' ? t('mov.density.compact') : t('mov.density.normal')}</button>
        <button onClick={exportCSV} className="glass-button glass-button--primary glass-button--xs ml-auto" aria-label={t('mov.export')}>{t('mov.export')}</button>
      </div>
      <div id="mov-filters" className={`flex flex-wrap gap-3 items-end text-[11px] md:text-[13px] ${filtersOpen ? '' : 'hidden sm:flex'} sm:flex`}>
        <div className="flex flex-col">
          <label htmlFor="mov-from" className="uppercase tracking-wide text-[10px] font-semibold">{t('mov.from')}</label>
          <input id="mov-from" type="date" value={from} onChange={e => update({ from: e.target.value })} className="glass-input" />
        </div>
        <div className="flex flex-col">
          <label htmlFor="mov-to" className="uppercase tracking-wide text-[10px] font-semibold">{t('mov.to')}</label>
          <input id="mov-to" type="date" value={to} onChange={e => update({ to: e.target.value })} className="glass-input" />
        </div>
        <div className="flex flex-col min-w-[140px]">
          <label htmlFor="mov-dir" className="uppercase tracking-wide text-[10px] font-semibold">{t('mov.direction')}</label>
          <select id="mov-dir" value={dir} onChange={e => update({ dir: e.target.value as 'all' | 'in' | 'out' })} className="glass-input">
            <option value="all">{t('mov.direction.all')}</option>
            <option value="in">{t('mov.direction.in')}</option>
            <option value="out">{t('mov.direction.out')}</option>
          </select>
        </div>
        <div className="flex flex-col min-w-[140px]">
          <label htmlFor="mov-cat" className="uppercase tracking-wide text-[10px] font-semibold">{t('mov.category')}</label>
          <select id="mov-cat" value={category} onChange={e => update({ category: e.target.value })} className="glass-input">
            <option value="">{t('mov.category.all')}</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col flex-1 min-w-[160px]">
          <label htmlFor="mov-search" className="uppercase tracking-wide text-[10px] font-semibold">{t('mov.search')}</label>
          <input id="mov-search" placeholder={t('mov.search.placeholder')} value={q} onChange={e => update({ q: e.target.value })} className="glass-input" />
        </div>
        <div className="flex gap-2 ml-auto items-end">
          <button onClick={() => setDensity(d => d === 'normal' ? 'compact' : 'normal')} className="glass-button glass-button--sm" aria-label="Toggle densità tabella">{t('mov.density')}: {density === 'normal' ? t('mov.density.normal') : t('mov.density.compact')}</button>
          <button onClick={exportCSV} className="glass-button glass-button--primary glass-button--sm" aria-label="Esporta file CSV">{t('mov.export')}</button>
        </div>
      </div>
      <div className="mov-summary px-2 md:px-3 py-2 glass-panel glass-panel--pure flex gap-4 text-[11px] md:text-xs flex-wrap items-center">
        <span className="text-success font-medium">{t('mov.income')}: {format(totals.inc)}</span>
        <span className="text-danger font-medium">{t('mov.expenses')}: {format(totals.out)}</span>
        <span className={(totals.net >= 0 ? 'text-success' : 'text-danger') + ' font-semibold'}>{t('mov.net')}: {format(totals.net)}</span>
        {rows.length > 0 && <span className="text-secondary">{t('mov.finalBalance')}: {format(rows[rows.length - 1].balance)}</span>}
        <span className="ml-auto opacity-60 text-[10px]">{t('mov.sort')}: {sortField} {sortDesc ? '↓' : '↑'}</span>
      </div>
      {/* Desktop / tablet table */}
      <div className={`overflow-auto flex-1 min-h-0 glass-scroll rounded-md border border-white/30 dark:border-white/5 ${density === 'compact' ? 'text-[11px]' : 'text-[12px]'} hidden sm:block`}>
        <table className="glass-table w-full">
          <thead className="sticky top-0 z-10 bg-white/65 dark:bg-slate-900/55 backdrop-blur-xl shadow-sm">
            <tr className="[&_th]:font-semibold">
              <th
                className={headerBase}
                role="columnheader"
                aria-sort={sortField === 'date' ? (sortDesc ? 'descending' : 'ascending') : 'none'}
                onClick={() => toggleSort('date')}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort('date'); } }}
              >{t('mov.col.date')}</th>
              <th className={headerBase}>{t('mov.col.description')}</th>
              <th className="px-2 py-1 text-left hidden md:table-cell">{t('mov.col.category')}</th>
              <th
                className={headerRight}
                role="columnheader"
                aria-sort={sortField === 'amount' ? (sortDesc ? 'descending' : 'ascending') : 'none'}
                onClick={() => toggleSort('amount')}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort('amount'); } }}
              >{t('mov.col.amount')}</th>
              <th
                className={headerRight + ' hidden sm:table-cell'}
                role="columnheader"
                aria-sort={sortField === 'balance' ? (sortDesc ? 'descending' : 'ascending') : 'none'}
                onClick={() => toggleSort('balance')}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSort('balance'); } }}
              >{t('mov.col.balance')}</th>
              <th className={headerRight}>{t('mov.col.actions')}</th>
            </tr>
          </thead>
          <tbody className="[&_tr]:transition-colors [&_tr:hover]:bg-white/55 dark:[&_tr:hover]:bg-slate-700/35">
            {rows.map(r => {
              const amountSigned = r.direction === 'in' ? r.amount : -r.amount;
              const isEditing = editingId === r.id && editValues;
              return (
                <tr key={r.id} className={(r.projected ? 'opacity-80 italic row-projected ' : '') + (isEditing ? ' outline outline-[var(--accent)] bg-white/60 dark:bg-slate-700/50 ' : '')}>
                  {isEditing ? (
                    <>
                      <td className="px-2 py-1 font-mono tabular-nums whitespace-nowrap">
                        <input
                          type="date"
                          value={editValues!.date}
                          onChange={e => setEditValues(v => v ? { ...v, date: e.target.value } : v)}
                          className="glass-input glass-input--sm min-w-[120px]"
                        />
                      </td>
                      <td className="px-2 py-1 max-w-[260px] md:max-w-[320px]">
                        <input
                          value={editValues!.description}
                          onChange={e => setEditValues(v => v ? { ...v, description: e.target.value } : v)}
                          className="glass-input glass-input--sm w-full mb-1"
                          placeholder={t('mov.col.description')}
                        />
                        <div className="flex gap-1 items-center">
                          <input
                            type="text"
                            value={editValues!.category}
                            onChange={e => setEditValues(v => v ? { ...v, category: e.target.value } : v)}
                            className="glass-input glass-input--sm text-[10px] flex-1"
                            placeholder={t('mov.col.category')}
                          />
                          <select
                            value={editValues!.direction}
                            onChange={e => setEditValues(v => v ? { ...v, direction: e.target.value as 'in' | 'out' } : v)}
                            className="glass-input glass-input--sm text-[10px]"
                          >
                            <option value="out">−</option>
                            <option value="in">+</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-2 py-1 hidden md:table-cell">
                        <input
                          type="text"
                          value={editValues!.category}
                          onChange={e => setEditValues(v => v ? { ...v, category: e.target.value } : v)}
                          className="glass-input glass-input--sm w-full"
                        />
                      </td>
                      <td className="px-2 py-1 text-right font-mono tabular-nums">
                        <input
                          type="number"
                          step="0.01"
                          value={editValues!.amount}
                          onChange={e => setEditValues(v => v ? { ...v, amount: e.target.value } : v)}
                          className="glass-input glass-input--sm w-[90px] text-right font-mono"
                        />
                      </td>
                      <td className="px-2 py-1 text-right font-mono tabular-nums hidden sm:table-cell">{format(r.balance)}</td>
                      <td className="px-2 py-1 text-right whitespace-nowrap flex gap-1 justify-end">
                        <button onClick={commitEdit} className="glass-button glass-button--sm glass-button--success" aria-label={t('mov.actions.save')}>✓</button>
                        <button onClick={cancelEdit} className="glass-button glass-button--sm glass-button--neutral" aria-label={t('mov.actions.cancel')}>↺</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-2 py-1 font-mono tabular-nums whitespace-nowrap">{r.date}</td>
                      <td className="px-2 py-1 max-w-[260px] md:max-w-[320px]">
                        <span className="block truncate font-medium">{r.description}</span>
                        <span className="md:hidden block text-[10px] opacity-60 mt-0.5">{r.category}</span>
                        {r.projected && <span className="ml-1 glass-badge badge-future">{t('mov.future')}</span>}
                      </td>
                      <td className="px-2 py-1 hidden md:table-cell">{r.category}</td>
                      <td className={`px-2 py-1 text-right font-mono tabular-nums ${amountSigned >= 0 ? 'text-success' : 'text-danger'}`}>{format(amountSigned)}</td>
                      <td className={`px-2 py-1 text-right font-mono tabular-nums hidden sm:table-cell ${r.balance >= 0 ? 'text-success' : 'text-danger'}`}>{format(r.balance)}</td>
                      <td className="px-2 py-1 text-right whitespace-nowrap flex gap-1 justify-end">
                        {!r.projected && (
                          <button
                            onClick={() => startEdit(r.id)}
                            className="glass-button glass-button--xs pressable"
                            aria-label={t('mov.actions.edit')}
                          >✎</button>
                        )}
                        {!r.projected ? (
                          <button
                            onClick={() => { setDeleteId(r.id); setModalOpen(true); }}
                            className="glass-button glass-button--danger glass-button--xs pressable"
                            aria-label={t('mov.actions.delete')}
                          >✕</button>
                        ) : <span className="text-[10px] opacity-40">—</span>}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="text-center px-2 py-6 text-neutral-500">{t('mov.none')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <div className="sm:hidden flex-1 min-h-0 overflow-auto glass-scroll rounded-md border border-white/30 dark:border-white/5 p-1 flex flex-col gap-1 text-[12px]">
        {rows.map(r => {
          const amountSigned = r.direction === 'in' ? r.amount : -r.amount;
          const isEditing = editingId === r.id && editValues;
          if (isEditing) {
            return (
              <div key={r.id} className="p-2 rounded-md glass-panel glass-panel--subtle space-y-2 outline outline-[var(--accent)]">
                <div className="flex gap-2">
                  <input type="date" value={editValues!.date} onChange={e => setEditValues(v => v ? { ...v, date: e.target.value } : v)} className="glass-input glass-input--sm flex-1" />
                  <select value={editValues!.direction} onChange={e => setEditValues(v => v ? { ...v, direction: e.target.value as 'in' | 'out' } : v)} className="glass-input glass-input--sm w-16">
                    <option value="out">{t('form.direction.out')}</option>
                    <option value="in">{t('form.direction.in')}</option>
                  </select>
                </div>
                <input value={editValues!.description} onChange={e => setEditValues(v => v ? { ...v, description: e.target.value } : v)} className="glass-input glass-input--sm w-full" placeholder={t('mov.col.description')} />
                <div className="flex gap-2">
                  <input type="text" value={editValues!.category} onChange={e => setEditValues(v => v ? { ...v, category: e.target.value } : v)} className="glass-input glass-input--sm flex-1" placeholder={t('mov.col.category')} />
                  <input type="number" step="0.01" value={editValues!.amount} onChange={e => setEditValues(v => v ? { ...v, amount: e.target.value } : v)} className="glass-input glass-input--sm w-28 text-right font-mono" />
                </div>
                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span className={`font-mono ${amountSigned >= 0 ? 'text-success' : 'text-danger'}`}>{format(amountSigned)}</span>
                  <span className={`font-mono ${r.balance >= 0 ? 'text-success' : 'text-danger'}`}>{format(r.balance)}</span>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={commitEdit} className="glass-button glass-button--sm glass-button--success" aria-label={t('mov.actions.save')}>✓</button>
                  <button onClick={cancelEdit} className="glass-button glass-button--sm glass-button--neutral" aria-label={t('mov.actions.cancel')}>↺</button>
                </div>
              </div>
            );
          }
          return (
            <div key={r.id} className={`p-2 rounded-md glass-panel glass-panel--subtle space-y-1 ${r.projected ? 'opacity-80 italic' : ''}`}>
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-white/50 dark:bg-white/10 border border-white/30 dark:border-white/5">{r.date.slice(5)}</span>
                    {r.projected && <span className="glass-badge badge-future text-[9px]">{t('mov.future')}</span>}
                  </div>
                  <div className="font-medium truncate mt-0.5">{r.description}</div>
                  <div className="text-[10px] opacity-60 truncate">{r.category}</div>
                </div>
                <div className="flex flex-col items-end gap-1 ml-2">
                  <span className={`font-mono ${amountSigned >= 0 ? 'text-success' : 'text-danger'}`}>{format(amountSigned)}</span>
                  <span className={`font-mono text-[10px] ${r.balance >= 0 ? 'text-success' : 'text-danger'}`}>{format(r.balance)}</span>
                  <div className="flex gap-1">
                    {!r.projected && <button onClick={() => startEdit(r.id)} className="glass-button glass-button--xs" aria-label={t('mov.actions.edit')}>✎</button>}
                    {!r.projected ? (
                      <button onClick={() => { setDeleteId(r.id); setModalOpen(true); }} className="glass-button glass-button--danger glass-button--xs" aria-label={t('mov.actions.delete')}>✕</button>
                    ) : <span className="text-[9px] opacity-40">—</span>}
                  </div>
                </div>
              </div>
            </div>
          );
          );
        })}
        {!rows.length && (
          <div className="p-6 text-center text-neutral-500 text-[12px]">{t('mov.none')}</div>
        )}
      </div>
      <Confirm
        open={modalOpen && !!deleteTarget}
        title={t('mov.delete.title')}
        description={confirmDescription}
        details={confirmDetails}
        confirmLabel={t('mov.delete.confirmLabel')}
        variant="danger"
        onCancel={() => { setModalOpen(false); setDeleteId(null); }}
        onConfirm={() => { if (deleteTarget) { deleteExpense(deleteTarget.id); } setModalOpen(false); setDeleteId(null); }}
      />
    </div>
  );
};