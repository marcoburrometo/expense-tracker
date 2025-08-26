// Domain model & type definitions for the expense tracker
// Keeping them framework-agnostic so we can reuse with a future Firebase adapter


export interface ExpenseBase {
  id: string;
  description: string;
  amount: number; // stored in main currency units (e.g. EUR)
  category: string;
  direction: 'in' | 'out';
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface OneOffExpense extends ExpenseBase {
  type: 'oneoff';
  date: string; // ISO date of the expense
}

export interface RecurringExpenseTemplate extends ExpenseBase {
  type: 'recurring-template';
  frequency: RecurringFrequency;
  startDate: string; // ISO date (YYYY-MM-DD)
  endDate?: string; // optional ISO date
}

export interface GeneratedRecurringExpenseInstance extends ExpenseBase {
  type: 'recurring-instance';
  templateId: string;
  date: string; // concrete occurrence date
}

export type AnyExpense = OneOffExpense | RecurringExpenseTemplate | GeneratedRecurringExpenseInstance;

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

export interface Budget {
  id: string;
  category: string;
  period: 'monthly'; // for now only monthly supported
  limit: number; // currency units
  createdAt: string;
  updatedAt: string;
}

export interface TrackerState {
  expenses: AnyExpense[]; // includes templates + one-offs + (optionally) materialized instances
  budgets: Budget[];
  // configuration flags to control behavior
  settings: {
    autoGenerateRecurring: boolean; // if true we generate the current period instance for templates
  };
  version: number; // for future migrations
}

export const INITIAL_STATE: TrackerState = {
  expenses: [],
  budgets: [],
  settings: { autoGenerateRecurring: true },
  version: 2,
};

// Utility guards
export const isTemplate = (e: AnyExpense): e is RecurringExpenseTemplate => e.type === 'recurring-template';
export const isOneOff = (e: AnyExpense): e is OneOffExpense => e.type === 'oneoff';
export const isRecurringInstance = (e: AnyExpense): e is GeneratedRecurringExpenseInstance => e.type === 'recurring-instance';
