"use client";
import React, { useState } from 'react';
import { useTracker } from '@/state/TrackerContext';

export const ExpenseForm: React.FC = () => {
  const { addOneOff, addRecurringTemplate } = useTracker();
  const [mode, setMode] = useState<'oneoff' | 'recurring'>('oneoff');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('Generale');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [direction, setDirection] = useState<'in'|'out'>('out');

  function reset() {
    setDescription('');
    setAmount('');
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!description || isNaN(amt)) return;
    if (mode === 'oneoff') {
      addOneOff({ description, amount: amt, date, category, direction });
    } else {
      addRecurringTemplate({ description, amount: amt, frequency, startDate: date, category, direction });
    }
    reset();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2 p-4 border rounded-md bg-white/70 dark:bg-neutral-800/60 max-w-md w-full">
      <h2 className="font-semibold text-lg">Nuova Spesa</h2>
      <div className="flex gap-4 text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" value="oneoff" checked={mode==='oneoff'} onChange={() => setMode('oneoff')} /> Una Tantum
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" value="recurring" checked={mode==='recurring'} onChange={() => setMode('recurring')} /> Ricorrente
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <input placeholder="Descrizione" value={description} onChange={e=>setDescription(e.target.value)} className="w-full px-2 py-1 border rounded" required />
        </div>
        <div>
          <input type="number" step="0.01" placeholder="Importo" value={amount} onChange={e=>setAmount(e.target.value)} className="w-full px-2 py-1 border rounded" required />
        </div>
        <div>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full px-2 py-1 border rounded" required />
        </div>
        <div>
          <input placeholder="Categoria" value={category} onChange={e=>setCategory(e.target.value)} className="w-full px-2 py-1 border rounded" />
        </div>
        <div>
          <select value={direction} onChange={e=>setDirection(e.target.value as 'in'|'out')} className="w-full px-2 py-1 border rounded">
            <option value="out">Uscita</option>
            <option value="in">Entrata</option>
          </select>
        </div>
        {mode==='recurring' && (
          <div>
            <select value={frequency} onChange={e=>setFrequency(e.target.value as 'weekly' | 'monthly' | 'yearly')} className="w-full px-2 py-1 border rounded">
              <option value="weekly">Settimanale</option>
              <option value="monthly">Mensile</option>
              <option value="yearly">Annuale</option>
            </select>
          </div>
        )}
      </div>
      <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white text-sm hover:bg-blue-500">Aggiungi</button>
    </form>
  );
};
