"use client";
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: 'green' | 'red' | 'blue' | 'indigo' | 'neutral';
  hint?: string;
  icon?: React.ReactNode;
}

const accentMap: Record<NonNullable<StatCardProps['accent']>, string> = {
  green: 'from-emerald-500/80 to-emerald-400/60 text-emerald-800 dark:text-emerald-100',
  red: 'from-rose-500/80 to-rose-400/60 text-rose-800 dark:text-rose-100',
  blue: 'from-sky-500/80 to-sky-400/60 text-sky-800 dark:text-sky-100',
  indigo: 'from-indigo-500/80 to-indigo-400/60 text-indigo-800 dark:text-indigo-100',
  neutral: 'from-slate-400/70 to-slate-300/50 text-slate-800 dark:text-slate-50'
};

export const StatCard: React.FC<StatCardProps> = ({ label, value, accent='neutral', hint, icon }) => {
  return (
  <figure className="glass-stat relative overflow-hidden fade-in pressable">
      <div className={`absolute inset-0 -z-[1] bg-gradient-to-br ${accentMap[accent]}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{label}</span>
          <span className="text-lg font-semibold leading-tight tabular-nums">{typeof value === 'number' ? value.toLocaleString(undefined,{minimumFractionDigits:2, maximumFractionDigits:2}) : value}</span>
          {hint && <span className="text-[10px] mt-0.5 opacity-70 line-clamp-1">{hint}</span>}
        </div>
        {icon && <div className="text-base opacity-80">{icon}</div>}
      </div>
  </figure>
  );
};
