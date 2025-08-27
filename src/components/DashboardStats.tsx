"use client";
import React from 'react';
import { useTracker, useMonthlyTotals } from '@/state/TrackerContext';
import { StatCard } from './StatCard';
import { useI18n } from '@/state/I18nContext';

export const DashboardStats: React.FC = () => {
  const { expenses } = useTracker();
  const monthly = useMonthlyTotals();
  const monthTotalOut = Object.values(monthly).reduce((a, b) => a + b, 0);
  const totalIn = expenses.filter(e => e.direction === 'in').reduce((s, e) => s + e.amount, 0);
  const totalOut = expenses.filter(e => e.direction === 'out').reduce((s, e) => s + e.amount, 0);
  const net = totalIn - totalOut;
  const recurringCount = expenses.filter(e => e.type === 'recurring-template').length;
  const { t } = useI18n();
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
  <StatCard label={t('stats.incomeTotal')} value={`€ ${totalIn.toFixed(2)}`} accent="green" hint={t('stats.incomeTotal') + ' · ' + t('stats.total')} />
  <StatCard label={t('stats.expenseTotal')} value={`€ ${totalOut.toFixed(2)}`} accent="red" hint={t('stats.expenseTotal') + ' · ' + t('stats.total')} />
      <StatCard label={t('stats.balance')} value={`€ ${net.toFixed(2)}`} accent={net >= 0 ? 'green' : 'red'} hint={t('stats.balance.hint')} />
      <StatCard label={t('stats.categories')} value={new Set(expenses.map(e => e.category)).size} accent="indigo" hint={t('stats.categories.hint')} />
      <StatCard label={t('stats.recurring')} value={recurringCount} accent="blue" hint={t('stats.recurring.hint')} />
      <StatCard label={t('stats.monthSpend')} value={`€ ${monthTotalOut.toFixed(2)}`} accent="indigo" hint={t('stats.monthSpend.hint')} />
    </div>
  );
};
