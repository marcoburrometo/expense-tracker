"use client";
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { GlassPanel } from './GlassPanel';
import { useI18n } from '@/state/I18nContext';

interface DatePickerProps {
    value: string; // YYYY-MM-DD
    onChange: (val: string) => void;
    min?: string; // YYYY-MM-DD
    max?: string; // YYYY-MM-DD
    disabled?: boolean;
    className?: string;
    id?: string;
    ariaLabel?: string;
}

// Utility
function parseISO(d: string) { const [y, m, da] = d.split('-').map(Number); return new Date(y, m - 1, da); }
function fmt(d: Date) { return d.toISOString().slice(0, 10); }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, min, max, disabled, className, id, ariaLabel }) => {
    const { t } = useI18n();
    const selected = React.useMemo(() => (value ? parseISO(value) : new Date()), [value]);
    const [open, setOpen] = useState(false);
    const [view, setView] = useState(() => startOfMonth(selected));
    const [focusDay, setFocusDay] = useState<Date>(() => selected);
    const popRef = useRef<HTMLDivElement | null>(null);
    const btnRef = useRef<HTMLButtonElement | null>(null);
    const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);

    // Measure button for portal positioning
    const updatePosition = useCallback(() => {
        if (!btnRef.current) return;
        const r = btnRef.current.getBoundingClientRect();
        setCoords({ top: r.bottom + 8, left: r.left, width: r.width });
    }, []);

    // Open side-effects: measure + listeners
    useEffect(() => {
        if (!open) return;
        updatePosition();
        function onDoc(e: MouseEvent) {
            if (popRef.current && !popRef.current.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) setOpen(false);
        }
        function onKey(e: KeyboardEvent) { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } }
        function onScroll() { updatePosition(); }
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', onScroll, true);
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', onScroll, true);
            document.removeEventListener('mousedown', onDoc);
            document.removeEventListener('keydown', onKey);
        };
    }, [open, updatePosition]);

    const canSelect = useCallback((d: Date) => {
        if (min && d < parseISO(min)) return false;
        if (max && d > parseISO(max)) return false;
        return true;
    }, [min, max]);

    function changeMonth(delta: number, preserveFocusedDay = true) {
        setView(v => {
            const next = new Date(v.getFullYear(), v.getMonth() + delta, 1);
            if (preserveFocusedDay) {
                setFocusDay(fd => new Date(next.getFullYear(), next.getMonth(), Math.min(fd.getDate(), endOfMonth(next).getDate())));
            }
            return next;
        });
    }
    function selectDay(d: Date) { if (!canSelect(d)) return; onChange(fmt(d)); setOpen(false); btnRef.current?.focus(); }

    const monthStart = startOfMonth(view);
    const monthEnd = endOfMonth(view);
    const firstWeekday = monthStart.getDay(); // 0=Sun
    const days: (Date | null)[] = [];
    // fill leading blanks (convert to Monday-first? We'll keep locale aware quickly: show Mon..Sun ordering customizing header)
    // We'll adopt Monday-first grid: transform JS Sunday(0)->7 and compute offset
    const offset = (firstWeekday + 6) % 7; // Monday=0
    for (let i = 0; i < offset; i++) days.push(null);
    for (let d = 1; d <= monthEnd.getDate(); d++) days.push(new Date(view.getFullYear(), view.getMonth(), d));
    while (days.length % 7 !== 0) days.push(null);

    const weekdayKeys = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;

    // Ensure focusDay always inside current view month when view changes externally (selected change)
    useEffect(() => {
        if (focusDay.getMonth() !== view.getMonth() || focusDay.getFullYear() !== view.getFullYear()) {
            setFocusDay(new Date(view.getFullYear(), view.getMonth(), 1));
        }
    }, [view, focusDay]);

    // When opening, move focusDay to selected else today if in view else first
    useEffect(() => {
        if (open) {
            const today = new Date();
            let target: Date;
            if (selected && selected.getMonth() === view.getMonth() && selected.getFullYear() === view.getFullYear()) target = selected;
            else if (today.getMonth() === view.getMonth() && today.getFullYear() === view.getFullYear()) target = today;
            else target = new Date(view.getFullYear(), view.getMonth(), 1);
            setFocusDay(target);
        }
    }, [open, view, selected]);

    function moveFocus(daysDelta: number) {
        setFocusDay(fd => {
            const next = new Date(fd.getFullYear(), fd.getMonth(), fd.getDate() + daysDelta);
            // If month changed, update view too
            if (next.getMonth() !== view.getMonth() || next.getFullYear() !== view.getFullYear()) {
                setView(startOfMonth(next));
            }
            return next;
        });
    }

    function onGridKey(e: React.KeyboardEvent<HTMLDivElement>) {
        switch (e.key) {
            case 'ArrowLeft': e.preventDefault(); moveFocus(-1); break;
            case 'ArrowRight': e.preventDefault(); moveFocus(1); break;
            case 'ArrowUp': e.preventDefault(); moveFocus(-7); break;
            case 'ArrowDown': e.preventDefault(); moveFocus(7); break;
            case 'PageUp': e.preventDefault(); changeMonth(-1); break;
            case 'PageDown': e.preventDefault(); changeMonth(1); break;
            case 'Home': e.preventDefault(); setFocusDay(fd => new Date(fd.getFullYear(), fd.getMonth(), 1)); break;
            case 'End': e.preventDefault(); setFocusDay(fd => new Date(fd.getFullYear(), fd.getMonth(), endOfMonth(fd).getDate())); break;
            case 'Enter':
            case ' ': {
                e.preventDefault(); selectDay(focusDay); break;
            }
            case 'Escape': setOpen(false); btnRef.current?.focus(); break;
        }
    }

    return (
        <div className={`relative inline-block ${className || ''}`} id={id} data-date-picker>
            <button
                ref={btnRef}
                type="button"
                disabled={disabled}
                className={`glass-input text-left flex items-center gap-2 pr-2 cursor-pointer ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                aria-haspopup="dialog"
                aria-expanded={open}
                aria-label={ariaLabel || t('form.date')}
                onClick={() => setOpen(o => !o)}
            >
                <span className="font-mono tracking-tight text-sm flex-1">{value || '—'}</span>
                <span className="text-[10px] opacity-60">▾</span>
            </button>
            {open && coords && createPortal(
                <GlassPanel
                    ref={(el) => { popRef.current = el as HTMLDivElement | null; }}
                    role="dialog"
                    aria-label={t('form.date')}
                    variant="subtle"
                    className="shadow-lg animate-in fade-in p-2 rounded-lg"
                    style={{ position: 'fixed', top: coords.top, left: coords.left, minWidth: Math.max(240, coords.width), zIndex: 1000, width: 'auto' }}
                >
                    <div className="flex items-center justify-between mb-2 text-[11px] font-medium select-none">
                        <button type="button" className="glass-button glass-button--xs" onClick={() => changeMonth(-1)} aria-label={t('calendar.prevMonth')}>←</button>
                        <span className="px-2">{t(`month.${view.getMonth()}`)} {view.getFullYear()}</span>
                        <button type="button" className="glass-button glass-button--xs" onClick={() => changeMonth(1)} aria-label={t('calendar.nextMonth')}>→</button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold mb-1 opacity-70">
                        {weekdayKeys.map(k => <div key={k} className="text-center uppercase">{t(`weekday.${k}`)}</div>)}
                    </div>
                    <div
                        className="grid grid-cols-7 gap-1 text-[12px] outline-none"
                        role="grid"
                        aria-readonly="false"
                        onKeyDown={onGridKey}
                        tabIndex={0}
                    >
                        {days.map((d, i) => {
                            if (!d) return <div key={i} className="h-8" />;
                            const iso = fmt(d);
                            const isSel = value === iso;
                            const today = new Date();
                            const isToday = d.toDateString() === today.toDateString();
                            const disabledDay = !canSelect(d);
                            const base = 'relative h-8 w-8 flex items-center justify-center rounded-md font-medium transition-colors outline-none';
                            const selCls = isSel ? 'bg-accent text-dark dark:text-white shadow-sm' : 'hover:bg-accent/15';
                            const todayRing = isToday && !isSel ? 'ring-1 ring-accent/60' : '';
                            const focusCls = isSel ? 'ring-2 ring-offset-1 ring-accent ring-offset-transparent' : '';
                            const disabledCls = disabledDay ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : 'cursor-pointer';
                            return (
                                <button
                                    key={i}
                                    type="button"
                                    role="gridcell"
                                    tabIndex={isSel ? 0 : -1}
                                    onClick={() => selectDay(d)}
                                    onFocus={() => setFocusDay(d)}
                                    disabled={disabledDay}
                                    className={[base, selCls, todayRing, focusCls, disabledCls].filter(Boolean).join(' ')}
                                    aria-selected={isSel}
                                    aria-label={iso + (isToday ? ' (today)' : '')}
                                    data-today={isToday || undefined}
                                    data-selected={isSel || undefined}
                                >
                                    {d.getDate()}
                                    {isToday && !isSel && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" aria-hidden="true" />}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-2 text-[10px]">
                        <button type="button" className="glass-button glass-button--xs" onClick={() => { const tdy = new Date(); setView(startOfMonth(tdy)); onChange(fmt(tdy)); setOpen(false); btnRef.current?.focus(); }}>{t('date.today')}</button>
                        <button type="button" className="glass-button glass-button--xs" onClick={() => setOpen(false)}>{t('generic.close') || '×'}</button>
                    </div>
                </GlassPanel>, document.body)
            }
        </div>
    );
};
