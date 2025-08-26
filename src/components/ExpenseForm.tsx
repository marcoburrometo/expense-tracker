"use client";
import React, { useState, useEffect, useMemo } from 'react';
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [justSaved, setJustSaved] = useState(false);

  const errors = useMemo(() => {
    const errs: Record<string,string> = {};
    if (!description.trim()) errs.description = 'Richiesto';
    const num = parseFloat(amount);
    if (!amount.trim()) errs.amount = 'Richiesto'; else if (isNaN(num)) errs.amount = 'Numero non valido'; else if (num <= 0) errs.amount = 'Deve essere > 0';
    if (!date) errs.date = 'Data richiesta';
    return errs;
  }, [description, amount, date]);

  function markTouched(name: string){ setTouched(t => ({ ...t, [name]: true })); }

  function reset() {
    setDescription('');
    setAmount('');
    setTouched({});
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(errors).length) { setTouched({ description:true, amount:true, date:true }); return; }
    const amt = parseFloat(amount);
    if (mode === 'oneoff') {
      addOneOff({ description, amount: amt, date, category, direction });
    } else {
      addRecurringTemplate({ description, amount: amt, frequency, startDate: date, category, direction });
    }
    reset();
    setJustSaved(true);
  }

  useEffect(()=> {
    if (justSaved) {
      const id = setTimeout(()=> setJustSaved(false), 1600);
      return () => clearTimeout(id);
    }
  }, [justSaved]);

  function fieldClass(field: 'description'|'amount'|'date') {
    const base = 'w-full glass-input';
    if (touched[field] && errors[field]) return base + ' glass-input--error';
    if (justSaved) return base + ' glass-input--success';
    return base;
  }
  const descClass = fieldClass('description');
  const amtClass = fieldClass('amount');
  const dateClass = fieldClass('date');

  return (
    <form onSubmit={onSubmit} className="space-y-3 glass-panel p-5 max-w-md w-full">
      <h2 className="font-semibold text-lg tracking-tight">Nuova Spesa</h2>
      <div className="flex gap-4 text-xs md:text-sm">
        <label className="flex items-center gap-1">
          <input type="radio" value="oneoff" checked={mode==='oneoff'} onChange={() => setMode('oneoff')} /> Una Tantum
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" value="recurring" checked={mode==='recurring'} onChange={() => setMode('recurring')} /> Ricorrente
        </label>
      </div>
  <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="col-span-2">
          <input placeholder="Descrizione" value={description} onChange={e=>setDescription(e.target.value)} onBlur={()=>markTouched('description')} className={descClass} aria-invalid={!!errors.description && touched.description} />
          {touched.description && errors.description && <p className="text-[10px] text-red-600 mt-0.5">{errors.description}</p>}
        </div>
        <div>
          <input type="number" step="0.01" placeholder="Importo" value={amount} onChange={e=>setAmount(e.target.value)} onBlur={()=>markTouched('amount')} className={amtClass} aria-invalid={!!errors.amount && touched.amount} />
          {touched.amount && errors.amount && <p className="text-[10px] text-red-600 mt-0.5">{errors.amount}</p>}
        </div>
        <div>
          <input type="date" value={date} onChange={e=>setDate(e.target.value)} onBlur={()=>markTouched('date')} className={dateClass} aria-invalid={!!errors.date && touched.date} />
          {touched.date && errors.date && <p className="text-[10px] text-red-600 mt-0.5">{errors.date}</p>}
        </div>
        <div>
          <input placeholder="Categoria" value={category} onChange={e=>setCategory(e.target.value)} className="w-full glass-input" />
        </div>
        <div>
          <select value={direction} onChange={e=>setDirection(e.target.value as 'in'|'out')} className="w-full glass-input">
            <option value="out">Uscita</option>
            <option value="in">Entrata</option>
          </select>
        </div>
        {mode==='recurring' && (
          <div>
            <select value={frequency} onChange={e=>setFrequency(e.target.value as 'weekly' | 'monthly' | 'yearly')} className="w-full glass-input">
              <option value="weekly">Settimanale</option>
              <option value="monthly">Mensile</option>
              <option value="yearly">Annuale</option>
            </select>
          </div>
        )}
      </div>
  <button type="submit" className="glass-button">Aggiungi</button>
    </form>
  );
};
