"use client";
import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: 'green' | 'red' | 'blue' | 'indigo' | 'neutral';
  hint?: string;
  icon?: React.ReactNode;
  size?: 'default' | 'compact';
  variant?: 'default' | 'flat';
  className?: string;
}

const accentMap: Record<NonNullable<StatCardProps['accent']>, string> = {
  green: 'from-emerald-500/80 to-emerald-400/60 text-inverse',
  red: 'from-rose-500/80 to-rose-400/60 text-inverse',
  blue: 'from-sky-500/80 to-sky-400/60 text-inverse',
  indigo: 'from-indigo-500/80 to-indigo-400/60 text-inverse',
  neutral: 'from-slate-400/70 to-slate-300/50 text-primary'
};

export const StatCard: React.FC<StatCardProps> = ({ label, value, accent = 'neutral', hint, icon, size = 'default', variant = 'default', className }) => {
  const sizeAttr = size === 'compact' ? { 'data-size': 'compact' } : undefined;
  const variantAttr = variant === 'flat' ? { 'data-variant': 'flat' } : undefined;
  return (
    <figure className={`glass-stat relative overflow-hidden fade-in pressable ${className || ''}`} {...sizeAttr} {...variantAttr}>
      {/* Accent gradient layer (soften with additional backdrop) */}
      <div className={`absolute inset-0 -z-[1] bg-gradient-to-br ${accentMap[accent]} opacity-90`} aria-hidden="true" />
      <div className="relative z-[2] flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-75 leading-none mb-1">{label}</span>
          <span className="text-lg font-semibold leading-snug tabular-nums tracking-tight">{typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}</span>
          {hint && <span className="text-[11px] mt-1 opacity-65 line-clamp-1">{hint}</span>}
        </div>
        {icon && <div className="text-base opacity-80 flex items-center justify-center translate-y-[1px]">{icon}</div>}
      </div>
    </figure>
  );
};
