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

// Multi-tenant workspace domain (cloud only)
export interface Workspace {
  id: string;
  name: string;
  ownerId: string; // uid of owner
  memberIds: string[]; // includes ownerId for convenience
  createdAt: string; // ISO
  updatedAt: string; // ISO
  // future: plan/tier, archived flag, etc.
}

export interface WorkspaceInvite {
  id: string;
  workspaceId: string;
  email: string; // invited email
  invitedBy: string; // uid
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: string;
  updatedAt: string;
}

// Remote tracker state wrapper stored per workspace document (Firestorm serialized shape)
export interface WorkspaceTrackerDocument {
  workspaceId: string;
  tracker: TrackerState; // same shape as local; migrations must keep parity
  updatedAt: string;
}

// Lightweight audit entry
export interface AuditEntry {
  id: string;
  workspaceId: string;
  actorId: string;
  action: string; // e.g. expense.add, budget.update
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface SyncStatusMeta {
  lastPullAt?: string;
  lastPushAt?: string;
  lastError?: string;
  pendingLocalChanges?: boolean;
  conflict?: boolean;
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
