"use client";
import React, { useMemo, useState, useCallback } from 'react';
import { useTracker } from '@/state/TrackerContext';
import { AnyExpense, isTemplate, RecurringExpenseTemplate, isRecurringInstance } from '@/domain/types';
import { DayBucket, isSyntheticInstance } from '@/components/calendarTypes';
import { DayCell } from '@/components/calendar/DayCell';
import { DayDetails } from '@/components/calendar/DayDetails';
import { Confirm } from '@/components/Confirm';
import { useI18n } from '@/state/I18nContext';
import { useCurrencyFormatter } from '@/lib/format';
import { ToggleSwitch, CycleToggle } from './forms/ToggleSwitch';

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function fmt(date: Date) { return date.toISOString().slice(0, 10); }

export const CalendarView: React.FC = () => {
  const { expenses, addOneOff } = useTracker();
  const [cursor, setCursor] = useState(() => new Date());
  const [activeDay, setActiveDay] = useState<string | null>(null);
  const [formDesc, setFormDesc] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDir, setFormDir] = useState<'in' | 'out'>('out');
  const [formCat, setFormCat] = useState('Generale');
  const [viewMode, setViewMode] = useState<'list' | 'category'>('list');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [showSynthetic, setShowSynthetic] = useState(true);
  const [density, setDensity] = useState<'normal' | 'compact'>('normal');
  const [heatmap, setHeatmap] = useState<boolean>(false);
  const { t } = useI18n();
  const format = useCurrencyFormatter();
  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);

  const getExpenseDate = (e: AnyExpense) => e.type === 'oneoff' || e.type === 'recurring-instance' ? e.date : e.startDate;

  const grid = useMemo(() => {
    const startWeekDay = (monthStart.getDay() + 6) % 7;
    const daysInMonth = monthEnd.getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startWeekDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(monthStart.getFullYear(), monthStart.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [monthStart, monthEnd]);

  const buckets = useMemo(() => {
    const map = new Map<string, DayBucket>();
    const templates: RecurringExpenseTemplate[] = [];
    const existingTemplateDates = new Set<string>();

    const pushExpense = (e: AnyExpense) => {
      const date = getExpenseDate(e).slice(0, 10);
      const dt = new Date(date);
      if (dt < monthStart || dt > monthEnd) return;
      let bucket = map.get(date);
      if (!bucket) { bucket = { date, in: 0, out: 0, items: [] }; map.set(date, bucket); }
      if (e.direction === 'in') bucket.in += e.amount; else bucket.out += e.amount;
      bucket.items.push(e);
      if (isRecurringInstance(e)) existingTemplateDates.add(`${e.templateId}|${date}`);
    };

    for (const e of expenses) {
      if (isTemplate(e)) templates.push(e); else pushExpense(e);
    }

    const addSynthetic = (tmpl: RecurringExpenseTemplate, occ: Date) => {
      if (occ < monthStart || occ > monthEnd) return;
      if (tmpl.endDate && occ > new Date(tmpl.endDate)) return;
      const key = occ.toISOString().slice(0, 10);
      if (existingTemplateDates.has(`${tmpl.id}|${key}`)) return;
      pushExpense({
        id: `synthetic-${tmpl.id}-${key}`,
        type: 'recurring-instance',
        templateId: tmpl.id,
        description: tmpl.description,
        amount: tmpl.amount,
        category: tmpl.category,
        direction: tmpl.direction,
        date: new Date(occ.getFullYear(), occ.getMonth(), occ.getDate(), 12, 0, 0).toISOString(),
        createdAt: tmpl.createdAt,
        updatedAt: tmpl.updatedAt,
      } as AnyExpense);
    };

    const genWeekly = (tmpl: RecurringExpenseTemplate) => {
      const start = new Date(tmpl.startDate);
      const dayMs = 86400000;
      let cur = new Date(start);
      if (cur < monthStart) {
        const diff = Math.floor((monthStart.getTime() - cur.getTime()) / dayMs);
        const rem = diff % 7;
        cur = new Date(monthStart.getTime() + (rem ? (7 - rem) : 0) * dayMs);
      }
      while (cur <= monthEnd) { addSynthetic(tmpl, cur); cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 7); }
    };
    const genMonthly = (tmpl: RecurringExpenseTemplate) => {
      const start = new Date(tmpl.startDate);
      const day = start.getDate();
      const occDay = Math.min(day, new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate());
      const occ = new Date(monthStart.getFullYear(), monthStart.getMonth(), occDay);
      if (occ >= start) addSynthetic(tmpl, occ);
    };
    const genYearly = (tmpl: RecurringExpenseTemplate) => {
      const start = new Date(tmpl.startDate);
      if (start.getMonth() !== monthStart.getMonth()) return;
      const occDay = Math.min(start.getDate(), new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0).getDate());
      const occ = new Date(monthStart.getFullYear(), monthStart.getMonth(), occDay);
      if (occ >= start) addSynthetic(tmpl, occ);
    };

    for (const tmpl of templates) {
      const start = new Date(tmpl.startDate);
      if (start > monthEnd) continue;
      if (tmpl.endDate && new Date(tmpl.endDate) < monthStart) continue;
      switch (tmpl.frequency) {
        case 'weekly': genWeekly(tmpl); break;
        case 'monthly': genMonthly(tmpl); break;
        case 'yearly': genYearly(tmpl); break;
      }
    }

    for (const b of map.values()) {
      b.items = b.items
        .filter(e => showSynthetic || !isSyntheticInstance(e))
        .sort((a, bx) => {
          const da = getExpenseDate(a).localeCompare(getExpenseDate(bx));
          if (da !== 0) return da;
          return bx.amount - a.amount;
        });
      b.in = b.items.filter(i => i.direction === 'in').reduce((s, i) => s + i.amount, 0);
      b.out = b.items.filter(i => i.direction === 'out').reduce((s, i) => s + i.amount, 0);
    }
    return map;
  }, [expenses, monthStart, monthEnd, showSynthetic]);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const prev = useCallback(() => { setCursor(d => new Date(d.getFullYear(), d.getMonth() - 1, 1)); }, []);
  const next = useCallback(() => { setCursor(d => new Date(d.getFullYear(), d.getMonth() + 1, 1)); }, []);
  const today = useCallback(() => { setCursor(new Date()); }, []);

  // Decoupled from MovementFilters; calendar date changes now isolated locally

  function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!activeDay) return;
    const amt = parseFloat(formAmount);
    if (!formDesc.trim() || isNaN(amt) || amt <= 0) return;
    addOneOff({ description: formDesc.trim(), amount: amt, date: activeDay, category: formCat, direction: formDir });
    setFormDesc(''); setFormAmount(''); setFormCat('Generale'); setFormDir('out');
  }

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 't' && (e.metaKey || e.ctrlKey)) today();
      else if (e.key === 'Escape' && activeDay) setActiveDay(null);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next, today, activeDay]);

  return (
    <div className="glass-panel glass-panel--pure p-4 flex flex-col gap-4 fade-in">
      <div className="flex items-center gap-2 justify-between flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={prev} className="glass-button glass-button--sm pressable" aria-label={t('calendar.prevMonth')}>←</button>
          <button onClick={today} className="glass-button glass-button--sm pressable" aria-label={t('calendar.today')}>{t('calendar.today')}</button>
          <button onClick={next} className="glass-button glass-button--sm pressable" aria-label={t('calendar.nextMonth')}>→</button>
          <select value={cursor.getMonth()} onChange={e => setCursor(new Date(cursor.getFullYear(), parseInt(e.target.value), 1))} className="glass-input glass-input--sm text-[11px]" aria-label={t('calendar.month')}>
            {Array.from({ length: 12 }).map((_, m) => { const label = new Date(2000, m, 1).toLocaleString(undefined, { month: 'short' }); return <option key={label} value={m}>{label}</option>; })}
          </select>
          <select value={cursor.getFullYear()} onChange={e => setCursor(new Date(parseInt(e.target.value), cursor.getMonth(), 1))} className="glass-input glass-input--sm text-[11px]" aria-label={t('calendar.year')}>
            {Array.from({ length: 5 }).map((_, i) => { const y = new Date().getFullYear() - 2 + i; return <option key={y} value={y}>{y}</option>; })}
          </select>
        </div>
        <h2 className="font-semibold text-lg heading-gradient capitalize flex items-center gap-2">
          {monthLabel}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 dark:bg-indigo-500/25 border border-indigo-500/50 text-indigo-700 dark:text-indigo-200 shadow-sm">{t('nav.calendar')}</span>
        </h2>
        <div className="text-xs text-muted flex gap-3 items-center">
          <span>{t('calendar.incomeTotal')}: <span className="text-success">{format(Array.from(buckets.values()).reduce((s, b) => s + b.in, 0))}</span></span>
          <span>{t('calendar.expenseTotal')}: <span className="text-danger">{format(-Array.from(buckets.values()).reduce((s, b) => s + b.out, 0)).replace('-', '')}</span></span>
          <CycleToggle
            value={density}
            onChange={v => setDensity(v as 'normal' | 'compact')}
            options={[
              { value: 'normal', label: t('calendar.density.normal'), title: t('calendar.density') },
              { value: 'compact', label: t('calendar.density.compact'), title: t('calendar.density') },
            ]}
            ariaLabel={t('calendar.density')}
            size="xs"
          />
          <ToggleSwitch
            checked={heatmap}
            onChange={setHeatmap}
            ariaLabel={heatmap ? t('calendar.heatmap.disable') : t('calendar.heatmap.enable')}
            label={<span className="flex items-center gap-1">{t('calendar.heatmap')} <span className="text-[10px] opacity-70">{heatmap ? t('generic.on') : t('generic.off')}</span></span>}
            size="sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-4 text-[10px] -mt-2">
        <ToggleSwitch
          checked={showSynthetic}
          onChange={setShowSynthetic}
          ariaLabel={t('calendar.showRecurring')}
          label={<span>{t('calendar.showRecurring')} <span className="inline-block px-1 rounded bg-indigo-500/70 text-inverse">S</span></span>}
          size="sm"
        />
        <div className="flex items-center gap-2 opacity-70">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500/60 inline-block" /> {t('calendar.incomes')}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/60 inline-block" /> {t('calendar.expenses')}</span>
        </div>
      </div>
      <div className="cal-weekdays-sticky text-[11px] font-medium uppercase tracking-wide text-muted grid" style={{ gridTemplateColumns: 'repeat(7,minmax(0,1fr))' }} role="row">
        {[t('calendar.weekdays.mon'), t('calendar.weekdays.tue'), t('calendar.weekdays.wed'), t('calendar.weekdays.thu'), t('calendar.weekdays.fri'), t('calendar.weekdays.sat'), t('calendar.weekdays.sun')].map(d => <div key={d} className="text-center" role="columnheader">{d}</div>)}
      </div>
      <div className={`cal-grid ${density === 'compact' ? 'cal-density-compact' : ''}`} role="grid" aria-label="Calendario mensile" aria-readonly="true">
        {grid.map((d, i) => <DayCell key={d ? fmt(d) : `pad-${i}`} date={d} bucket={d ? buckets.get(fmt(d)) : undefined} onOpenDay={(day) => { setActiveDay(day); setViewMode('list'); }} fmt={fmt} density={density} heatmap={heatmap} />)}
      </div>
      <Confirm
        open={!!activeDay}
        title={activeDay ? new Date(activeDay).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
        description={activeDay ? t('calendar.dailySummary') : null}
        details={activeDay ? <>
          <DayDetails activeDay={activeDay} buckets={buckets} sortBy={sortBy} viewMode={viewMode} setSortBy={setSortBy} setViewMode={setViewMode} getExpenseDate={getExpenseDate} />
          <form onSubmit={submitAdd} className="mt-3 flex flex-col gap-2 text-[11px] p-2 rounded-md glass-panel glass-panel--subtle">
            <div className="flex flex-wrap items-center gap-2">
              <input className="glass-input glass-input--sm flex-1 min-w-[140px]" placeholder={t('form.description')} value={formDesc} onChange={e => setFormDesc(e.target.value)} />
              <input type="text" inputMode="decimal" className="glass-input glass-input--sm w-24" placeholder={t('form.amount')} value={formAmount} onChange={e => setFormAmount(e.target.value)} />
              <select className="glass-input glass-input--sm w-24" value={formDir} onChange={e => setFormDir(e.target.value as 'in' | 'out')}><option value="out">{t('form.direction.out')}</option><option value="in">{t('form.direction.in')}</option></select>
              <input className="glass-input glass-input--sm w-28" value={formCat} onChange={e => setFormCat(e.target.value)} placeholder={t('form.category')} />
              <button type="submit" className="glass-button glass-button--primary glass-button--sm">{t('form.add')}</button>
            </div>
            <p className="text-[10px] opacity-60">{t('calendar.add.hint')}</p>
          </form>
        </> : null}
        confirmLabel={t('calendar.close')}
        cancelLabel=""
        variant="neutral"
        onCancel={() => setActiveDay(null)}
        onConfirm={() => setActiveDay(null)}
      />
      {!(cursor.getFullYear() === new Date().getFullYear() && cursor.getMonth() === new Date().getMonth()) && (
        <div className="sticky bottom-0 mt-2 flex justify-center z-10">
          <button type="button" onClick={today} className="glass-button glass-button--sm glass-button--primary px-4 rounded-full shadow-md backdrop-blur-xl" aria-label={t('calendar.backToToday')}>{t('calendar.backToToday')}</button>
        </div>
      )}
    </div>
  );
};

export default CalendarView;