"use client";
import React, { useMemo, useState } from 'react';
import { GlassPanel } from './GlassPanel';
import { useTracker } from '@/state/TrackerContext';
import { mergeCategories } from '@/domain/categories';
import { useI18n } from '@/state/I18nContext';

export const BudgetForm: React.FC = () => {
  const { addBudget, expenses } = useTracker();
  const [category, setCategory] = useState('Generale');
  const categories = useMemo(() => mergeCategories(expenses.map(e => e.category)), [expenses]);
  const [limit, setLimit] = useState('');
  const { t } = useI18n();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(limit);
    if (!category || isNaN(num)) return;
    addBudget({ category, limit: num });
    setLimit('');
  }

  return (
    <GlassPanel as="form" onSubmit={onSubmit} variant="pure" className="space-y-3 p-5 max-w-md w-full">
      <h2 className="font-semibold text-lg tracking-tight">{t('budget.new')}</h2>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="col-span-1">
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full glass-input">
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-1">
          <input type="number" step="0.01" placeholder={t('budget.limitMonthly')} value={limit} onChange={e => setLimit(e.target.value)} className="w-full glass-input" required />
        </div>
      </div>
      <button type="submit" className="glass-button">{t('budget.add')}</button>
    </GlassPanel>
  );
};
