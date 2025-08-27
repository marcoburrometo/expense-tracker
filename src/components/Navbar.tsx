"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GlassPanel } from './GlassPanel';
import InfoHint from './InfoHint';
import { useTheme } from '@/state/ThemeContext';
import { useAuth } from '@/state/AuthContext';
import { useWorkspace } from '@/state/WorkspaceContext';
import { useI18n } from '@/state/I18nContext';

interface NavItem { href: string; label: string; match?: (path: string) => boolean }

interface BaseLink { href: string; key: string; match?: (path: string) => boolean }
const baseLinks: BaseLink[] = [
  { href: '/', key: 'nav.movements', match: (p: string) => p === '/' },
  { href: '/config', key: 'nav.config', match: (p: string) => p.startsWith('/config') },
  { href: '/calendar', key: 'nav.calendar', match: (p: string) => p.startsWith('/calendar') },
  { href: '/about', key: 'about.title', match: (p: string) => p.startsWith('/about') },
];

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { mode, setMode } = useTheme();
  const { user, loading, signInWithGoogle, logout } = useAuth();
  const { workspaces, activeWorkspaceId, switchWorkspace, createNewWorkspace, cloudSyncEnabled, saving } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const { t, locale, setLocale } = useI18n();
  const links: NavItem[] = baseLinks.map(l => ({ href: l.href, label: t(l.key), match: l.match }));
  let syncLabel = t('sync.local');
  if (cloudSyncEnabled) syncLabel = saving ? t('sync.saving') : t('sync.synced');
  const onCreateWorkspace = async () => {
    const name = prompt(t('workspace.newPrompt'));
    if (name) await createNewWorkspace(name);
  };
  const close = useCallback(() => {
    // animate out if panel open
    if (open) {
      setLeaving(true);
      setTimeout(() => {
        setOpen(false);
        setLeaving(false);
      }, 240); // match navSideOutRight
    }
  }, [open]);
  // Close drawer only when navigating to a different pathname (not immediately after opening)
  useEffect(() => {
    if (!open) return; // only act if currently open
    // trigger animated close when route changes
    setLeaving(true);
    const to = setTimeout(() => {
      setOpen(false);
      setLeaving(false);
    }, 240);
    return () => clearTimeout(to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
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
    const triggerEl = triggerRef.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
      document.documentElement.style.overflow = prevOverflow;
      // restore focus to trigger for accessibility
      triggerEl?.focus();
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
        {(() => {
          const order: Array<'system' | 'light' | 'dark'> = ['system', 'light', 'dark'];
          const idx = order.indexOf(mode);
          const nextMode = order[(idx + 1) % order.length];
          const icon = mode === 'dark' ? '🌙' : mode === 'light' ? '☀️' : '🖥️';
          const labelCurrent = mode === 'system' ? t('nav.theme.system') : mode === 'light' ? t('nav.theme.light') : t('nav.theme.dark');
          const labelNext = nextMode === 'system' ? t('nav.theme.system') : nextMode === 'light' ? t('nav.theme.light') : t('nav.theme.dark');
          return (
            <button
              type="button"
              onClick={() => { setMode(nextMode); onClick?.(); }}
              aria-label={`${t('nav.theme.mode')}: ${labelNext}`}
              title={`${t('nav.theme.mode')}: ${labelCurrent} → ${labelNext}`}
              className="glass-button glass-button--sm px-2 text-base leading-none"
              data-theme-switcher
            >
              <span key={mode} className="block icon-pop-fade will-change-transform select-none">{icon}</span>
            </button>
          );
        })()}
        <button
          type="button"
          onClick={() => { setLocale(locale === 'it' ? 'en' : 'it'); onClick?.(); }}
          aria-label={`${t('nav.language')}: ${t(locale === 'it' ? 'lang.en' : 'lang.it')}`}
          title={`${t('nav.language')}: ${t(locale === 'it' ? 'lang.en' : 'lang.it')}`}
          className="glass-button glass-button--sm px-2 text-base leading-none font-emoji"
          data-flag-switcher
        >
          {locale === 'it' ? '🇮🇹' : '🇺🇸'}
        </button>
      </div>
      {user ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          {workspaces.length > 0 && (
            <select
              aria-label="Workspace"
              value={activeWorkspaceId || ''}
              onChange={e => { switchWorkspace(e.target.value); onClick?.(); }}
              className="glass-input glass-input--sm text-[11px] max-w-[190px]"
              title="Workspace"
            >
              {workspaces.map(w => {
                const external = user && w.ownerId !== user.uid;
                const label = external ? `${w.name} ${t('workspace.externalSuffix')}` : w.name;
                return <option value={w.id} key={w.id}>{label}</option>;
              })}
            </select>
          )}
          <div className="flex items-center gap-2">
            <button onClick={async () => { await onCreateWorkspace(); onClick?.(); }} className="glass-button glass-button--sm" aria-label={t('nav.newWorkspace')}>＋{t('nav.newWorkspace')}</button>
            <span className={`glass-badge text-[9px] tracking-wide flex items-center gap-1 ${cloudSyncEnabled ? 'text-success' : 'text-tertiary'}`}>{syncLabel}
              <InfoHint
                tKey={cloudSyncEnabled ? (saving ? 'sync.hint.saving' : 'sync.hint.synced') : 'sync.hint.local'}
                side="bottom"
              />
            </span>
            <button onClick={() => { logout(); onClick?.(); }} disabled={loading} className="glass-button glass-button--sm" aria-label={t('nav.logout')}>{t('nav.logout')}</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Show local/sync badge also in local (unauthenticated) mode */}
          <span
            className={`glass-badge text-[9px] tracking-wide flex items-center gap-1 ${cloudSyncEnabled ? 'text-success' : 'text-tertiary'}`}
            aria-label={cloudSyncEnabled ? t('sync.status') : t('sync.local')}
            role="status"
            aria-live="polite"
          >
            {syncLabel}
            <InfoHint
              tKey={cloudSyncEnabled ? (saving ? 'sync.hint.saving' : 'sync.hint.synced') : 'sync.hint.local'}
              side="bottom"
            />
          </span>
          <button
            onClick={() => { signInWithGoogle(); onClick?.(); }}
            disabled={loading}
            className="glass-button glass-button--primary glass-button--sm px-4"
            aria-label="Google Login"
          >
            {loading ? '...' : t('nav.login')}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <GlassPanel as="nav" variant="flat-pure" className="glass-panel--overflow-visible w-full px-4 md:px-6 py-2.5 flex items-center gap-3 md:gap-6 text-sm relative">
      {/* Brand / Logo placeholder */}
      <Link
        href="/"
        onClick={() => { close(); }}
        className="group/brand flex items-center gap-2 font-semibold tracking-tight relative select-none"
        aria-label={t('nav.movements')}
      >
        <span className="text-accent text-[15px] leading-none">💰</span>
        <span className="glass-text-brand leading-tight text-[15px] tracking-tight">JANET</span>
        {/* Tooltip tagline (hover / focus) */}
        <span
          role="tooltip"
          className="pointer-events-none opacity-0 group-hover/brand:opacity-100 group-focus-within/brand:opacity-100 transition-opacity duration-200 absolute top-full left-[55%] translate-x-0 mt-2 px-2.5 py-1.5 rounded-md text-[9px] font-medium tracking-[0.09em] uppercase backdrop-blur-md bg-white/65 dark:bg-neutral-800/75 text-secondary shadow-lg shadow-black/10 dark:shadow-black/40 whitespace-nowrap z-30 border border-white/30 dark:border-white/10"
        >
          Just ANother Expense Tracker
        </span>
      </Link>
      <div className="hidden sm:flex items-center gap-5">
        {renderLinks()}
      </div>
      <div className="hidden sm:flex items-center gap-3 ml-auto">
        {renderUserControls()}
      </div>
      {/* Hamburger */}
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? t('nav.closeMenu') : t('nav.menu')}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="nav-hamburger sm:hidden ml-auto glass-button glass-button--sm px-3"
      >
        {open ? '✕' : '☰'}
      </button>
      {/* Mobile side drawer rendered via portal for highest stacking */}
      {open && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[1000] sm:hidden flex">
          <div
            className={`absolute inset-0 bg-black/45 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-200 ${leaving ? 'opacity-0' : 'opacity-100'}`}
            aria-hidden="true"
            onClick={close}
          />
          <GlassPanel
            variant="subtle"
            className={`ml-auto nav-fullscreen nav-side-anim-right nav-side-panel-scroll p-6 pt-5 ${leaving ? '' : ''}`}
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={t('nav.menu')}
            data-leaving={leaving || undefined}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-semibold tracking-tight text-base">
                <span className="text-accent text-[20px] leading-none">💰</span>
                <span className="glass-text-brand text-[20px] leading-none">JANET</span>
              </div>
              <button onClick={close} className="glass-button glass-button--sm" aria-label={t('nav.closeMenu')}>✕</button>
            </div>
            <nav className="flex flex-col gap-6 text-[1.05rem] font-medium">
              {renderLinks(close)}
            </nav>
            <div className="border-t border-white/10 dark:border-white/5 my-2" />
            {renderUserControls(close)}
            <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-white/10 dark:border-white/5 text-[11px] tracking-wide text-tertiary">
              <span className="uppercase">{t('nav.menu')}</span>
              <span>© {new Date().getFullYear()} JANET</span>
            </div>
          </GlassPanel>
        </div>,
        document.body
      )}
    </GlassPanel>
  );
};
