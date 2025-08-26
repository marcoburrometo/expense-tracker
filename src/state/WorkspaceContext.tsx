"use client";
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/state/AuthContext';
import { Workspace, TrackerState } from '@/domain/types';
import { listUserWorkspaces, ensurePersonalWorkspace, loadWorkspaceTracker, saveWorkspaceTracker, createWorkspace } from '@/lib/workspaceAdapter';
import { useTracker } from '@/state/TrackerContext';

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  activeWorkspace: Workspace | null;
  loading: boolean;
  switchWorkspace: (id: string) => Promise<void>;
  createNewWorkspace: (name: string) => Promise<void>;
  cloudSyncEnabled: boolean; // true when user logged & workspace selected
  saving: boolean;
  lastError: string | null;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { dispatch, expenses, budgets, settings, version } = useTracker();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const lastSavedState = useRef<string>('');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load / provision on auth
  useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!user) {
        setWorkspaces([]);
        setActiveWorkspaceId(null);
        return;
      }
      setLoading(true);
      try {
        const ws = await listUserWorkspaces(user.uid);
        let finalList = ws;
        if (!ws.length) {
          const created = await ensurePersonalWorkspace(user.uid);
          finalList = [created];
        }
        if (!cancelled) {
          setWorkspaces(finalList);
          setActiveWorkspaceId(finalList[0].id);
        }
      } finally { if(!cancelled) setLoading(false); }
    }
    init();
    return () => { cancelled = true; };
  }, [user]);

  // Hydrate tracker when active workspace changes
  useEffect(() => {
    if (!user || !activeWorkspaceId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const remote = await loadWorkspaceTracker(activeWorkspaceId);
        if (!cancelled) {
          dispatch({ type: 'HYDRATE_STATE', payload: remote });
          lastSavedState.current = JSON.stringify(remote);
        }
      } finally { if(!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user, activeWorkspaceId, dispatch]);

  // Debounced save on local tracker changes
  useEffect(() => {
    if (!user || !activeWorkspaceId) return; // offline mode
    const current: TrackerState = { expenses, budgets, settings, version };
    const serialized = JSON.stringify(current);
    if (serialized === lastSavedState.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
  await saveWorkspaceTracker(activeWorkspaceId, current, user.uid);
        lastSavedState.current = serialized;
        setLastError(null);
      } catch(e) {
        console.warn('Save workspace tracker failed', e);
        setLastError(e instanceof Error ? e.message : 'Errore salvataggio');
      }
      setSaving(false);
    }, 800); // 800ms debounce
  }, [expenses, budgets, settings, version, user, activeWorkspaceId]);

  const switchWorkspace = useCallback(async (id: string) => {
    if (id === activeWorkspaceId) return;
    setActiveWorkspaceId(id);
  }, [activeWorkspaceId]);

  const createNewWorkspace = useCallback(async (name: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const ws = await createWorkspace(user.uid, name);
      setWorkspaces(prev => [ws, ...prev]);
      setActiveWorkspaceId(ws.id);
    } finally { setLoading(false); }
  }, [user]);

  const value = useMemo(() => ({
    workspaces,
    activeWorkspaceId,
    activeWorkspace: workspaces.find(w => w.id === activeWorkspaceId) || null,
    loading,
    switchWorkspace,
    createNewWorkspace,
    cloudSyncEnabled: !!(user && activeWorkspaceId),
    saving,
    lastError,
  }), [workspaces, activeWorkspaceId, loading, switchWorkspace, createNewWorkspace, user, saving, lastError]);

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if(!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider');
  return ctx;
}
