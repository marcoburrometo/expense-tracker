"use client";
import React from 'react';
import { useI18n } from '@/state/I18nContext';
import { useCurrencyFormatter } from '@/lib/format';
import { AnyExpense } from '@/domain/types';
import { DayBucket, isSyntheticInstance } from '@/components/calendarTypes';
import { CycleToggle } from '../forms/ToggleSwitch';

export interface DayDetailsProps {
  activeDay: string;
  buckets: Map<string, DayBucket>;
  sortBy: 'date' | 'amount';
  viewMode: 'list' | 'category';
  setSortBy: React.Dispatch<React.SetStateAction<'date' | 'amount'>>;
  setViewMode: React.Dispatch<React.SetStateAction<'list' | 'category'>>;
  getExpenseDate: (e: AnyExpense) => string;
}

export const DayDetails: React.FC<DayDetailsProps> = ({ activeDay, buckets, sortBy, viewMode, setSortBy, setViewMode, getExpenseDate }) => {
  const { t } = useI18n();
  const format = useCurrencyFormatter({ signDisplay: 'always' });
  const bucket = buckets.get(activeDay);
  if (!bucket) return <div className="text-[11px] opacity-60">{t('calendar.none')}</div>;
  const totalIn = bucket.in;
  const totalOut = bucket.out;
  const net = totalIn - totalOut;
  const items = [...bucket.items];
  if (sortBy === 'amount') items.sort((a, b) => b.amount - a.amount); else items.sort((a, b) => getExpenseDate(a).localeCompare(getExpenseDate(b)));
  const grouped = items.reduce<Record<string, { in: number; out: number; count: number }>>((acc, e) => {
    acc[e.category] ||= { in: 0, out: 0, count: 0 };
    if (e.direction === 'in') acc[e.category].in += e.amount; else acc[e.category].out += e.amount;
    acc[e.category].count++;
    return acc;
  }, {});
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        <span>{t('calendar.incomeTotal')} <strong className="text-success">{format(totalIn)}</strong></span>
        <span>{t('calendar.expenseTotal')} <strong className="text-danger">{format(-totalOut).replace('-', '')}</strong></span>
        <span>{t('stats.balance')} <strong className={net >= 0 ? 'text-success' : 'text-danger'}>{format(net)}</strong></span>
        <div className="ml-auto flex gap-2">
          <CycleToggle
            value={sortBy}
            onChange={v => setSortBy(v as 'date' | 'amount')}
            options={[
              { value: 'date', label: t('mov.col.date'), title: t('mov.sort') },
              { value: 'amount', label: t('mov.col.amount'), title: t('mov.sort') },
            ]}
            ariaLabel={t('mov.sort')}
            size="xs"
          />
          <CycleToggle
            value={viewMode}
            onChange={v => setViewMode(v as 'list' | 'category')}
            options={[
              { value: 'list', label: t('calendar.view.list'), title: t('calendar.viewMode') },
              { value: 'category', label: t('calendar.view.category'), title: t('calendar.viewMode') },
            ]}
            ariaLabel={t('calendar.viewMode')}
            size="xs"
          />
        </div>
      </div>
      {viewMode === 'list' ? (
        <div className="max-h-64 overflow-auto pr-1 glass-scroll">
          {items.map(e => {
            const synthetic = isSyntheticInstance(e);
            return (
              <div key={e.id} className="flex justify-between gap-2 text-[11px] py-0.5 border-b last:border-none border-white/30 dark:border-white/10">
                <span className="flex-1 truncate">
                  {e.description} <span className="opacity-50">[{e.category}]</span>
                  {synthetic && <span className="ml-1 inline-block px-1 rounded bg-indigo-500/70 text-[9px] text-white align-middle" title={t('calendar.synthetic')}>S</span>}
                </span>
                <span className={`font-mono ${e.direction === 'in' ? 'text-success' : 'text-danger'}`}>{format(e.direction === 'in' ? e.amount : -e.amount)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="max-h-64 overflow-auto pr-1 glass-scroll flex flex-col gap-1">
          {Object.entries(grouped).sort((a, b) => (b[1].in + b[1].out) - (a[1].in + a[1].out)).map(([cat, val]) => {
            const netCat = val.in - val.out;
            const mag = val.in + val.out;
            return (
              <div key={cat} className="relative p-2 rounded-md glass-panel glass-panel--subtle">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-medium truncate">{cat} <span className="opacity-50">({val.count})</span></span>
                  <span className={`font-mono ${netCat >= 0 ? 'text-success' : 'text-danger'}`}>{format(netCat)}</span>
                </div>
                <div className="h-1.5 w-full rounded bg-neutral-300/40 dark:bg-neutral-700/40 overflow-hidden flex">
                  <div style={{ width: mag === 0 ? 0 : (val.in / mag) * 100 + '%' }} className="bg-green-500/70" />
                  <div style={{ width: mag === 0 ? 0 : (val.out / mag) * 100 + '%' }} className="bg-red-500/70" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
