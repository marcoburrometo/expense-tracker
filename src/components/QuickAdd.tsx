"use client";
import React, { useState, useEffect } from 'react';
import { useTracker } from '@/state/TrackerContext';
import { mergeCategories } from '@/domain/categories';
import { useI18n } from '@/state/I18nContext';

export const QuickAdd: React.FC = () => {
  const { addOneOff, expenses } = useTracker();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Generale');
  const [direction, setDirection] = useState<'in' | 'out'>('out');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const categories = React.useMemo(() => mergeCategories(expenses.map(e => e.category)), [expenses]);
  const [saving, setSaving] = useState(false);
  const { t } = useI18n();

  function reset() {
    setDescription('');
    setAmount('');
    setCategory('Generale');
    setDirection('out');
    setDate(new Date().toISOString().slice(0, 10));
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!description.trim() || isNaN(num) || num <= 0) return;
    setSaving(true);
    addOneOff({ description, amount: num, date, category, direction });
    reset();
    setTimeout(() => { setSaving(false); setOpen(false); }, 250);
  }
  useEffect(() => {
    function esc(ev: KeyboardEvent) { if (ev.key === 'Escape') setOpen(false); }
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  return (
    <>
      <div className="glass-fab">
        <button type="button" className="glass-button glass-button--primary pressable" aria-label={t('quick.addOpen')} onClick={() => setOpen(true)}>＋</button>
      </div>
      {open && (
        <div className="modal-overlay">
          <dialog open className="modal-panel glass-panel modal-enter p-5 space-y-4 bg-transparent">
            <div className="flex items-start justify-between">
              <h2 className="font-semibold text-lg">{t('quick.addTitle')}</h2>
              <button onClick={() => setOpen(false)} className="glass-button glass-button--neutral glass-button--sm" aria-label={t('generic.close')}>✕</button>
            </div>
            <form onSubmit={submit} className="space-y-3 text-sm">
              <input className="glass-input w-full" placeholder={t('form.description')} value={description} onChange={e => setDescription(e.target.value)} autoFocus />
              <div className="flex gap-2">
                <input type="number" step="0.01" className="glass-input w-full" placeholder={t('form.amount')} value={amount} onChange={e => setAmount(e.target.value)} />
                <select className="glass-input w-full" value={direction} onChange={e => setDirection(e.target.value as 'in' | 'out')}>
                  <option value="out">{t('form.direction.out')}</option>
                  <option value="in">{t('form.direction.in')}</option>
                </select>
              </div>
              <div className="flex gap-2">
                <select className="glass-input w-full" value={category} onChange={e => setCategory(e.target.value)}>
                  {!categories.includes(category) && <option value={category}>{category}</option>}
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input type="date" className="glass-input w-full" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setOpen(false)} className="glass-button">{t('quick.cancel')}</button>
                <button type="submit" disabled={saving} className="glass-button glass-button--success">{saving ? t('quick.saving') : t('quick.save')}</button>
              </div>
            </form>
          </dialog>
        </div>
      )}
    </>
  );
};
