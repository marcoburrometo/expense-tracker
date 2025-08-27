import { DEFAULT_CATEGORIES } from '@/domain/categories';

// Given a raw category string, returns translation key if it is one of the defaults.
// We keep original string fallback to not break user-added custom categories.
export function categoryTranslationKey(raw: string): string | null {
  if (DEFAULT_CATEGORIES.includes(raw)) return `cat.${raw}`;
  return null;
}

export function formatCategory(raw: string, t: (k: string) => string): string {
  const key = categoryTranslationKey(raw);
  if (!key) return raw; // custom / user-added category left as-is
  return t(key);
}
