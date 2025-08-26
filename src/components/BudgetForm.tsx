"use client";
import React, { useMemo, useState } from 'react';
import { useTracker } from '@/state/TrackerContext';
import { mergeCategories } from '@/domain/categories';

export const BudgetForm: React.FC = () => {
  const { addBudget, expenses } = useTracker();
  const [category, setCategory] = useState('Generale');
  const categories = useMemo(()=> mergeCategories(expenses.map(e=>e.category)), [expenses]);
  const [limit, setLimit] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(limit);
    if (!category || isNaN(num)) return;
    addBudget({ category, limit: num });
    setLimit('');
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 glass-panel p-5 max-w-md w-full">
      <h2 className="font-semibold text-lg tracking-tight">Nuovo Budget</h2>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="col-span-1">
          <select value={category} onChange={e=>setCategory(e.target.value)} className="w-full glass-input">
            {categories.map(c=> <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-1">
          <input type="number" step="0.01" placeholder="Limite Mensile" value={limit} onChange={e=>setLimit(e.target.value)} className="w-full glass-input" required />
        </div>
      </div>
  <button type="submit" className="glass-button">Aggiungi Budget</button>
    </form>
  );
};
