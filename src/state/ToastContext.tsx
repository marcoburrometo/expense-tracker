"use client";
import React, { createContext, useContext, useCallback, useState, useRef, useEffect } from 'react';

export type ToastKind = 'info' | 'success' | 'error';

export interface ToastItem {
    id: string;
    message: string;
    kind: ToastKind;
    createdAt: number;
    ttl: number; // ms
}

interface ToastContextValue {
    push: (message: string, kind?: ToastKind, ttl?: number) => string;
    remove: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function randomId() { return Math.random().toString(36).slice(2, 9); }

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<ToastItem[]>([]);
    const timers = useRef<Record<string, number>>({});

    const remove = useCallback((id: string) => {
        setItems(list => list.filter(t => t.id !== id));
        const h = timers.current[id];
        if (h) { clearTimeout(h); delete timers.current[id]; }
    }, []);

    const push = useCallback((message: string, kind: ToastKind = 'info', ttl = 3200) => {
        const id = randomId();
        setItems(list => [...list, { id, message, kind, createdAt: Date.now(), ttl }]);
        timers.current[id] = window.setTimeout(() => remove(id), ttl);
        return id;
    }, [remove]);

    // Cleanup on unmount
    useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);

    return (
        <ToastContext.Provider value={{ push, remove }}>
            {children}
            <div className="fixed z-[60] bottom-4 left-1/2 -translate-x-1/2 flex flex-col gap-2 w-[min(340px,90vw)] pointer-events-none select-none">
                {items.map(item => (
                    <div
                        key={item.id}
                        role="status"
                        className={`group relative glass-panel glass-panel--subtle px-4 py-2.5 text-[12px] leading-snug shadow-md flex items-start gap-2 animate-[toastIn_.45s_cubic-bezier(.16,.8,.3,1)] border-l-4 ${item.kind === 'success' ? 'border-l-emerald-500' : item.kind === 'error' ? 'border-l-rose-500' : 'border-l-sky-500'
                            }`}
                    >
                        <span className="flex-1 pr-4 break-words">{item.message}</span>
                        <button
                            type="button"
                            aria-label="Close"
                            onClick={() => remove(item.id)}
                            className="pointer-events-auto opacity-60 hover:opacity-100 transition text-[11px] font-semibold absolute top-1 right-1 px-1"
                        >×</button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}

/* Animations */
// Global CSS is heavy already; we inline a small keyframes via style tag injection only once.
let injected = false;
if (typeof document !== 'undefined' && !injected) {
    const style = document.createElement('style');
    style.dataset.toast = 'true';
    style.textContent = `@keyframes toastIn{0%{opacity:0;transform:translateY(6px) scale(.96)}60%{opacity:1;transform:translateY(-2px) scale(1.01)}100%{opacity:1;transform:translateY(0) scale(1)}}`;
    document.head.appendChild(style);
    injected = true;
}
