"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
import { useTheme } from '@/state/ThemeContext';

interface NavItem { href: string; label: string; match?: (path: string)=> boolean }

const links: NavItem[] = [
  { href: '/', label: 'Movimenti', match: p => p === '/' },
  { href: '/config', label: 'Config', match: p => p.startsWith('/config') },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { effective, mode, toggle, setMode } = useTheme();
  return (
    <div className="glass-panel px-5 py-3 flex items-center gap-6 text-sm">
      {links.map(l => {
        const active = l.match ? l.match(pathname) : pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`relative font-medium transition-colors ${active ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500 after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:rounded-full after:bg-gradient-to-r after:from-blue-500 after:to-indigo-500' : 'hover:underline underline-offset-4 text-neutral-700 dark:text-neutral-200'}`}
          >
            {l.label}
          </Link>
        );
      })}
      <div className="ml-auto flex gap-3 items-center">
        <button onClick={toggle} aria-label="Toggle tema" className="glass-button" title={`Tema: ${effective}`}>
          {effective === 'dark' ? '🌙' : '☀️'}
        </button>
  <select aria-label="Modalità tema" value={mode} onChange={e=>setMode(e.target.value as 'light'|'dark'|'system')} className="glass-input text-xs">
          <option value="system">Sistema</option>
          <option value="light">Chiaro</option>
          <option value="dark">Scuro</option>
        </select>
        <span className="glass-badge">Local</span>
      </div>
    </div>
  );
};
