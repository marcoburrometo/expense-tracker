"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';
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
  const { workspaces, activeWorkspaceId, switchWorkspace, createNewWorkspace, cloudSyncEnabled, saving, lastError } = useWorkspace();
  let syncLabel = 'Local';
  if (cloudSyncEnabled) {
    syncLabel = saving ? 'Saving…' : 'Synced';
  }
  const onCreateWorkspace = async () => {
    const name = prompt('Nome nuovo workspace');
    if (name) await createNewWorkspace(name);
  };
  return (
    <div className="glass-panel px-5 py-3 flex items-center gap-6 text-sm">
      {links.map(l => {
        const active = l.match ? l.match(pathname) : pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? 'page' : undefined}
            className={`relative font-medium transition-colors ${active ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500 after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-full after:rounded-full after:bg-gradient-to-r after:from-blue-500 after:to-indigo-500' : 'hover:underline underline-offset-4 text-neutral-700'}`}
          >
            {l.label}
          </Link>
        );
      })}
      <div className="ml-auto flex gap-3 items-center">
        <button onClick={toggle} aria-label="Toggle tema" className="glass-button pressable" title={`Tema: ${effective}`}>
          {effective === 'dark' ? '🌙' : '☀️'}
        </button>
        <select aria-label="Modalità tema" value={mode} onChange={e => setMode(e.target.value as 'light' | 'dark' | 'system')} className="glass-input text-xs">
          <option value="system">Sistema</option>
          <option value="light">Chiaro</option>
          <option value="dark">Scuro</option>
        </select>
        {user ? (
          <>
            {workspaces.length > 0 && (
              <select
                aria-label="Workspace"
                value={activeWorkspaceId || ''}
                onChange={e => switchWorkspace(e.target.value)}
                className="glass-input text-xs max-w-[190px]"
                title="Seleziona workspace (suffix ' (esterno)' = non di tua proprietà)"
              >
                {workspaces.map(w => {
                  const external = user && w.ownerId !== user.uid;
                  // External workspace: show explicit Italian suffix for clarity
                  const label = external ? `${w.name} (esterno)` : w.name;
                  return <option value={w.id} key={w.id}>{label}</option>;
                })}
              </select>
            )}
            <button onClick={onCreateWorkspace} className="glass-button glass-button--sm" aria-label="Nuovo workspace">＋WS</button>
            <span className={`glass-badge ${cloudSyncEnabled ? '' : 'opacity-60'}`}>{syncLabel}</span>
            {lastError && <span className="glass-badge badge-danger" title={lastError}>Err</span>}
            <button onClick={logout} disabled={loading} className="glass-button glass-button--sm" aria-label="Logout">Logout</button>
          </>
        ) : (
          <button onClick={signInWithGoogle} disabled={loading} className="glass-button glass-button--primary glass-button--sm" aria-label="Login Google">{loading ? '...' : 'Login'}</button>
        )}
      </div>
    </div>
  );
};
