"use client";
import React from 'react';
import { acceptInviteByToken, getInviteByToken } from '@/lib/workspaceAdapter';
import { useAuth } from '@/state/AuthContext';

export default function InviteLanding({ params }: { params: { token: string } }) {
    const { token } = params;
    const { user } = useAuth();
    const [status, setStatus] = React.useState<'loading' | 'ready' | 'accepted' | 'error' | 'expired'>('loading');
    const [message, setMessage] = React.useState('');

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const inv = await getInviteByToken(token);
                if (cancelled) return;
                if (!inv) { setStatus('error'); setMessage('Invito non trovato'); return; }
                if (inv.expiresAt && new Date(inv.expiresAt).getTime() < Date.now()) { setStatus('expired'); setMessage('Invito scaduto'); return; }
                setStatus('ready');
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'Errore caricamento invito';
                if (!cancelled) { setStatus('error'); setMessage(msg); }
            }
        })();
        return () => { cancelled = true; };
    }, [token]);

    const onAccept = async () => {
        if (!user) { setMessage('Devi autenticarti prima di accettare'); return; }
        try {
            await acceptInviteByToken(token, user.uid, user.email || '');
            setStatus('accepted');
            setMessage('Invito accettato');
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Errore accettazione invito';
            setStatus('error');
            setMessage(msg);
        }
    };

    return (
        <main className="max-w-md mx-auto p-6 space-y-6">
            <h1 className="text-xl font-semibold">Invito Workspace</h1>
            {status === 'loading' && <p>Caricamento...</p>}
            {status === 'ready' && (
                <div className="space-y-4">
                    <p>Hai ricevuto un invito. Conferma per unirti al workspace.</p>
                    <button onClick={onAccept} className="glass-button">Accetta Invito</button>
                </div>
            )}
            {status === 'accepted' && <p className="text-green-600">{message}</p>}
            {status === 'expired' && <p className="text-amber-600">{message}</p>}
            {status === 'error' && <p className="text-red-600">{message}</p>}
            {user ? <p className="text-xs opacity-70">Loggato come {user.email}</p> : <p className="text-xs opacity-70">Non loggato</p>}
        </main>
    );
}