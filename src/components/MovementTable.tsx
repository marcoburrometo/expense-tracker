"use client";
import React, { useMemo, useCallback, useState } from 'react';
import { Confirm } from '@/components/Confirm';
import { useTracker } from '@/state/TrackerContext';
import { AnyExpense, RecurringExpenseTemplate, GeneratedRecurringExpenseInstance, isTemplate } from '@/domain/types';
import { useMovementFilters } from '@/state/MovementFiltersContext';
import { DatePicker } from './DatePicker';
import { useI18n } from '@/state/I18nContext';
import { useCurrencyFormatter } from '@/lib/format';
import { formatCategory } from '@/lib/formatCategory';
import { mergeCategories } from '@/domain/categories';
import GlassPanel from './GlassPanel';

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

  const categories = useMemo(() => mergeCategories(baseItems.map(i => i.category)), [baseItems]);

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
    // Compute initial running balance BEFORE current filter window start (to preserve cumulative correctness)
    // We intentionally exclude projected future instances from baseline to avoid skewing historical balance.
    const filterStart = from ? new Date(from + 'T00:00:00') : null;
    let initialBalance = 0;
    if (filterStart) {
      for (const e of baseItems) {
        if (e.id.startsWith('proj-')) continue;
        const d = new Date(e.date);
        if (d < filterStart) initialBalance += e.direction === 'in' ? e.amount : -e.amount;
      }
    }
    let balance = initialBalance;
    // For chronological calculation we sort ascending by date
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
  }, [filteredSorted, sortDesc, sortField, baseItems, from]);

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
      <div><span className="opacity-70">{t('mov.field.category')}:</span> {formatCategory(deleteTarget.category, t)}</div>
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
          <DatePicker id="mov-from" value={from} onChange={val => update({ from: val })} ariaLabel={t('mov.from')} />
        </div>
        <div className="flex flex-col">
          <label htmlFor="mov-to" className="uppercase tracking-wide text-[10px] font-semibold">{t('mov.to')}</label>
          <DatePicker id="mov-to" value={to} onChange={val => update({ to: val })} ariaLabel={t('mov.to')} />
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
            {categories.map(c => <option key={c} value={c}>{formatCategory(c, t)}</option>)}
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
                    <td colSpan={6} className="p-2 align-top">
                      <GlassPanel as="form" variant="subtle"
                        onSubmit={e => { e.preventDefault(); commitEdit(); }}
                        onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); } }}
                        className="space-y-4 text-[11px] md:text-[12px]"
                      >
                        {/* Row 1: Date + Description */}
                        <div className="grid md:grid-cols-5 gap-3 items-start">
                          <div className="flex flex-col gap-1 md:col-span-1 min-w-[120px]">
                            <label className="uppercase tracking-wide text-[9px] font-semibold opacity-70" htmlFor="edit-date">{t('mov.field.date')}</label>
                            <DatePicker id="edit-date" value={editValues!.date} onChange={val => setEditValues(v => v ? { ...v, date: val } : v)} ariaLabel={t('mov.field.date')} />
                          </div>
                          <div className="flex flex-col gap-1 md:col-span-4 min-w-0">
                            <label className="uppercase tracking-wide text-[9px] font-semibold opacity-70" htmlFor="edit-desc">{t('mov.col.description')}</label>
                            <input id="edit-desc" autoFocus value={editValues!.description} onChange={e => setEditValues(v => v ? { ...v, description: e.target.value } : v)} className="glass-input w-full" placeholder={t('mov.col.description')} />
                          </div>
                        </div>
                        {/* Row 2: Category + Direction + Amount */}
                        <div className="grid md:grid-cols-5 gap-3 items-start">
                          <div className="flex flex-col gap-1 md:col-span-3">
                            <label className="uppercase tracking-wide text-[9px] font-semibold opacity-70" htmlFor="edit-cat">{t('mov.col.category')}</label>
                            <select id="edit-cat" value={editValues!.category} onChange={e => setEditValues(v => v ? { ...v, category: e.target.value } : v)} className="glass-input w-full">
                              {categories.map(c => <option key={c} value={c}>{formatCategory(c, t)}</option>)}
                            </select>
                          </div>
                          <div className="flex flex-col gap-1 md:col-span-1">
                            <label className="uppercase tracking-wide text-[9px] font-semibold opacity-70" htmlFor="edit-dir">{t('mov.direction')}</label>
                            <select id="edit-dir" value={editValues!.direction} onChange={e => setEditValues(v => v ? { ...v, direction: e.target.value as 'in' | 'out' } : v)} className="glass-input w-full">
                              <option value="out">{t('form.direction.out')}</option>
                              <option value="in">{t('form.direction.in')}</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1 md:col-span-1">
                            <label className="uppercase tracking-wide text-[9px] font-semibold opacity-70" htmlFor="edit-amount">{t('mov.col.amount')}</label>
                            <input id="edit-amount" type="number" step="0.01" value={editValues!.amount} onChange={e => setEditValues(v => v ? { ...v, amount: e.target.value } : v)} className="glass-input w-full text-right font-mono" />
                          </div>
                        </div>
                        {/* Row 3: Actions */}
                        <div className="flex gap-2 justify-end">
                          <button type="button" onClick={cancelEdit} className="glass-button glass-button--sm glass-button--neutral whitespace-nowrap">{t('generic.cancel')}</button>
                          <button type="submit" className="glass-button glass-button--sm glass-button--success whitespace-nowrap">{t('generic.save')}</button>
                        </div>
                      </GlassPanel>
                    </td>
                  ) : (
                    <>
                      <td className="px-2 py-1 font-mono tabular-nums whitespace-nowrap">{r.date}</td>
                      <td className="px-2 py-1 max-w-[260px] md:max-w-[320px]">
                        <span className="block truncate font-medium">{r.description}</span>
                        <span className="md:hidden block text-[10px] opacity-60 mt-0.5">{formatCategory(r.category, t)}</span>
                        {r.projected && <span className="ml-1 glass-badge badge-future">{t('mov.future')}</span>}
                      </td>
                      <td className="px-2 py-1 hidden md:table-cell">{formatCategory(r.category, t)}</td>
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
              <GlassPanel key={r.id} variant="pure" className="p-3 space-y-4 outline outline-[var(--accent)]">
                <form
                  onSubmit={e => { e.preventDefault(); commitEdit(); }}
                  onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); } }}
                  className="space-y-3"
                >
                  {/* Row1: Date + Description */}
                  <div className="grid grid-cols-2 gap-2 items-start">
                    <DatePicker value={editValues!.date} onChange={val => setEditValues(v => v ? { ...v, date: val } : v)} ariaLabel={t('mov.field.date')} className="col-span-1" />
                    <input autoFocus value={editValues!.description} onChange={e => setEditValues(v => v ? { ...v, description: e.target.value } : v)} className="glass-input col-span-1" placeholder={t('mov.col.description')} />
                  </div>
                  {/* Row2: Category + Direction + Amount */}
                  <div className="grid grid-cols-3 gap-2">
                    <select value={editValues!.category} onChange={e => setEditValues(v => v ? { ...v, category: e.target.value } : v)} className="glass-input col-span-2">
                      {categories.map(c => <option key={c} value={c}>{formatCategory(c, t)}</option>)}
                    </select>
                    <div className="flex gap-2 col-span-1">
                      <select value={editValues!.direction} onChange={e => setEditValues(v => v ? { ...v, direction: e.target.value as 'in' | 'out' } : v)} className="glass-input w-20">
                        <option value="out">{t('form.direction.out')}</option>
                        <option value="in">{t('form.direction.in')}</option>
                      </select>
                      <input type="number" step="0.01" value={editValues!.amount} onChange={e => setEditValues(v => v ? { ...v, amount: e.target.value } : v)} className="glass-input flex-1 text-right font-mono" placeholder={t('mov.col.amount')} />
                    </div>
                  </div>
                  {/* Row3: Summary + Actions */}
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex flex-col gap-1">
                      <span className={`font-mono ${amountSigned >= 0 ? 'text-success' : 'text-danger'}`}>{format(amountSigned)}</span>
                      <span className={`font-mono ${r.balance >= 0 ? 'text-success' : 'text-danger'}`}>{format(r.balance)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={cancelEdit} className="glass-button glass-button--sm glass-button--neutral">{t('generic.cancel')}</button>
                      <button type="submit" className="glass-button glass-button--sm glass-button--success">{t('generic.save')}</button>
                    </div>
                  </div>
                </form>
              </GlassPanel>
            );
          }
          return (
            <div key={r.id} className={`p-2 rounded-md glass-panel glass-panel--subtle space-y-1 ${r.projected ? 'opacity-80 italic' : ''}`}>              <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] px-1 py-0.5 rounded bg-white/50 dark:bg-white/10 border border-white/30 dark:border-white/5">{r.date.slice(5)}</span>
                  {r.projected && <span className="glass-badge badge-future text-[9px]">{t('mov.future')}</span>}
                </div>
                <div className="font-medium truncate mt-0.5">{r.description}</div>
                <div className="text-[10px] opacity-60 truncate">{formatCategory(r.category, t)}</div>
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