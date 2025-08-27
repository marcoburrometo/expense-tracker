"use client";
import React, { useEffect, useState } from 'react';

// Small initial overlay to mask layout shift / font swap; auto-fades quickly.
// It unmounts after fade to keep DOM clean.
export const InitialAppLoader: React.FC<{ minMs?: number; totalMs?: number }> = ({ minMs = 120, totalMs = 600 }) => {
    const [visible, setVisible] = useState(true);
    const [canFade, setCanFade] = useState(false);
    useEffect(() => {
        const minTimer = setTimeout(() => setCanFade(true), minMs);
        const doneTimer = setTimeout(() => setVisible(false), totalMs);
        return () => { clearTimeout(minTimer); clearTimeout(doneTimer); };
    }, [minMs, totalMs]);
    if (!visible) return null;
    return (
        <div
            className={
                'pointer-events-none fixed inset-0 z-[999] flex items-center justify-center ' +
                'bg-neutral-50/80 dark:bg-neutral-900/80 backdrop-blur-sm transition-opacity duration-400 ' +
                (canFade ? 'opacity-0' : 'opacity-100')
            }
        >
            <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-br from-indigo-500 to-sky-400 animate-pulse shadow-sm" />
            </div>
        </div>
    );
};

export default InitialAppLoader;
