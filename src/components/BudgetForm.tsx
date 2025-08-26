"use client";
import React, { useState } from 'react';
import { useTracker } from '@/state/TrackerContext';

export const BudgetForm: React.FC = () => {
  const { addBudget } = useTracker();
  const [category, setCategory] = useState('Generale');
  const [limit, setLimit] = useState('');

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(limit);
    if (!category || isNaN(num)) return;
    addBudget({ category, limit: num });
    setLimit('');
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 p-4 border rounded-md bg-white/70 dark:bg-neutral-800/60 max-w-md w-full">
      <h2 className="font-semibold text-lg">Nuovo Budget</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-1">
          <input placeholder="Categoria" value={category} onChange={e=>setCategory(e.target.value)} className="w-full px-2 py-1 border rounded" />
        </div>
        <div className="col-span-1">
          <input type="number" step="0.01" placeholder="Limite Mensile" value={limit} onChange={e=>setLimit(e.target.value)} className="w-full px-2 py-1 border rounded" required />
        </div>
      </div>
      <button type="submit" className="px-3 py-1 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-500">Aggiungi Budget</button>
    </form>
  );
};
