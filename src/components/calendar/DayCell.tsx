"use client";
import React from 'react';
import { DayBucket, isSyntheticInstance } from '@/components/calendarTypes';
import { AnyExpense } from '@/domain/types';

export interface DayCellProps {
  date: Date | null;
  bucket?: DayBucket;
  onOpenDay: (day: string) => void;
  fmt: (d: Date) => string;
  density?: 'normal' | 'compact';
}

export const DayCell: React.FC<DayCellProps> = ({ date, bucket, onOpenDay, fmt, density = 'normal' }) => {
  if (!date) {
    return <div className="opacity-0" aria-hidden />; // spacer keeps grid structure
  }
  const key = fmt(date);
  const total = bucket ? bucket.in - bucket.out : 0;
  const isToday = key === fmt(new Date());
  const magnitude = bucket ? bucket.out + bucket.in : 0;
  const intensity = Math.min(1, magnitude / 500);
  const bgExtra = bucket ? 'after:absolute after:inset-0 after:rounded-lg after:pointer-events-none after:mix-blend-overlay' : '';
  // Neutral, intensity-based background (removes green/red radial gradient)
  // Softer accent overlay using CSS var accent-rgb; reduced alpha scaling for a more delicate look in both themes
  const accentAlpha = +(0.04 + 0.18 * intensity).toFixed(3);
  const style: React.CSSProperties | undefined = bucket ? {
    background: `linear-gradient(150deg, rgba(255,255,255,0.60), rgba(255,255,255,0.22)), rgba(var(--accent-rgb)/${accentAlpha})`,
    boxShadow: intensity > 0 ? `0 0 0 1px rgba(255,255,255,0.35), 0 4px 14px -6px rgba(0,0,0,${(0.18 + 0.25 * intensity).toFixed(3)})` : undefined,
    backdropFilter: 'blur(6px)'
  } : undefined;
  return (
    <button
      type="button"
      onClick={() => onOpenDay(key)}
      style={style}
      role="gridcell"
      data-today={isToday || undefined}
      data-has-data={bucket ? true : undefined}
      className={`cal-day-btn relative text-left p-1 rounded-lg glass-panel glass-panel--subtle overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/70 group transition-all duration-150 hover:shadow-[0_4px_14px_-2px_rgba(0,0,0,0.35)] ${isToday ? 'ring-2 ring-accent/70 shadow-[0_0_0_2px_rgba(99,102,241,0.4)]' : ''} ${bgExtra}`}
      aria-label={`Giorno ${date.getDate()} con ${bucket ? bucket.items.length : 0} movimenti`}
    >
      <div className="flex justify-between items-start mb-0.5 gap-1">
        <span
          className={`inline-flex items-center justify-center font-semibold leading-none select-none transition-colors duration-150
            ${isToday
              ? 'text-neutral-900 bg-indigo-300/90 dark:bg-indigo-300/90 shadow px-2 py-0.5 rounded-md text-[12px]'
              : 'text-neutral-900 px-1.5 py-0.5 rounded-md text-[11px] md:text-[12px] bg-white/55 dark:bg-white/55 backdrop-blur-sm'}
          `}
        >{date.getDate()}</span>
        {bucket && <span className={`mt-0.5 text-[10px] font-mono ${total >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{total >= 0 ? '+' : '-'}€ {Math.abs(total).toFixed(0)}</span>}
      </div>
      <div className="flex flex-col gap-0.5 overflow-hidden relative flex-1 pr-0.5">
        <div className={`overflow-y-auto glass-scroll pr-0.5 cal-day-scroll ${density === 'compact' ? 'scrollbar-thin' : ''}`}>
          {bucket?.items.slice(0, 5).map((e: AnyExpense) => {
            const synthetic = isSyntheticInstance(e);
            return (
              <div key={e.id} className="text-[9px] truncate flex justify-between gap-1">
                <span className="flex-1 truncate">
                  {e.description}
                  {synthetic && <span className="ml-0.5 inline-block px-1 rounded cal-badge-synth text-[7px] leading-none">S</span>}
                </span>
                <span className={e.direction === 'in' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>{e.direction === 'in' ? '+' : '-'}{e.amount.toFixed(0)}</span>
              </div>
            );
          })}
        </div>
        {bucket && bucket.items.length > 5 && <div className="text-[9px] opacity-60 mt-auto">+{bucket.items.length - 5} altri</div>}
        {bucket && bucket.items.length > 5 && <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-5 bg-gradient-to-t from-neutral-200/70 dark:from-neutral-900/70 to-transparent" />}
        {/* Stacked bar (in/out composition) */}
        {bucket && (
          <div className="absolute left-0 right-0 bottom-0 h-1.5 flex overflow-hidden rounded-b-md">
            <div style={{ width: (bucket.in / (magnitude || 1)) * 100 + '%' }} className="bg-green-500/70 transition-all" />
            <div style={{ width: (bucket.out / (magnitude || 1)) * 100 + '%' }} className="bg-red-500/70 transition-all" />
          </div>
        )}
      </div>
    </button>
  );
};
