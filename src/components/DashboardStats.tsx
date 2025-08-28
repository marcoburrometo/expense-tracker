"use client";
import React from 'react';
import { useTracker } from '@/state/TrackerContext';
import { StatCard } from './StatCard';
import { IconArrowUp, IconArrowDown, IconBalance, IconGrid, IconLoop } from './icons';
import { useI18n } from '@/state/I18nContext';

export const DashboardStats: React.FC = () => {
  const { expenses } = useTracker();
  const { t } = useI18n();

  // Current month boundaries
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // Only expenses with a concrete date (exclude recurring templates)
  const datedExpenses = expenses.filter(e => e.type === 'oneoff' || e.type === 'recurring-instance');
  const monthExpenses = datedExpenses.filter(e => {
    const d = new Date(e.date);
    return d >= monthStart && d <= monthEnd;
  });

  const totalIn = monthExpenses.filter(e => e.direction === 'in').reduce((s, e) => s + e.amount, 0);
  const totalOut = monthExpenses.filter(e => e.direction === 'out').reduce((s, e) => s + e.amount, 0);
  // NOTE: month net kept implicit via totalIn/totalOut; balance card shows cumulative.

  // Running balance (all historical movements up to today, ignoring future-dated entries)
  const today = new Date();
  const runningDated = datedExpenses.filter(e => new Date(e.date) <= today);
  const runningIn = runningDated.filter(e => e.direction === 'in').reduce((s, e) => s + e.amount, 0);
  const runningOut = runningDated.filter(e => e.direction === 'out').reduce((s, e) => s + e.amount, 0);
  const runningBalance = runningIn - runningOut;

  // Active recurring templates for this month (startDate <= end of month and (no endDate or endDate >= start of month))
  const recurringCount = expenses.filter(e => {
    if (e.type !== 'recurring-template') return false;
    const starts = new Date(e.startDate);
    if (starts > monthEnd) return false;
    if (e.endDate) {
      const ends = new Date(e.endDate);
      if (ends < monthStart) return false;
    }
    return true;
  }).length;

  const incomeCount = monthExpenses.filter(e => e.direction === 'in').length;
  const expenseCount = monthExpenses.filter(e => e.direction === 'out').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide opacity-70">{t('stats.scope.currentMonth')}</span>
      </div>
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 auto-rows-fr">
        <StatCard size="compact" label={t('stats.incomeTotal')} value={`€ ${totalIn.toFixed(2)}`} accent="green" icon={<IconArrowUp className="scale-90" />} hint={`${incomeCount} ${t('stats.income.count')}`} />
        <StatCard size="compact" label={t('stats.expenseTotal')} value={`€ ${totalOut.toFixed(2)}`} accent="red" icon={<IconArrowDown className="scale-90" />} hint={`${expenseCount} ${t('stats.expense.count')}`} />
        {/* Balance card shows ALL-TIME running balance up to today */}
        <StatCard size="compact" label={t('stats.balance')} value={`€ ${runningBalance.toFixed(2)}`} accent={runningBalance >= 0 ? 'green' : 'red'} hint={t('stats.balance.hint')} icon={<IconBalance className="scale-90" />} />
        <StatCard size="compact" label={t('stats.categories')} value={String(new Set(monthExpenses.map(e => e.category)).size)} accent="indigo" hint={t('stats.categories.hint')} icon={<IconGrid className="scale-90" />} />
        <StatCard size="compact" label={t('stats.recurring')} value={String(recurringCount)} accent="blue" hint={t('stats.recurring.hint')} icon={<IconLoop className="scale-90" />} />
      </div>
    </div>
  );
};
