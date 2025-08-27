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
  softGradient?: boolean; // reduces gradient intensity
}

// NOTE i18n: This component is intentionally "dumb" – callers should pass an already-translated
// label and hint (e.g. use const { t } = useI18n(); <StatCard label={t('stats.balance')} ... /> )
// so we avoid coupling this primitive with i18n context and keep it reusable in non-i18n contexts.

const accentMap: Record<NonNullable<StatCardProps['accent']>, string> = {
  green: 'from-emerald-500/70 to-emerald-400/50 text-inverse',
  red: 'from-rose-500/70 to-rose-400/50 text-inverse',
  blue: 'from-sky-500/70 to-sky-400/50 text-inverse',
  indigo: 'from-indigo-500/70 to-indigo-400/50 text-inverse',
  neutral: 'from-slate-400/60 to-slate-300/40 text-primary'
};

export const StatCard: React.FC<StatCardProps> = ({ label, value, accent = 'neutral', hint, icon, size = 'default', variant = 'default', className, softGradient }) => {
  const sizeAttr = size === 'compact' ? { 'data-size': 'compact' } : undefined;
  const variantAttr = variant === 'flat' ? { 'data-variant': 'flat' } : undefined;
  const gradientLayer = `${accentMap[accent]} ${softGradient ? 'opacity-65' : 'opacity-90'}`;
  return (
    <figure className={`glass-stat relative overflow-hidden fade-in pressable transition-shadow duration-300 ${className || ''}`} {...sizeAttr} {...variantAttr}>
      <div className={`absolute inset-0 -z-[1] bg-gradient-to-br ${gradientLayer}`} aria-hidden="true" />
      <div className="absolute inset-0 -z-[2] backdrop-blur-[2px]" aria-hidden="true" />
      <div className="relative z-[2] flex items-start justify-between gap-3 min-h-[70px] p-1.5 data-[size=compact]:min-h-[68px] data-[size=compact]:p-1">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80 leading-none mb-1 select-none data-[size=compact]:text-[9px] data-[size=compact]:mb-0.5">{label}</span>
          <span className="text-xl font-semibold leading-tight tabular-nums tracking-tight drop-shadow-sm data-[size=compact]:text-base data-[size=compact]:leading-snug">
            {typeof value === 'number' ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : value}
          </span>
          {hint && <span className="text-[11px] mt-1 opacity-70 line-clamp-1 leading-snug data-[size=compact]:text-[10px] data-[size=compact]:mt-0.5">{hint}</span>}
        </div>
        {icon && <div className="text-base opacity-85 flex items-center justify-center translate-y-[1px] drop-shadow-sm data-[size=compact]:text-sm">{icon}</div>}
      </div>
    </figure>
  );
};
