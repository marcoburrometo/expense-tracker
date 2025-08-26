"use client";

import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import {
  AnyExpense,
  Budget,
  INITIAL_STATE,
  TrackerState,
  isTemplate,
  RecurringExpenseTemplate,
  GeneratedRecurringExpenseInstance,
} from '@/domain/types';
import { loadJSON, saveJSON } from '@/lib/localStorage';

// Actions
type UpdateExpenseData = Partial<{
  description: string;
  amount: number;
  category: string;
  direction: 'in' | 'out';
  date: string;
  frequency: 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
}>;

type Action =
  | { type: 'ADD_ONEOFF'; payload: { description: string; amount: number; date: string; category: string; direction: 'in' | 'out' } }
  | { type: 'ADD_RECURRING_TEMPLATE'; payload: { description: string; amount: number; frequency: 'weekly' | 'monthly' | 'yearly'; startDate: string; endDate?: string; category: string; direction: 'in' | 'out' } }
  | { type: 'ADD_BUDGET'; payload: { category: string; limit: number } }
  | { type: 'UPDATE_EXPENSE'; payload: { id: string; data: UpdateExpenseData } }
  | { type: 'UPDATE_BUDGET'; payload: { id: string; data: Partial<{ category: string; limit: number }> } }
  | { type: 'DELETE_EXPENSE'; payload: { id: string } }
  | { type: 'DELETE_BUDGET'; payload: { id: string } }
  | { type: 'GENERATE_CURRENT_PERIOD_INSTANCES'; now: Date };

const STORAGE_KEY = 'tracker-state-v1';

function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nowISO() {
  return new Date().toISOString();
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function clampDay(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Math.min(day, lastDay);
}

function makeInstance(base: RecurringExpenseTemplate, date: Date): GeneratedRecurringExpenseInstance {
  return {
    id: uuid(),
    type: 'recurring-instance',
    templateId: base.id,
    description: base.description,
    amount: base.amount,
    category: base.category,
    direction: base.direction,
    date: date.toISOString(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
}

function weeklyOccurrences(tmpl: RecurringExpenseTemplate, monthStart: Date, monthEnd: Date): Date[] {
  const out: Date[] = [];
  let cursor = new Date(tmpl.startDate);
  // advance to first week within or after monthStart
  while (cursor < monthStart) cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
  while (cursor <= monthEnd) {
    out.push(new Date(cursor));
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
  }
  return out;
}

function monthlyOccurrence(tmpl: RecurringExpenseTemplate, now: Date): Date {
  const start = new Date(tmpl.startDate);
  const day = start.getDate();
  const occurrenceDay = clampDay(now.getFullYear(), now.getMonth(), day);
  return new Date(now.getFullYear(), now.getMonth(), occurrenceDay);
}

function yearlyOccurrence(tmpl: RecurringExpenseTemplate, now: Date): Date | null {
  const start = new Date(tmpl.startDate);
  if (now.getMonth() !== start.getMonth()) return null;
  const day = start.getDate();
  const occurrenceDay = clampDay(now.getFullYear(), now.getMonth(), day);
  return new Date(now.getFullYear(), now.getMonth(), occurrenceDay);
}

// Split action handlers to reduce cognitive complexity
type HandlerMap = { [K in Action['type']]?: (s: TrackerState, a: Extract<Action, { type: K }>) => TrackerState };
const handlers: HandlerMap = {
  ADD_ONEOFF: (state, action) => {
    if (action.type !== 'ADD_ONEOFF') return state;
    const { amount, category, date, description, direction } = action.payload;
    const expense: AnyExpense = {
      id: uuid(),
      type: 'oneoff',
      description,
      amount,
      category,
      direction,
      date,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    return { ...state, expenses: [expense, ...state.expenses] };
  },
  ADD_RECURRING_TEMPLATE: (state, action) => {
    if (action.type !== 'ADD_RECURRING_TEMPLATE') return state;
    const { amount, category, description, frequency, startDate, endDate, direction } = action.payload;
    const tmpl: RecurringExpenseTemplate = {
      id: uuid(),
      type: 'recurring-template',
      description,
      amount,
      category,
      direction,
      frequency,
      startDate,
      endDate,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    return { ...state, expenses: [tmpl, ...state.expenses] };
  },
  ADD_BUDGET: (state, action) => {
    if (action.type !== 'ADD_BUDGET') return state;
    const { category, limit } = action.payload;
    const budget: Budget = {
      id: uuid(),
      category,
      limit,
      period: 'monthly',
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    return { ...state, budgets: [budget, ...state.budgets] };
  },
  UPDATE_EXPENSE: (state, action) => {
    if (action.type !== 'UPDATE_EXPENSE') return state;
    const { id, data } = action.payload;
    return {
      ...state,
      expenses: state.expenses.map(e => {
        if (e.id !== id) return e;
        // Only allow editing certain fields per type
        switch (e.type) {
          case 'oneoff':
          case 'recurring-instance': {
            const { description, amount, category, direction, date } = data;
            return {
              ...e,
              description: description ?? e.description,
              amount: amount ?? e.amount,
              category: category ?? e.category,
              direction: direction ?? e.direction,
              date: date ?? e.date,
              updatedAt: nowISO(),
            };
          }
          case 'recurring-template': {
            const { description, amount, category, direction, frequency, startDate, endDate } = data;
            return {
              ...e,
              description: description ?? e.description,
              amount: amount ?? e.amount,
              category: category ?? e.category,
              direction: direction ?? e.direction,
              frequency: frequency ?? e.frequency,
              startDate: startDate ?? e.startDate,
              endDate: endDate ?? e.endDate,
              updatedAt: nowISO(),
            };
          }
        }
      }),
    };
  },
  UPDATE_BUDGET: (state, action) => {
    if (action.type !== 'UPDATE_BUDGET') return state;
    const { id, data } = action.payload;
    return {
      ...state,
      budgets: state.budgets.map(b => b.id === id ? { ...b, ...data, updatedAt: nowISO() } : b),
    };
  },
  DELETE_EXPENSE: (state, action) => {
    if (action.type !== 'DELETE_EXPENSE') return state;
    return { ...state, expenses: state.expenses.filter(e => e.id !== action.payload.id) };
  },
  DELETE_BUDGET: (state, action) => {
    if (action.type !== 'DELETE_BUDGET') return state;
    return { ...state, budgets: state.budgets.filter(b => b.id !== action.payload.id) };
  },
  GENERATE_CURRENT_PERIOD_INSTANCES: (state, action) => {
    if (action.type !== 'GENERATE_CURRENT_PERIOD_INSTANCES') return state;
    if (!state.settings.autoGenerateRecurring) return state;
    const generated = computeGeneratedInstances(state, action.now);
    if (!generated.length) return state;
    return { ...state, expenses: [...generated, ...state.expenses] };
  },
};

function computeGeneratedInstances(state: TrackerState, now: Date): GeneratedRecurringExpenseInstance[] {
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const existingInstancesForMonth = new Set(
    state.expenses
      .filter((e): e is GeneratedRecurringExpenseInstance => e.type === 'recurring-instance' && sameMonth(new Date(e.date), now))
      .map(e => `${e.templateId}|${e.date.slice(0,10)}`)
  );
  const generated: GeneratedRecurringExpenseInstance[] = [];
  const addIfNew = (tmpl: RecurringExpenseTemplate, date: Date) => {
    if (tmpl.endDate && date > new Date(tmpl.endDate)) return;
    const key = `${tmpl.id}|${date.toISOString().slice(0,10)}`;
    if (existingInstancesForMonth.has(key)) return;
    generated.push(makeInstance(tmpl, date));
    existingInstancesForMonth.add(key);
  };
  for (const tmpl of state.expenses.filter(isTemplate)) {
    const tmplStart = new Date(tmpl.startDate);
    if (tmplStart > monthEnd) continue;
    if (tmpl.endDate && new Date(tmpl.endDate) < monthStart) continue;
    switch (tmpl.frequency) {
      case 'weekly': {
        const occs = weeklyOccurrences(tmpl, monthStart, monthEnd);
        for (const d of occs) addIfNew(tmpl, d);
        break;
      }
      case 'monthly': {
        const d = monthlyOccurrence(tmpl, now);
        addIfNew(tmpl, d);
        break;
      }
      case 'yearly': {
        const d = yearlyOccurrence(tmpl, now);
        if (d) addIfNew(tmpl, d);
        break;
      }
    }
  }
  return generated;
}

function reducer(state: TrackerState, action: Action): TrackerState {
  const handler = handlers[action.type];
  if (handler) {
    // TypeScript can't infer the Extract mapping here cleanly; cast with constrained generic
    return (handler as (s: TrackerState, a: Action) => TrackerState)(state, action);
  }
  return state;
}

interface TrackerContextValue extends TrackerState {
  dispatch: React.Dispatch<Action>;
  addOneOff: (data: { description: string; amount: number; date: string; category: string; direction: 'in' | 'out' }) => void;
  addRecurringTemplate: (data: { description: string; amount: number; frequency: 'weekly' | 'monthly' | 'yearly'; startDate: string; endDate?: string; category: string; direction: 'in' | 'out' }) => void;
  addBudget: (data: { category: string; limit: number }) => void;
  updateExpense: (id: string, data: UpdateExpenseData) => void;
  updateBudget: (id: string, data: { category?: string; limit?: number }) => void;
  deleteExpense: (id: string) => void;
  deleteBudget: (id: string) => void;
}

const TrackerContext = createContext<TrackerContextValue | null>(null);

function migrate(raw: TrackerState): TrackerState {
  if (!raw.version || raw.version < 2) {
    raw.expenses = raw.expenses.map(e => {
      const withDirection = (e as AnyExpense & { direction?: 'in' | 'out' });
      if (withDirection.direction) return withDirection as AnyExpense;
      return { ...withDirection, direction: 'out' } as AnyExpense;
    });
    raw.version = 2;
  }
  return raw;
}

export const TrackerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE, () => migrate(loadJSON(STORAGE_KEY, INITIAL_STATE)));

  // persist
  useEffect(() => {
    saveJSON(STORAGE_KEY, state);
  }, [state]);

  // auto-generate instances when mounting / month changes
  useEffect(() => {
    dispatch({ type: 'GENERATE_CURRENT_PERIOD_INSTANCES', now: new Date() });
  }, []);

  const api: TrackerContextValue = useMemo(
    () => ({
      ...state,
      dispatch,
      addOneOff: payload => dispatch({ type: 'ADD_ONEOFF', payload }),
      addRecurringTemplate: payload => dispatch({ type: 'ADD_RECURRING_TEMPLATE', payload }),
      addBudget: payload => dispatch({ type: 'ADD_BUDGET', payload }),
  updateExpense: (id, data) => dispatch({ type: 'UPDATE_EXPENSE', payload: { id, data } }),
  updateBudget: (id, data) => dispatch({ type: 'UPDATE_BUDGET', payload: { id, data } }),
      deleteExpense: id => dispatch({ type: 'DELETE_EXPENSE', payload: { id } }),
      deleteBudget: id => dispatch({ type: 'DELETE_BUDGET', payload: { id } }),
    }),
    [state]
  );

  return <TrackerContext.Provider value={api}>{children}</TrackerContext.Provider>;
};

export function useTracker() {
  const ctx = useContext(TrackerContext);
  if (!ctx) throw new Error('useTracker must be used within TrackerProvider');
  return ctx;
}

// Selectors
export function useMonthlyTotals(targetMonth: Date = new Date()) {
  const { expenses } = useTracker();
  return useMemo(() => {
    const totals: Record<string, number> = {};
    for (const e of expenses) {
      let dateStr: string | undefined;
      if (e.type === 'oneoff') dateStr = e.date;
      else if (e.type === 'recurring-instance') dateStr = e.date;
      else continue; // skip templates
      const date = new Date(dateStr);
      if (date.getMonth() !== targetMonth.getMonth() || date.getFullYear() !== targetMonth.getFullYear()) continue;
      if (e.direction === 'out') {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
      }
    }
    return totals;
  }, [expenses, targetMonth]);
}
