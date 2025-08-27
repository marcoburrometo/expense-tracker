"use client";
import React from 'react';
import { acceptInviteByToken, getInviteByToken } from '@/lib/workspaceAdapter';
import { useWorkspace } from '@/state/WorkspaceContext';
import { useAuth } from '@/state/AuthContext';
import { useI18n } from '@/state/I18nContext';

export default function InviteLanding({ params }: { params: { token: string } }) {
    const { token } = params;
    const { user } = useAuth();
    const { t } = useI18n();
    const { refreshWorkspaces } = useWorkspace();
    const [status, setStatus] = React.useState<'loading' | 'ready' | 'accepted' | 'error' | 'expired'>('loading');
    const [message, setMessage] = React.useState('');

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const inv = await getInviteByToken(token);
                if (cancelled) return;
                if (!inv) { setStatus('error'); setMessage(t('invite.error.notFound')); return; }
                if (inv.expiresAt && new Date(inv.expiresAt).getTime() < Date.now()) { setStatus('expired'); setMessage(t('invite.error.expired')); return; }
                setStatus('ready');
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : t('invite.error.load');
                if (!cancelled) { setStatus('error'); setMessage(msg); }
            }
        })();
        return () => { cancelled = true; };
    }, [token, t]);

    const onAccept = async () => {
        if (!user) { setMessage(t('invite.error.authRequired')); return; }
        try {
            const inv = await getInviteByToken(token);
            if (!inv) { setStatus('error'); setMessage(t('invite.error.notFound')); return; }
            await acceptInviteByToken(token, user.uid, user.email || '');
            // Refresh workspace list and activate the joined workspace
            await refreshWorkspaces(inv.workspaceId);
            setStatus('accepted');
            setMessage(t('invite.accepted'));
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : t('invite.error.accept');
            setStatus('error');
            setMessage(msg);
        }
    };

    return (
        <main className="max-w-md mx-auto p-6 space-y-6">
            <h1 className="text-xl font-semibold">{t('invite.page.title')}</h1>
            {status === 'loading' && <p>...</p>}
            {status === 'ready' && (
                <div className="space-y-4">
                    <p>{t('invite.page.received')}</p>
                    <button onClick={onAccept} className="glass-button">{t('invite.page.accept')}</button>
                </div>
            )}
            {status === 'accepted' && <p className="text-green-600">{message}</p>}
            {status === 'expired' && <p className="text-amber-600">{message}</p>}
            {status === 'error' && <p className="text-red-600">{message}</p>}
            {user ? <p className="text-xs opacity-70">{t('nav.login')} {user.email}</p> : <p className="text-xs opacity-70">{t('nav.logout')}</p>}
        </main>
    );
}