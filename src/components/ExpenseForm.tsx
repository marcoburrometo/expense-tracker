"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { GlassPanel } from './GlassPanel';
import { useTracker } from '@/state/TrackerContext';
import { mergeCategories } from '@/domain/categories';
import { useI18n } from '@/state/I18nContext';
import { RadioGroup } from './forms/RadioGroup';

export const ExpenseForm: React.FC = () => {
  const { addOneOff, addRecurringTemplate, expenses } = useTracker();
  const [mode, setMode] = useState<'oneoff' | 'recurring'>('oneoff');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState('Generale');
  const categories = useMemo(() => mergeCategories(expenses.map(e => e.category)), [expenses]);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [direction, setDirection] = useState<'in' | 'out'>('out');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [justSaved, setJustSaved] = useState(false);
  const { t } = useI18n();

  const errors = useMemo(() => {
    const errs: Record<string, string> = {};
    if (!description.trim()) errs.description = t('form.required');
    const num = parseFloat(amount);
    if (!amount.trim()) errs.amount = t('form.required'); else if (isNaN(num)) errs.amount = t('form.invalidNumber'); else if (num <= 0) errs.amount = t('form.mustBeGtZero');
    if (!date) errs.date = t('form.dateRequired');
    return errs;
  }, [description, amount, date, t]);

  function markTouched(name: string) { setTouched(t => ({ ...t, [name]: true })); }

  function reset() {
    setDescription('');
    setAmount('');
    setTouched({});
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (Object.keys(errors).length) { setTouched({ description: true, amount: true, date: true }); return; }
    const amt = parseFloat(amount);
    if (mode === 'oneoff') {
      addOneOff({ description, amount: amt, date, category, direction });
    } else {
      addRecurringTemplate({ description, amount: amt, frequency, startDate: date, category, direction });
    }
    reset();
    setJustSaved(true);
  }

  useEffect(() => {
    if (justSaved) {
      const id = setTimeout(() => setJustSaved(false), 1600);
      return () => clearTimeout(id);
    }
  }, [justSaved]);

  function fieldClass(field: 'description' | 'amount' | 'date') {
    const base = 'w-full glass-input';
    if (touched[field] && errors[field]) return base + ' glass-input--error';
    if (justSaved) return base + ' glass-input--success';
    return base;
  }
  const descClass = fieldClass('description');
  const amtClass = fieldClass('amount');
  const dateClass = fieldClass('date');

  return (
    <GlassPanel as="form" onSubmit={onSubmit} variant="pure" className="space-y-3 p-4 md:p-5 max-w-md w-full">
      <h2 className="font-semibold text-base md:text-lg tracking-tight">{t('form.expense.new')}</h2>
      <RadioGroup
        name="expense-mode"
        value={mode}
        onChange={v => setMode(v as 'oneoff' | 'recurring')}
        options={[
          { value: 'oneoff', label: t('form.expense.oneoff') },
          { value: 'recurring', label: t('form.expense.recurring') },
        ]}
        ariaLabel={t('form.expense.new')}
        className="mt-1"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div className="col-span-2">
          <input placeholder={t('form.description')} value={description} onChange={e => setDescription(e.target.value)} onBlur={() => markTouched('description')} className={descClass} aria-invalid={!!errors.description && touched.description} />
          {touched.description && errors.description && <p className="text-[10px] text-danger mt-0.5">{errors.description}</p>}
        </div>
        <div>
          <input type="number" step="0.01" placeholder={t('form.amount')} value={amount} onChange={e => setAmount(e.target.value)} onBlur={() => markTouched('amount')} className={amtClass} aria-invalid={!!errors.amount && touched.amount} />
          {touched.amount && errors.amount && <p className="text-[10px] text-danger mt-0.5">{errors.amount}</p>}
        </div>
        <div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} onBlur={() => markTouched('date')} className={dateClass} aria-invalid={!!errors.date && touched.date} />
          {touched.date && errors.date && <p className="text-[10px] text-danger mt-0.5">{errors.date}</p>}
        </div>
        <div>
          <select value={category} onChange={e => setCategory(e.target.value)} className="w-full glass-input">
            {!categories.includes(category) && <option value={category}>{category}</option>}
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <select value={direction} onChange={e => setDirection(e.target.value as 'in' | 'out')} className="w-full glass-input">
            <option value="out">{t('form.direction.out')}</option>
            <option value="in">{t('form.direction.in')}</option>
          </select>
        </div>
        {mode === 'recurring' && (
          <div className="col-span-2">
            <RadioGroup
              name="frequency"
              value={frequency}
              onChange={v => setFrequency(v as 'weekly' | 'monthly' | 'yearly')}
              options={[
                { value: 'weekly', label: t('form.frequency.weekly') },
                { value: 'monthly', label: t('form.frequency.monthly') },
                { value: 'yearly', label: t('form.frequency.yearly') },
              ]}
              ariaLabel={t('form.frequency.monthly')}
              className="mt-1"
            />
          </div>
        )}
      </div>
      <button type="submit" className="glass-button">{t('form.add')}</button>
    </GlassPanel>
  );
};
