"use client";
import React, { useState, useId, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '@/state/I18nContext';

interface InfoHintProps {
    tKey: string; // translation key for content
    className?: string;
    side?: 'top' | 'bottom' | 'left' | 'right';
    delay?: number; // ms before showing
    closeDelay?: number; // ms before hiding
}

// Lightweight accessible hover/focus tooltip. No portal for now (kept inside panel), avoids dependency.
export const InfoHint: React.FC<InfoHintProps> = ({ tKey, className, side = 'top', delay = 120, closeDelay = 120 }) => {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    // separate mounted state so we can allow exit animations later if desired
    const [mounted, setMounted] = useState(false);
    const openTimer = useRef<number | null>(null);
    const closeTimer = useRef<number | null>(null);
    const id = useId();
    // Position classes – top now aligns left edge with trigger (no centering translate) per request.
    const pos: Record<string, string> = {
        // Align right edge of tooltip with right edge of trigger for top/bottom
        top: 'bottom-full right-0 mb-1',
        bottom: 'top-full right-0 mt-1',
        // Side placements stay similar but align vertically at top for consistency
        left: 'right-full top-0 mr-1',
        right: 'left-full top-0 ml-1'
    };

    const clearTimers = () => {
        if (openTimer.current) window.clearTimeout(openTimer.current);
        if (closeTimer.current) window.clearTimeout(closeTimer.current);
        openTimer.current = closeTimer.current = null;
    };

    const scheduleOpen = useCallback(() => {
        clearTimers();
        openTimer.current = window.setTimeout(() => {
            setMounted(true);
            setOpen(true);
        }, delay);
    }, [delay]);

    const scheduleClose = useCallback(() => {
        clearTimers();
        closeTimer.current = window.setTimeout(() => {
            setOpen(false);
            // allow animation frame before unmount if we later add exit animation
            window.setTimeout(() => setMounted(false), 120);
        }, closeDelay);
    }, [closeDelay]);

    useEffect(() => () => clearTimers(), []);

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            scheduleClose();
        }
    };

    const bgBase = 'bg-white/95 dark:bg-neutral-900/90';
    const ringBase = 'ring-1 ring-black/10 dark:ring-white/10';
    const animation = open ? 'opacity-100 scale-100' : 'opacity-0 scale-95';
    const arrowCommon = 'absolute w-2 h-2 rotate-45 ' + bgBase + ' ' + ringBase;
    const arrowPos: Record<string, string> = {
        top: 'top-full right-3 -mt-1',
        bottom: 'bottom-full right-3 -mb-1',
        left: 'left-full top-3 -ml-1',
        right: 'right-full top-3 -mr-1'
    };
    return (
        <span className="relative inline-flex">
            <button
                type="button"
                aria-describedby={open ? id : undefined}
                aria-haspopup="dialog"
                aria-expanded={open}
                onFocus={scheduleOpen}
                onBlur={scheduleClose}
                onMouseEnter={scheduleOpen}
                onMouseLeave={scheduleClose}
                onKeyDown={onKeyDown}
                className={"w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center bg-black/10 dark:bg-white/15 text-secondary hover:bg-black/20 dark:hover:bg-white/25 transition-colors focus:outline-none focus:ring-2 focus:ring-accent/60 shrink-0 " + (className || '')}
            >i<span className="sr-only">info</span></button>
            {mounted && (
                <span
                    id={id}
                    role="tooltip"
                    className={"pointer-events-none absolute z-50 whitespace-pre-line px-3 py-2 w-[260px] text-left text-[11px] leading-snug rounded-md shadow-lg text-neutral-900 dark:text-neutral-200 backdrop-blur-sm " +
                        bgBase + ' ' + ringBase + ' ' + pos[side] + ' ' + animation + ' transition-all duration-120 ease-out origin-center'}
                >
                    {t(tKey)}
                    <span aria-hidden className={arrowCommon + ' ' + arrowPos[side]} />
                </span>
            )}
        </span>
    );
};

export default InfoHint;
