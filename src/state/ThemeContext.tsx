"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
interface ThemeContextValue {
  mode: ThemeMode; // selected mode (may be system)
  effective: 'light'|'dark'; // applied
  setMode: (m: ThemeMode) => void;
  toggle: () => void; // quick toggle light/dark (ignores system)
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemPref(): 'light'|'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setThemeMode] = useState<ThemeMode>('system');
  const [effective, setEffective] = useState<'light'|'dark'>(getSystemPref());

  // apply to document
  const apply = useCallback((m: ThemeMode) => {
    const sys = getSystemPref();
    const eff = m === 'system' ? sys : m;
    setEffective(eff);
    const root = document.documentElement;
    root.dataset.theme = eff; // html[data-theme="dark"|"light"]
    root.dataset.themeMode = m; // preserve original choice
    // Sync legacy Tailwind dark mode class so dark: utilities work even with custom data attributes
    if (eff === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  // The 'dark' class drives Tailwind class-based dark mode per tailwind.config.js (darkMode: 'class')
    // optional: remove previously set class names
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
  setThemeMode(m);
    try { localStorage.setItem('theme-mode', m); } catch {}
    apply(m);
  }, [apply, setThemeMode]);

  const toggle = useCallback(() => {
    setMode(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  // init
  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme-mode') as ThemeMode | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
      setThemeMode(stored);
        apply(stored);
      } else {
        apply('system');
      }
    } catch {
      apply('system');
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
  setThemeMode(curr => {
        if (curr === 'system') apply('system');
        return curr;
      });
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [apply, setThemeMode]);

  const value = React.useMemo(()=> ({ mode, effective, setMode, toggle }), [mode, effective, setMode, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
