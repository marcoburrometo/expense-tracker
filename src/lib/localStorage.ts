// Simple keyed localStorage persistence with namespacing & safe JSON parse

const NAMESPACE = 'expense-tracker';

function key(k: string) {
  return `${NAMESPACE}:${k}`;
}

export function saveJSON<T>(k: string, data: T) {
  try {
    localStorage.setItem(key(k), JSON.stringify(data));
  } catch (err) {
    console.warn('localStorage save failed', err);
  }
}

export function loadJSON<T>(k: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback; // SSR guard
  try {
    const raw = localStorage.getItem(key(k));
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn('localStorage load failed', err);
    return fallback;
  }
}
