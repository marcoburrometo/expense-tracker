"use client";
import React, { useMemo, useState } from 'react';
import { GlassPanel } from './GlassPanel';
import { Confirm } from '@/components/Confirm';
import { useMonthlyTotals, useTracker } from '@/state/TrackerContext';
import { mergeCategories } from '@/domain/categories';
import { Budget } from '@/domain/types';
import { useI18n } from '@/state/I18nContext';
import { formatCategory } from '@/lib/formatCategory';
import { useCurrencyFormatter } from '@/lib/format';

export const BudgetSummary: React.FC = () => {
  const { budgets, deleteBudget, updateBudget, expenses } = useTracker();
  const categories = useMemo(() => mergeCategories(expenses.map(e => e.category)), [expenses]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<{ category: string; limit: string }>({ category: '', limit: '' });
  const { t } = useI18n();
  const format = useCurrencyFormatter();
  function startEdit(b: Budget) {
    setEditingId(b.id);
    setForm({ category: b.category, limit: String(b.limit) });
  }
  function submit(id: string) {
    const lim = parseFloat(form.limit);
    if (isNaN(lim)) return;
    updateBudget(id, { category: form.category, limit: lim });
    setEditingId(null);
  }
  const totals = useMonthlyTotals();
  if (!budgets.length) return <GlassPanel variant="pure" className="p-4 text-sm fade-in">
    <div className="flex flex-col gap-3 max-w-[220px]">
      <div className="skeleton h-3 w-20" />
      <div className="skeleton h-3 w-28" />
      <div className="skeleton h-2 w-full" />
      <div className="text-[11px] opacity-60">{t('budget.none')}</div>
    </div>
  </GlassPanel>;
  const deleteTarget = confirmDeleteId ? budgets.find(b => b.id === confirmDeleteId) : null;
  const confirmDetails = deleteTarget ? (
    <>
  <div><span className="opacity-70">Categoria:</span> {formatCategory(deleteTarget.category, t)}</div>
      <div><span className="opacity-70">Limite:</span> {format(deleteTarget.limit)}</div>
      <div><span className="opacity-70">Speso mese:</span> {format(totals[deleteTarget.category] || 0)}</div>
    </>
  ) : null;
  return (
    <>
      <GlassPanel variant="pure" className="p-5 w-full max-w-md space-y-2 fade-in">
        <h2 className="font-semibold text-lg mb-2">{t('budget.titleCurrentMonth')}</h2>
        <ul className="space-y-2 text-sm">
          {budgets.map(b => {
            const spent = totals[b.category] || 0;
            const pct = b.limit ? Math.min(100, (spent / b.limit) * 100) : 0;
            const remaining = b.limit - spent;
            return (
              <GlassPanel as="li" key={b.id} variant="subtle" className="p-3 space-y-1 fade-in" style={{ animationDelay: '.05s' }}>
                {editingId !== b.id && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{formatCategory(b.category, t)}</span>
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(b)} className="glass-button glass-button--primary text-[10px] pressable">{t('budget.edit')}</button>
                        <button onClick={() => setConfirmDeleteId(b.id)} className="glass-button glass-button--danger text-[10px] pressable">{t('budget.delete')}</button>
                      </div>
                    </div>
                    <div className="text-xs text-muted">{format(spent)} / {format(b.limit)} {remaining >= 0 ? `(${t('budget.remaining')} ${format(remaining)})` : `(${t('budget.over')} ${format(Math.abs(remaining))})`}</div>
                    <div className="h-2 rounded overflow-hidden mt-1 relative bg-neutral-200/70 dark:bg-neutral-700/40">
                      <div
                        className="h-full transition-all duration-500 ease-out"
                        style={{
                          width: pct + '%',
                          background: remaining < 0
                            ? 'linear-gradient(90deg, #ef4444, #dc2626 55%, #991b1b)'
                            : `linear-gradient(90deg, #10b981, #059669 ${Math.min(70, pct)}%, #047857)`
                        }}
                      />
                      {pct > 0 && pct < 100 && (
                        <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay" style={{ background: 'radial-gradient(at 15% 35%, rgba(255,255,255,.65), rgba(255,255,255,0) 55%)' }} />
                      )}
                    </div>
                  </>
                )}
                {editingId === b.id && (
                  <form onSubmit={e => { e.preventDefault(); submit(b.id); }} className="flex flex-col gap-2 text-xs fade-in" style={{ animationDelay: '.1s' }}>
                    <select className="glass-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                      {categories.map(c => <option key={c} value={c}>{formatCategory(c, t)}</option>)}
                    </select>
                    <input className="glass-input" type="number" step="0.01" value={form.limit} onChange={e => setForm(f => ({ ...f, limit: e.target.value }))} />
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => setEditingId(null)} className="glass-button pressable">{t('generic.cancel')}</button>
                      <button type="submit" className="glass-button glass-button--success pressable">{t('generic.save')}</button>
                    </div>
                  </form>
                )}
              </GlassPanel>
            );
          })}
        </ul>
      </GlassPanel>
      <Confirm
        open={!!deleteTarget}
        title={t('budget.delete.title')}
        description={deleteTarget ? <>{t('budget.delete.confirm')}</> : null}
        details={confirmDetails}
        confirmLabel={t('mov.delete.confirmLabel')}
        variant="danger"
        onCancel={() => setConfirmDeleteId(null)}
        onConfirm={() => { if (deleteTarget) { deleteBudget(deleteTarget.id); } setConfirmDeleteId(null); }}
      />
    </>
  );
};
