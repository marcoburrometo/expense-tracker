"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GlassPanel } from './GlassPanel';
import { useTheme } from '@/state/ThemeContext';
import { useAuth } from '@/state/AuthContext';
import { useWorkspace } from '@/state/WorkspaceContext';

interface NavItem { href: string; label: string; match?: (path: string) => boolean }

const links: NavItem[] = [
  { href: '/', label: 'Movimenti', match: p => p === '/' },
  { href: '/config', label: 'Config', match: p => p.startsWith('/config') },
  { href: '/calendar', label: 'Calendario', match: p => p.startsWith('/calendar') },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { effective, mode, toggle, setMode } = useTheme();
  const { user, loading, signInWithGoogle, logout } = useAuth();
  const { workspaces, activeWorkspaceId, switchWorkspace, createNewWorkspace, cloudSyncEnabled, saving } = useWorkspace();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  let syncLabel = 'Local';
  if (cloudSyncEnabled) {
    syncLabel = saving ? 'Saving…' : 'Synced';
  }
  const onCreateWorkspace = async () => {
    const name = prompt('Nome nuovo workspace');
    if (name) await createNewWorkspace(name);
  };
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => { close(); }, [pathname, close]);
  // Auto-close when viewport crosses to >= sm (Tailwind sm = 640px)
  useEffect(() => {
    function onResize() { if (window.innerWidth >= 640) close(); }
    window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize);
  }, [close]);

  // Close on ESC & focus trap
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { close(); }
      else if (e.key === 'Tab') {
        const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); (last as HTMLElement).focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); (first as HTMLElement).focus(); }
      }
    }
    function onClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => {
      // focus first interactive element
      const firstInteractive = panelRef.current?.querySelector<HTMLElement>('button, select, a');
      firstInteractive?.focus();
    }, 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
      document.documentElement.style.overflow = prevOverflow;
    };
  }, [open, close]);

  const renderLinks = (onClick?: () => void) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-5 w-full sm:w-auto">
      {links.map(l => {
        const active = l.match ? l.match(pathname) : pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            onClick={onClick}
            className={`group relative font-medium px-1 py-1 text-secondary hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)] rounded transition-colors duration-200 ${active ? 'text-accent' : ''}`}
          >
            <span className="relative z-10">{l.label}</span>
            <span className={`pointer-events-none absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-alt)] transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-70'}`} />
          </Link>
        );
      })}
    </div>
  );

  const renderUserControls = (onClick?: () => void) => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
      <div className="flex items-center gap-1">
        <button
          onClick={() => { toggle(); onClick?.(); }}
          aria-label="Toggle tema"
          className="glass-button glass-button--sm pressable font-medium px-3"
          title={`Tema: ${effective}`}
        >
          {effective === 'dark' ? '🌙' : '☀️'}
        </button>
        <select
          aria-label="Modalità tema"
          value={mode}
          onChange={e => { setMode(e.target.value as 'light' | 'dark' | 'system'); onClick?.(); }}
          className="glass-input glass-input--sm text-[11px] w-[92px]"
        >
          <option value="system">Sistema</option>
          <option value="light">Chiaro</option>
          <option value="dark">Scuro</option>
        </select>
      </div>
      {user ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {workspaces.length > 0 && (
            <select
              aria-label="Workspace"
              value={activeWorkspaceId || ''}
              onChange={e => { switchWorkspace(e.target.value); onClick?.(); }}
              className="glass-input glass-input--sm text-[11px] max-w-[190px]"
              title="Seleziona workspace (suffix ' (esterno)' = non di tua proprietà)"
            >
              {workspaces.map(w => {
                const external = user && w.ownerId !== user.uid;
                const label = external ? `${w.name} (esterno)` : w.name;
                return <option value={w.id} key={w.id}>{label}</option>;
              })}
            </select>
          )}
          <div className="flex items-center gap-2">
            <button onClick={async () => { await onCreateWorkspace(); onClick?.(); }} className="glass-button glass-button--sm" aria-label="Nuovo workspace">＋WS</button>
            <span className={`glass-badge text-[9px] tracking-wide ${cloudSyncEnabled ? 'text-success' : 'text-tertiary'}`}>{syncLabel}</span>
            <button onClick={() => { logout(); onClick?.(); }} disabled={loading} className="glass-button glass-button--sm" aria-label="Logout">Logout</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { signInWithGoogle(); onClick?.(); }}
          disabled={loading}
          className="glass-button glass-button--primary glass-button--sm px-4"
          aria-label="Login Google"
        >
          {loading ? '...' : 'Login'}
        </button>
      )}
    </div>
  );

  return (
    <GlassPanel as="nav" variant="flat-pure" className="glass-panel--overflow-visible w-full px-4 md:px-6 py-2.5 flex items-center gap-3 md:gap-6 text-sm relative">
      {/* Brand / Logo placeholder */}
      <div className="group/brand flex items-center gap-2 font-semibold tracking-tight relative select-none">
        <span className="text-accent text-[15px] leading-none">💰</span>
        <span className="glass-text-brand leading-tight text-[15px] tracking-tight">JANET</span>
        {/* Tooltip tagline (hover / focus) */}
        <span
          role="tooltip"
          className="pointer-events-none opacity-0 group-hover/brand:opacity-100 group-focus-within/brand:opacity-100 transition-opacity duration-200 absolute top-full left-[55%] translate-x-0 mt-2 px-2.5 py-1.5 rounded-md text-[9px] font-medium tracking-[0.09em] uppercase backdrop-blur-md bg-white/65 dark:bg-neutral-800/75 text-secondary shadow-lg shadow-black/10 dark:shadow-black/40 whitespace-nowrap z-30 border border-white/30 dark:border-white/10"
        >Just ANother Expense Tracker</span>
      </div>
      <div className="hidden sm:flex items-center gap-5">
        {renderLinks()}
      </div>
      <div className="hidden sm:flex items-center gap-3 ml-auto">
        {renderUserControls()}
      </div>
      {/* Hamburger */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="nav-hamburger sm:hidden ml-auto glass-button glass-button--sm px-3"
      >
        {open ? '✕' : '☰'}
      </button>
      {/* Mobile panel */}
      {open && (
        <div
          className="nav-mobile-panel absolute left-0 top-full w-full pt-2 z-30 sm:hidden"
        >
          <GlassPanel
            variant="subtle"
            className="p-4 flex flex-col gap-4 nav-drawer-anim shadow-lg shadow-black/10 dark:shadow-black/40 sm:hidden backdrop-blur-xl"
            ref={panelRef}
            aria-label="Mobile navigation"
          >
            {renderLinks(close)}
            <div className="border-t border-white/10 pt-2" />
            {renderUserControls(close)}
            <button onClick={close} className="glass-button glass-button--sm mt-2 self-end" aria-label="Chiudi menu">Chiudi</button>
          </GlassPanel>
        </div>
      )}
    </GlassPanel>
  );
};
