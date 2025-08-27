 // Centralized formatting utilities
// Lightweight: avoids recreating Intl.NumberFormat everywhere, supports locale switching.
// If currency or locale changes at runtime, we expose a function that can be re-instantiated.

// (Reserved) Could import translations for localized currency names if needed later.

export interface FormatCurrencyOptions {
  currency?: string; // default EUR
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero';
}

// Simple cache key structure
const nfCache = new Map<string, Intl.NumberFormat>();

export function formatCurrency(amount: number, locale: string | undefined, opts: FormatCurrencyOptions = {}): string {
  const { currency = 'EUR', minimumFractionDigits = 2, maximumFractionDigits = 2, signDisplay = 'auto' } = opts;
  const key = [locale || 'en', currency, minimumFractionDigits, maximumFractionDigits, signDisplay].join('|');
  let nf = nfCache.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat(locale || 'en', { style: 'currency', currency, minimumFractionDigits, maximumFractionDigits, signDisplay });
    nfCache.set(key, nf);
  }
  return nf.format(amount);
}

// Hook helper for React components (avoids re-passing locale manually)
import { useI18n } from '@/state/I18nContext';
export function useCurrencyFormatter(opts: FormatCurrencyOptions = {}) {
  const { locale } = useI18n();
  return (amount: number) => formatCurrency(amount, locale, opts);
}

// Percent formatter (possible future use)
export function formatPercent(value: number, locale: string | undefined, fractionDigits = 0) {
  const key = ['pct', locale || 'en', fractionDigits].join('|');
  let nf = nfCache.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat(locale || 'en', { style: 'percent', minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
    nfCache.set(key, nf);
  }
  return nf.format(value);
}
