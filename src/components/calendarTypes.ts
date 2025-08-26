import { AnyExpense } from '@/domain/types';

// Shared types for calendar components
export interface DayBucket {
  date: string; // YYYY-MM-DD
  in: number;
  out: number;
  items: AnyExpense[];
}

export function isSyntheticInstance(exp: AnyExpense): boolean {
  return exp.type === 'recurring-instance' && exp.id.startsWith('synthetic-');
}
