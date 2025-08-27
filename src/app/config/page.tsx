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
import { GlassPanel } from '@/components/GlassPanel';
import { useI18n } from '@/state/I18nContext';
import { useToast } from '@/state/ToastContext';
import { ToggleSwitch } from '@/components/forms/ToggleSwitch';

export default function Config() {
  const { t } = useI18n();
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
  const { push: pushToast } = useToast();
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
          pushToast(t('notify.import.success'), 'success');
        } else {
          pushToast(t('notify.import.invalidFormat'), 'error');
        }
      } catch {
        pushToast(t('notify.import.invalidJson'), 'error');
      }
    }).catch(() => pushToast(t('notify.import.readError'), 'error'));
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
      pushToast(duplicated ? t('notify.invite.duplicate') : t('notify.invite.created'), duplicated ? 'info' : 'success');
    } catch { pushToast(t('notify.invite.error'), 'error'); }
  };
  // removed local toast state in favor of global ToastContext
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [confirmTarget, setConfirmTarget] = React.useState<Invite | null>(null);
  const [confirmMode, setConfirmMode] = React.useState<'delete-pending' | 'remove-accepted' | null>(null);
  // removed obsolete local toast effect
  return (
    <>
      <main className="mx-auto max-w-7xl p-4 md:p-10 space-y-8">
        <header className="space-y-2 fade-in">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight heading-gradient">{t('page.config.title')}</h1>
          <p className="text-sm text-neutral-800 dark:text-neutral-400">{t('page.config.desc')}</p>
        </header>
        <section className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-6 col-span-1 max-w-[93vw]">
            {/* C: remove nested glass panel inside main form container for flatter hierarchy */}
            <div className="space-y-6 fade-in">
              <ExpenseForm />
              <div className="glass-divider" />
              <BudgetForm />
            </div>
            <BudgetSummary />
          </div>
          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <ExpenseList />
            <GlassPanel variant="pure" className="mt-6 fade-in" style={{ animationDelay: '.15s' }}>
              <h2 className="font-semibold mb-2 text-sm">{t('config.section.workspace')}</h2>
              <div className="text-[12px] mb-4 space-y-1">
                <div><strong>{t('config.workspace.label')}:</strong> {activeWorkspace?.name || '—'} {cloudSyncEnabled ? t('config.workspace.cloudOn') : t('config.workspace.cloudOff')}</div>
                <div><strong>{t('config.workspace.id')}:</strong> {activeWorkspaceId || '—'}</div>
              </div>
              <div className="flex gap-2 items-center mb-4 flex-wrap text-[12px]">
                <button onClick={onExport} className="glass-button glass-button--sm">{t('config.export')}</button>
                <label className="glass-button glass-button--sm cursor-pointer inline-flex items-center gap-1">
                  <span>{t('config.import')}</span>
                  <input type="file" accept="application/json" onChange={onImport} className="hidden" />
                </label>
              </div>
              <div className="glass-divider" />
              <h3 className="font-semibold mb-2 text-sm">{t('config.invites.title')}</h3>
              <div className="flex gap-2 mb-3">
                <input ref={inviteEmailRef} type="email" placeholder={t('config.invites.emailPlaceholder')} className="glass-input glass-input--sm flex-1" />
                <button onClick={createInvite} className="glass-button glass-button--sm">{t('config.invites.inviteButton')}</button>
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
                        <span className="text-[10px] opacity-60">{inv.invitedBy === user?.uid ? t('config.invites.sentByYou') : `${t('config.invites.by')} ${inv.invitedBy.slice(0, 6)}`}</span>
                        {inviteUrl && (
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(inviteUrl).then(() => pushToast(t('notify.link.copied'), 'info')); }}
                            className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 text-left underline truncate"
                          >{inviteUrl}</button>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-white/40 dark:bg-white/10 capitalize">{t(`invite.status.${inv.status}`)}</span>
                      {canAct && (
                        <div className="flex gap-1">
                          <button
                            onClick={async () => { await acceptInvite(inv.id, user!.uid); const data = await listWorkspaceInvites(activeWorkspaceId!); setInvites(data as Invite[]); pushToast(t('config.invite.accept'), 'success'); }}
                            className="glass-button glass-button--xs"
                          >{t('config.invite.accept')}</button>
                          <button
                            onClick={async () => { await declineInvite(inv.id); const data = await listWorkspaceInvites(activeWorkspaceId!); setInvites(data as Invite[]); pushToast(t('config.invite.decline'), 'info'); }}
                            className="glass-button glass-button--xs"
                          >{t('config.invite.decline')}</button>
                        </div>
                      )}
                      {(canDeletePending || canRemoveAccepted) && (
                        <button
                          onClick={() => { setConfirmTarget(inv); setConfirmMode(canDeletePending ? 'delete-pending' : 'remove-accepted'); setConfirmOpen(true); }}
                          className="glass-button glass-button--xs"
                          title={canDeletePending ? t('config.invite.delete.titleAttr') : t('config.member.remove.titleAttr')}
                        >✕</button>
                      )}
                    </li>
                  );
                })}
                {!invites.length && <li className="opacity-60">{t('config.invites.none')}</li>}
              </ul>
              <div className="glass-divider" />
              <h3 className="font-semibold mb-2 text-sm">{t('config.incoming.title')}</h3>
              <ul className="space-y-1 text-[12px] max-h-40 overflow-auto glass-scroll pr-1">
                {incomingInvites.map(inv => {
                  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                  const inviteUrl = inv.token ? `${baseUrl}/invite/${inv.token}` : '';
                  const wsName = workspaceNameById[inv.workspaceId] || inv.workspaceId.slice(0, 6);
                  return (
                    <li key={inv.id} className="flex flex-col gap-0.5 py-1 border-b border-white/30 dark:border-white/10 last:border-none">
                      <div className="flex justify-between items-center">
                        <span className="truncate font-medium">{wsName}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-white/40 dark:bg-white/10 capitalize">{t(`invite.status.${inv.status}`)}</span>
                      </div>
                      <span className="text-[10px] opacity-70">{t('config.incoming.invitedAs')}: {inv.email}</span>
                      {inviteUrl && (
                        <button
                          type="button"
                          onClick={() => { navigator.clipboard.writeText(inviteUrl).then(() => pushToast(t('notify.link.copied'), 'info')); }}
                          className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 text-left underline truncate"
                        >{inviteUrl}</button>
                      )}
                      {inv.status === 'pending' && user && (
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={async () => { await acceptInvite(inv.id, user.uid); const inData = await listUserIncomingInvites(user.email!); setIncomingInvites(inData as Invite[]); pushToast(t('config.invite.accept'), 'success'); }}
                            className="glass-button glass-button--xs"
                          >{t('config.invite.accept')}</button>
                          <button
                            onClick={async () => { await declineInvite(inv.id); const inData = await listUserIncomingInvites(user.email!); setIncomingInvites(inData as Invite[]); pushToast(t('config.invite.decline'), 'info'); }}
                            className="glass-button glass-button--xs"
                          >{t('config.invite.decline')}</button>
                        </div>
                      )}
                    </li>
                  );
                })}
                {!incomingInvites.length && <li className="opacity-60">{t('config.incoming.none')}</li>}
              </ul>
              <div className="glass-divider" />
              <h3 className="font-semibold mb-2 text-sm">{t('config.audit.title')}</h3>
              <ul className="space-y-1 text-[11px] max-h-40 overflow-auto glass-scroll pr-1">
                {audit.map(entry => (
                  <li key={entry.id} className="flex justify-between gap-2 py-0.5 border-b border-white/30 dark:border-white/10 last:border-none">
                    <span className="truncate">{entry.action}</span>
                    <span className="opacity-60 font-mono">{new Date(entry.createdAt).toLocaleTimeString()}</span>
                  </li>
                ))}
                {!audit.length && <li className="opacity-60">{t('config.audit.none')}</li>}
              </ul>
              <div className="glass-divider" />
              <h3 className="font-semibold mb-2 text-sm">{t('analytics.section.title')}</h3>
              <AnalyticsSettings t={t} />
            </GlassPanel>
          </div>
        </section>
      </main>
      <Confirm
        open={confirmOpen}
        title={confirmMode === 'remove-accepted' ? t('config.confirm.removeMember.title') : t('config.confirm.deleteInvite.title')}
        description={confirmMode === 'remove-accepted' ? t('config.confirm.removeMember.desc') : t('config.confirm.deleteInvite.desc')}
        confirmLabel={confirmMode === 'remove-accepted' ? t('config.confirm.removeMember.confirm') : t('config.confirm.deleteInvite.confirm')}
        variant={confirmMode === 'remove-accepted' ? 'danger' : 'neutral'}
        onCancel={() => { setConfirmOpen(false); setConfirmTarget(null); setConfirmMode(null); }}
        onConfirm={async () => {
          if (!confirmTarget || !user || !activeWorkspaceId) return;
          try {
            if (confirmMode === 'delete-pending') {
              await deleteWorkspaceInvite(confirmTarget.id, user.uid);
              pushToast(t('notify.invite.deleted'), 'success');
            } else if (confirmMode === 'remove-accepted') {
              await removeAcceptedInvite(confirmTarget.id, user.uid);
              pushToast(t('notify.member.removed'), 'success');
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

// Local component for analytics opt in/out
const AnalyticsSettings: React.FC<{ t: (k: string) => string }> = ({ t }) => {
  const [enabled, setEnabled] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('janet.analytics.disabled') !== '1';
  });
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (enabled) {
      localStorage.removeItem('janet.analytics.disabled');
    } else {
      localStorage.setItem('janet.analytics.disabled', '1');
    }
  }, [enabled]);
  return (
    <div className="space-y-3 text-[12px]">
      <p className="leading-snug opacity-80">{t('analytics.description')}</p>
      <div className="flex items-center gap-3">
        <ToggleSwitch checked={enabled} onChange={(v: boolean) => setEnabled(v)} size="sm" ariaLabel={enabled ? t('analytics.optOutLabel') : t('analytics.optInLabel')} />
        <span className="text-[11px] tracking-wide uppercase font-medium">{enabled ? t('analytics.enabled.notice') : t('analytics.disabled.notice')}</span>
      </div>
    </div>
  );
};
