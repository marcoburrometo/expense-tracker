"use client";
import React from 'react';

interface ToggleSwitchProps {
    checked: boolean;
    onChange: (next: boolean) => void;
    label?: React.ReactNode; // visible label
    ariaLabel?: string; // if no visible label
    disabled?: boolean;
    size?: 'sm' | 'md';
    id?: string;
    onIcon?: React.ReactNode;
    offIcon?: React.ReactNode;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, label, ariaLabel, disabled, size = 'md', id, onIcon, offIcon }) => {
    const reactId = React.useId();
    const _id = id ?? reactId;
    const isSm = size === 'sm';
    const trackClasses = isSm ? 'h-5 w-9' : 'h-6 w-11';
    const knobClasses = isSm ? 'h-3.5 w-3.5' : 'h-4 w-4';
    // Pixel translate (instead of translate-x-full) to avoid overflow glitch & ensure precise centering
    const translate = isSm ? (checked ? 'translate-x-4' : 'translate-x-0') : (checked ? 'translate-x-5' : 'translate-x-0');
    const hasVisibleLabel = !!label;
    return (
        <label htmlFor={_id} className={`inline-flex items-center gap-2 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <span
                className={`relative inline-flex ${trackClasses} p-0.5 rounded-full transition-colors duration-300 border focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2 focus-within:ring-offset-transparent outline-none ${checked ? 'bg-[var(--accent)] border-[var(--accent)]' : 'bg-white/40 dark:bg-neutral-700/40 border-neutral-400/50 dark:border-neutral-600/50'} shadow-sm`}
                role="switch"
                aria-checked={checked}
                aria-label={!hasVisibleLabel ? ariaLabel : undefined}
            >
                <input
                    id={_id}
                    type="checkbox"
                    className="sr-only peer"
                    checked={checked}
                    disabled={disabled}
                    onChange={e => onChange(e.target.checked)}
                />
                <span
                    className={`absolute top-1/2 -translate-y-1/2 ${knobClasses} rounded-full bg-white dark:bg-neutral-200 shadow transition-transform duration-300 ease-out flex items-center justify-center text-[10px] ${translate}`}
                >{checked ? onIcon : offIcon}</span>
            </span>
            {label && <span className="text-[11px] md:text-[12px] font-medium leading-none" id={`${_id}-label`}>{label}</span>}
        </label>
    );
};

interface CycleToggleProps<T extends string> {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: React.ReactNode; title?: string }[];
    ariaLabel?: string;
    className?: string;
    size?: 'xs' | 'sm' | 'md';
}

export function CycleToggle<T extends string>({ value, onChange, options, ariaLabel, className = '', size = 'sm' }: CycleToggleProps<T>) {
    const order = options.map(o => o.value);
    const idx = order.indexOf(value);
    const next = order[(idx + 1) % order.length];
    const current = options.find(o => o.value === value);
    const height = size === 'xs' ? 'h-6 text-[10px]' : size === 'sm' ? 'h-7 text-[11px]' : 'h-8 text-[12px]';
    return (
        <button
            type="button"
            aria-label={ariaLabel}
            title={current?.title as string | undefined}
            onClick={() => onChange(next)}
            className={`glass-button glass-button--xs glass-button--anim micro-press-anim inline-flex items-center justify-center px-2 ${height} ${className}`}
            data-active
        >
            <span key={value} className="icon-pop-fade inline-flex items-center gap-1">{current?.label}</span>
        </button>
    );
}
