// Centralized default categories for expenses/budgets.
// Keep list stable; append new values at the end to avoid churn in select ordering.
export const DEFAULT_CATEGORIES: string[] = [
  'Generale',
  'Affitto',
  'Spesa',
  'Trasporti',
  'Bollette',
  'Intrattenimento',
  'Salute',
  'Abbonamenti',
  'Viaggi',
  'Altro',
];

export function mergeCategories(existing: string[]): string[] {
  const set = new Set(DEFAULT_CATEGORIES);
  for (const c of existing) set.add(c);
  return Array.from(set);
}
