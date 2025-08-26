"use client";
import { ExpenseForm } from '@/components/ExpenseForm';
import { ExpenseList } from '@/components/ExpenseList';
import { BudgetForm } from '@/components/BudgetForm';
import { BudgetSummary } from '@/components/BudgetSummary';
import { useTracker } from '@/state/TrackerContext';
import { INITIAL_STATE, TrackerState } from '@/domain/types';
import { useWorkspace } from '@/state/WorkspaceContext';
import { useAuth } from '@/state/AuthContext';
import { createWorkspaceInviteWithInfo, listWorkspaceInvites, listAuditEntries, acceptInvite, declineInvite, listUserIncomingInvites, getWorkspace, deleteWorkspaceInvite, removeAcceptedInvite } from '@/lib/workspaceAdapter';
import Confirm from '@/components/Confirm';
import React from 'react';

export default function Config() {
  const { expenses, budgets, settings, dispatch } = useTracker();
  const { activeWorkspaceId, activeWorkspace, cloudSyncEnabled } = useWorkspace();
  const { user } = useAuth();
  type Invite = { id: string; email: string; status: string; invitedBy: string; workspaceId: string; token?: string; expiresAt?: string };
  const [invites, setInvites] = React.useState<Invite[]>([]);
  interface AuditEntryLike { id: string; action: string; createdAt: string }
  const [audit, setAudit] = React.useState<AuditEntryLike[]>([]);
  const [incomingInvites, setIncomingInvites] = React.useState<Invite[]>([]);
  const [workspaceNameById, setWorkspaceNameById] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      // fetch workspace specific invites + audit
      if (activeWorkspaceId) {
        try {
          const data = await listWorkspaceInvites(activeWorkspaceId);
          if (!cancelled) setInvites(data);
          const auditData = await listAuditEntries(activeWorkspaceId, 30);
          if (!cancelled) setAudit(auditData);
        } catch {/* ignore */ }
      } else {
        setInvites([]);
        setAudit([]);
      }
      // fetch incoming invites for current user
      if (user?.email) {
        try {
          const inData = await listUserIncomingInvites(user.email);
          if (!cancelled) setIncomingInvites(inData);
          // load workspace names lazily
          const ids = Array.from(new Set(inData.map(i => i.workspaceId)));
          const nameMap: Record<string, string> = {};
          await Promise.all(ids.map(async id => {
            const ws = await getWorkspace(id);
            if (ws) nameMap[id] = ws.name;
          }));
          if (!cancelled) setWorkspaceNameById(prev => ({ ...prev, ...nameMap }));
        } catch {/* ignore */ }
      } else {
        setIncomingInvites([]);
      }
    })();
    return () => { cancelled = true; };
  }, [activeWorkspaceId, user?.email]);

  const onExport = () => {
    const blob = new Blob([JSON.stringify({ expenses, budgets, settings }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
  const onImport: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(text => {
      try {
        const json = JSON.parse(text);
        if (json?.expenses && json?.budgets && json?.settings) {
          const merged: TrackerState = {
            ...INITIAL_STATE,
            expenses: json.expenses,
            budgets: json.budgets,
            settings: { ...INITIAL_STATE.settings, ...json.settings },
            version: INITIAL_STATE.version,
          };
          dispatch({ type: 'HYDRATE_STATE', payload: merged });
          alert('Import completato');
        } else {
          alert('Formato non valido');
        }
      } catch {
        alert('JSON invalido');
      }
    }).catch(() => alert('Lettura file fallita'));
  };
  const inviteEmailRef = React.useRef<HTMLInputElement | null>(null);
  const createInvite = async () => {
    if (!inviteEmailRef.current || !user || !activeWorkspaceId) return;
    const email = inviteEmailRef.current.value.trim();
    if (!email) return;
    try {
      const { duplicated } = await createWorkspaceInviteWithInfo(activeWorkspaceId, email, user.uid);
      inviteEmailRef.current.value = '';
      const data = await listWorkspaceInvites(activeWorkspaceId);
      setInvites(data);
      setToast(duplicated ? 'Invito già esistente (link aggiornato).' : 'Invito creato.');
    } catch { alert('Errore invito'); }
  };
  const [toast, setToast] = React.useState<string>('');
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmTarget, setConfirmTarget] = React.useState<Invite | null>(null);
  const [confirmMode, setConfirmMode] = React.useState<'delete-pending' | 'remove-accepted' | null>(null);
  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(t);
  }, [toast]);
  return (
    <>
      <main className="mx-auto max-w-7xl p-6 md:p-10 space-y-8">
        <header className="space-y-2 fade-in">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight heading-gradient">Configurazione Movimenti</h1>
          <p className="text-sm text-neutral-800 dark:text-neutral-400">Crea e modifica spese una tantum o ricorrenti e gestisci i budget mensili. Questa sezione configura i dati che alimentano i movimenti.</p>
        </header>
        <section className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-6 col-span-1">
            {/* C: remove nested glass panel inside main form container for flatter hierarchy */}
            <div className="space-y-6 fade-in">
              <div className="glass-panel p-4 space-y-6">
                <ExpenseForm />
                <div className="glass-divider" />
                <BudgetForm />
              </div>
            </div>
            <div className="glass-panel p-4 fade-in" style={{ animationDelay: '.05s' }}>
              <BudgetSummary />
            </div>
          </div>
          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <div className="glass-panel p-4 fade-in" style={{ animationDelay: '.1s' }}>
              <ExpenseList />
            </div>
            <div className="glass-panel p-4 mt-6 fade-in" style={{ animationDelay: '.15s' }}>
              <h2 className="font-semibold mb-2 text-sm">Workspace & Sync</h2>
              <div className="text-[12px] mb-4 space-y-1">
                <div><strong>Workspace:</strong> {activeWorkspace?.name || '—'} {cloudSyncEnabled ? '(cloud sync attivo)' : '(solo locale)'}</div>
                <div><strong>ID:</strong> {activeWorkspaceId || '—'}</div>
              </div>
              <div className="flex gap-2 items-center mb-4 flex-wrap text-[12px]">
                <button onClick={onExport} className="glass-button glass-button--sm">Export JSON</button>
                <label className="glass-button glass-button--sm cursor-pointer inline-flex items-center gap-1">
                  <span>Import JSON</span>
                  <input type="file" accept="application/json" onChange={onImport} className="hidden" />
                </label>
              </div>
              <div className="glass-divider" />
              <h3 className="font-semibold mb-2 text-sm">Inviti Workspace</h3>
              <div className="flex gap-2 mb-3">
                <input ref={inviteEmailRef} type="email" placeholder="email" className="glass-input glass-input--sm flex-1" />
                <button onClick={createInvite} className="glass-button glass-button--sm">Invita</button>
              </div>
              <ul className="space-y-1 text-[12px] max-h-40 overflow-auto glass-scroll pr-1">
                {invites.map(inv => {
                  const canAct = user?.email?.toLowerCase() === inv.email.toLowerCase() && inv.status === 'pending';
                  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                  const inviteUrl = inv.token ? `${baseUrl}/invite/${inv.token}` : '';
                  const canDeletePending = user && (user.uid === inv.invitedBy || user.uid === activeWorkspace?.ownerId) && inv.status === 'pending';
                  const canRemoveAccepted = user && inv.status === 'accepted' && (user.uid === activeWorkspace?.ownerId || user.email?.toLowerCase() === inv.email.toLowerCase());
                  return (
                    <li key={inv.id} className="flex justify-between items-center gap-2 py-1 border-b border-white/30 dark:border-white/10 last:border-none">
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="truncate">{inv.email}</span>
                        <span className="text-[10px] opacity-60">{inv.invitedBy === user?.uid ? 'inviato da te' : `by ${inv.invitedBy.slice(0, 6)}`}</span>
                        {inviteUrl && (
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(inviteUrl).then(() => setToast('Link copiato')); }}
                            className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 text-left underline truncate"
                          >{inviteUrl}</button>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-white/40 dark:bg-white/10 capitalize">{inv.status}</span>
                       {canAct && (
                        <div className="flex gap-1">
                          <button
                            onClick={async () => { await acceptInvite(inv.id, user!.uid); const data = await listWorkspaceInvites(activeWorkspaceId!); setInvites(data as Invite[]); }}
                            className="glass-button glass-button--xs"
                          >Accetta</button>
                          <button
                            onClick={async () => { await declineInvite(inv.id); const data = await listWorkspaceInvites(activeWorkspaceId!); setInvites(data as Invite[]); }}
                            className="glass-button glass-button--xs"
                          >Rifiuta</button>
                        </div>
                      )}
                      {(canDeletePending || canRemoveAccepted) && (
                        <button
                          onClick={() => { setConfirmTarget(inv); setConfirmMode(canDeletePending ? 'delete-pending':'remove-accepted'); setConfirmOpen(true); }}
                          className="glass-button glass-button--xs"
                          title={canDeletePending ? 'Elimina invito' : 'Rimuovi membro'}
                        >✕</button>
                      )}
                    </li>
                  );
                })}
                {!invites.length && <li className="opacity-60">Nessun invito</li>}
              </ul>
              <div className="glass-divider" />
              <h3 className="font-semibold mb-2 text-sm">I tuoi Inviti in Arrivo</h3>
              <ul className="space-y-1 text-[12px] max-h-40 overflow-auto glass-scroll pr-1">
                {incomingInvites.map(inv => {
                  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                  const inviteUrl = inv.token ? `${baseUrl}/invite/${inv.token}` : '';
                  const wsName = workspaceNameById[inv.workspaceId] || inv.workspaceId.slice(0, 6);
                  return (
                    <li key={inv.id} className="flex flex-col gap-0.5 py-1 border-b border-white/30 dark:border-white/10 last:border-none">
                      <div className="flex justify-between items-center">
                        <span className="truncate font-medium">{wsName}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-white/40 dark:bg-white/10 capitalize">{inv.status}</span>
                      </div>
                      <span className="text-[10px] opacity-70">Invitato come: {inv.email}</span>
                      {inviteUrl && (
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(inviteUrl).then(() => setToast('Link copiato')); }}
                          className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 text-left underline truncate"
                        >{inviteUrl}</button>
                      )}
                      {inv.status === 'pending' && user && (
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={async () => { await acceptInvite(inv.id, user.uid); const inData = await listUserIncomingInvites(user.email!); setIncomingInvites(inData as Invite[]); }}
                            className="glass-button glass-button--xs"
                          >Accetta</button>
                          <button
                            onClick={async () => { await declineInvite(inv.id); const inData = await listUserIncomingInvites(user.email!); setIncomingInvites(inData as Invite[]); }}
                            className="glass-button glass-button--xs"
                          >Rifiuta</button>
                        </div>
                      )}
                    </li>
                  );
                })}
                {!incomingInvites.length && <li className="opacity-60">Nessun invito in arrivo</li>}
              </ul>
              <div className="glass-divider" />
              <h3 className="font-semibold mb-2 text-sm">Audit Log (ultimi)</h3>
              <ul className="space-y-1 text-[11px] max-h-40 overflow-auto glass-scroll pr-1">
                {audit.map(entry => (
                  <li key={entry.id} className="flex justify-between gap-2 py-0.5 border-b border-white/30 dark:border-white/10 last:border-none">
                    <span className="truncate">{entry.action}</span>
                    <span className="opacity-60 font-mono">{new Date(entry.createdAt).toLocaleTimeString()}</span>
                  </li>
                ))}
                {!audit.length && <li className="opacity-60">Nessun log</li>}
              </ul>
            </div>
          </div>
        </section>
      </main>
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-neutral-900 text-white/90 dark:bg-white/90 dark:text-neutral-900 px-4 py-2 rounded shadow-lg text-sm fade-in">
          {toast}
        </div>
      )}
      <Confirm
        open={confirmOpen}
        title={confirmMode === 'remove-accepted' ? 'Rimuovere il membro dal workspace?' : 'Eliminare questo invito?'}
        description={confirmMode === 'remove-accepted' ? 'Il membro perderà accesso al workspace (può essere reinvitato).' : 'Questa azione rimuove l\'invito. Potrai inviarne uno nuovo in seguito.'}
        confirmLabel={confirmMode === 'remove-accepted' ? 'Rimuovi' : 'Elimina'}
        variant={confirmMode === 'remove-accepted' ? 'danger' : 'neutral'}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); setConfirmMode(null); }}
        onConfirm={async () => {
          if(!confirmTarget || !user || !activeWorkspaceId) return;
          try {
            if(confirmMode === 'delete-pending') {
              await deleteWorkspaceInvite(confirmTarget.id, user.uid);
              setToast('Invito eliminato');
            } else if(confirmMode === 'remove-accepted') {
              await removeAcceptedInvite(confirmTarget.id, user.uid);
              setToast('Membro rimosso');
            }
            const data = await listWorkspaceInvites(activeWorkspaceId);
            setInvites(data);
          } finally {
            setConfirmOpen(false); setConfirmTarget(null); setConfirmMode(null);
          }
        }}
      />
    </>
  );
}
