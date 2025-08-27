import { useMemo } from 'react';
import { useTracker } from './TrackerContext';
import { AnyExpense, isRecurringInstance, isTemplate } from '@/domain/types';

interface BudgetUsage {
  budgetId: string;
  category: string;
  limit: number;
  spent: number;
  pct: number; // 0-1
  pace: 'onTrack' | 'fast';
  remaining: number;
}

interface CategoryTotal { category: string; amount: number; pct: number }

interface Extremes { maxExpense?: AnyExpense; maxIncome?: AnyExpense }

interface RecurringMix { recurring: number; variable: number; pctRecurring: number }

interface NetDelta { currentNet: number; prevNet?: number; momPct?: number }

export interface DashboardMetrics {
  monthKey: string;
  monthStart: Date;
  monthEnd: Date;
  income: number;
  expenses: number; // absolute positive
  net: number; // income - expenses
  budgetUsage: BudgetUsage[];
  topCategories: CategoryTotal[];
  extremes: Extremes;
  recurringMix: RecurringMix;
  netDelta: NetDelta;
  alerts: string[]; // translation keys
}

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

export function useDashboardMetrics(now: Date = new Date()): DashboardMetrics {
  const { expenses, budgets } = useTracker();

  return useMemo(() => {
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const daysInMonth = monthEnd.getDate();
    const daysElapsed = (Math.min(Date.now(), monthEnd.getTime()) - monthStart.getTime()) / 86400000 + 1; // include today
    const elapsedRatio = Math.min(1, daysElapsed / daysInMonth);

    let income = 0; let out = 0;
    const categorySpend: Record<string, number> = {};
    const byId: Record<string, AnyExpense> = {};

    for (const e of expenses) {
      // skip templates for aggregation except recurring instances
      if (isTemplate(e)) continue;
      const date = new Date(e.type === 'recurring-instance' ? e.date : e.date);
      if (date.getMonth() !== now.getMonth() || date.getFullYear() !== now.getFullYear()) continue;
      byId[e.id] = e;
      if (e.direction === 'in') income += e.amount; else { out += e.amount; categorySpend[e.category] = (categorySpend[e.category] || 0) + e.amount; }
    }

    // Budget usage
    const budgetUsage: BudgetUsage[] = budgets.filter(b => b.period === 'monthly').map(b => {
      const spent = categorySpend[b.category] || 0;
      const pct = b.limit > 0 ? spent / b.limit : 0;
      // pace: spent% vs elapsed%
      const pace: 'onTrack' | 'fast' = pct > elapsedRatio + 0.05 ? 'fast' : 'onTrack';
      return { budgetId: b.id, category: b.category, limit: b.limit, spent, pct, remaining: Math.max(0, b.limit - spent), pace };
    }).sort((a,b) => b.pct - a.pct);

    // Top categories (spend only)
    const totalSpend = Object.values(categorySpend).reduce((a,b)=>a+b,0) || 1;
    const topCategories = Object.entries(categorySpend)
      .map(([category, amount]) => ({ category, amount, pct: amount/totalSpend }))
      .sort((a,b) => b.amount - a.amount)
      .slice(0,5);

    // Extremes (largest expense & income)
    let maxExpense: AnyExpense | undefined; let maxIncome: AnyExpense | undefined;
    for (const id in byId) {
      const e = byId[id];
      if (e.direction === 'out') { if (!maxExpense || e.amount > maxExpense.amount) maxExpense = e; }
      else { if (!maxIncome || e.amount > maxIncome.amount) maxIncome = e; }
    }

    // Recurring vs variable mix (within month)
    let recurring = 0; let variable = 0;
    for (const id in byId) {
      const e = byId[id];
      if (e.direction === 'out') {
        if (isRecurringInstance(e)) recurring += e.amount; else if (e.type === 'oneoff') variable += e.amount;
      }
    }
    const recurringMix: RecurringMix = { recurring, variable, pctRecurring: (recurring + variable) ? recurring / (recurring + variable) : 0 };

    // Net delta vs prev month
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    let prevIncome = 0; let prevOut = 0;
    for (const e of expenses) {
      if (isTemplate(e)) continue;
      const d = new Date(e.type === 'recurring-instance' ? e.date : e.date);
      if (d.getMonth() !== prevMonth.getMonth() || d.getFullYear() !== prevMonth.getFullYear()) continue;
      if (e.direction === 'in') prevIncome += e.amount; else prevOut += e.amount;
    }
    const prevNet = prevIncome - prevOut;
    const net = income - out;
    const momPct = prevNet !== 0 ? (net - prevNet) / Math.abs(prevNet) : undefined;
    const netDelta: NetDelta = { currentNet: net, prevNet, momPct };

    // Alerts
    const alerts: string[] = [];
    for (const bu of budgetUsage) {
      if (bu.pct >= 0.9) alerts.push('alert.budget.nearLimit');
      else if (bu.pct >= 1) alerts.push('alert.budget.over');
      else if (bu.pace === 'fast' && bu.pct > 0.5) alerts.push('alert.budget.fastPace');
    }
    if (budgets.length === 0) alerts.push('alert.noBudgets');
    // uncategorized (categoria vuota?)
    if (categorySpend[''] && categorySpend[''] > 0) alerts.push('alert.uncategorized');

    return {
      monthKey,
      monthStart,
      monthEnd,
      income,
      expenses: out,
      net,
      budgetUsage,
      topCategories,
      extremes: { maxExpense, maxIncome },
      recurringMix,
      netDelta,
      alerts,
    } as DashboardMetrics;
  }, [expenses, budgets, now]);
}
