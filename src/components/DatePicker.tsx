"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '@/state/I18nContext';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  min?: string; // YYYY-MM-DD
  max?: string; // YYYY-MM-DD
  disabled?: boolean;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

// Utility
function parseISO(d: string) { const [y,m,da] = d.split('-').map(Number); return new Date(y, m-1, da); }
function fmt(d: Date) { return d.toISOString().slice(0,10); }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth()+1, 0); }

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, min, max, disabled, className, id, ariaLabel }) => {
  const { t } = useI18n();
  const selected = value ? parseISO(value) : new Date();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => startOfMonth(selected));
  const popRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // Close on outside
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) { if (popRef.current && !popRef.current.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false); }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const canSelect = useCallback((d: Date) => {
    if (min && d < parseISO(min)) return false;
    if (max && d > parseISO(max)) return false;
    return true;
  }, [min, max]);

  function changeMonth(delta: number) { setView(v => new Date(v.getFullYear(), v.getMonth()+delta, 1)); }
  function selectDay(d: Date) { if (!canSelect(d)) return; onChange(fmt(d)); setOpen(false); btnRef.current?.focus(); }

  const monthStart = startOfMonth(view);
  const monthEnd = endOfMonth(view);
  const firstWeekday = monthStart.getDay(); // 0=Sun
  const days: (Date | null)[] = [];
  // fill leading blanks (convert to Monday-first? We'll keep locale aware quickly: show Mon..Sun ordering customizing header)
  // We'll adopt Monday-first grid: transform JS Sunday(0)->7 and compute offset
  const offset = (firstWeekday + 6) % 7; // Monday=0
  for (let i=0;i<offset;i++) days.push(null);
  for (let d=1; d<=monthEnd.getDate(); d++) days.push(new Date(view.getFullYear(), view.getMonth(), d));
  while (days.length % 7 !== 0) days.push(null);

  const weekdayKeys = ['mon','tue','wed','thu','fri','sat','sun'] as const;

  return (
    <div className={`relative inline-block ${className||''}`} id={id} data-date-picker>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        className={`glass-input text-left flex items-center gap-2 pr-2 cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={ariaLabel || t('form.date')}
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-mono tracking-tight text-sm flex-1">{value || '—'}</span>
        <span className="text-[10px] opacity-60">▾</span>
      </button>
      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label={t('form.date')}
          className="absolute z-40 mt-2 min-w-[240px] p-2 rounded-lg glass-panel glass-panel--pure shadow-lg animate-in fade-in"
        >
          <div className="flex items-center justify-between mb-2 text-[11px] font-medium select-none">
            <button type="button" className="glass-button glass-button--xs" onClick={() => changeMonth(-1)} aria-label={t('calendar.prevMonth')}>←</button>
            <span className="px-2">{t(`month.${view.getMonth()}`)} {view.getFullYear()}</span>
            <button type="button" className="glass-button glass-button--xs" onClick={() => changeMonth(1)} aria-label={t('calendar.nextMonth')}>→</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold mb-1 opacity-70">
            {weekdayKeys.map(k => <div key={k} className="text-center uppercase">{t(`weekday.${k}`)}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1 text-[12px]">
            {days.map((d,i) => {
              if (!d) return <div key={i} className="h-7" />;
              const iso = fmt(d);
              const isSel = value === iso;
              const today = new Date();
              const isToday = d.toDateString() === today.toDateString();
              const disabledDay = !canSelect(d);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(d)}
                  disabled={disabledDay}
                  className={`h-7 rounded-md font-medium hover:bg-accent/20 focus:outline-none focus-visible:ring-1 ring-accent transition-colors relative ${isSel ? 'bg-accent/80 text-white hover:bg-accent/80' : (isToday ? 'border border-accent/50' : 'bg-white/10 dark:bg-slate-700/30')} ${disabledDay ? 'opacity-30 cursor-not-allowed' : ''}`}
                  aria-pressed={isSel}
                  aria-label={iso + (isToday ? ' (today)' : '')}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px]">
            <button type="button" className="glass-button glass-button--xs" onClick={() => { const tdy = new Date(); setView(startOfMonth(tdy)); onChange(fmt(tdy)); setOpen(false); btnRef.current?.focus(); }}>{t('date.today')}</button>
            <button type="button" className="glass-button glass-button--xs" onClick={() => setOpen(false)}>{t('generic.close') || '×'}</button>
          </div>
        </div>
      )}
    </div>
  );
};
