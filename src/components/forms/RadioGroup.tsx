"use client";
import React from 'react';

export interface RadioOption<T extends string> {
    value: T;
    label: React.ReactNode;
    disabled?: boolean;
    hint?: React.ReactNode;
}

interface RadioGroupProps<T extends string> {
    name: string;
    value: T;
    onChange: (v: T) => void;
    options: RadioOption<T>[];
    className?: string;
    ariaLabel?: string;
    inline?: boolean;
}

// Accessible radio group using native inputs but styled wrapper.
export function RadioGroup<T extends string>({ name, value, onChange, options, className = '', ariaLabel, inline = true }: RadioGroupProps<T>) {
    return (
        <div role="radiogroup" aria-label={ariaLabel} className={className + ' flex ' + (inline ? 'flex-row gap-4' : 'flex-col gap-2')}> {
            options.map(opt => {
                const id = `${name}-${opt.value}`;
                return (
                    <label key={opt.value} htmlFor={id} className={`flex items-center gap-1 cursor-pointer text-[12px] md:text-sm select-none ${opt.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>            <input
                        type="radio"
                        id={id}
                        name={name}
                        value={opt.value}
                        disabled={opt.disabled}
                        checked={value === opt.value}
                        onChange={() => onChange(opt.value)}
                        className="peer hidden"
                    />
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors duration-300 text-[10px]
              ${value === opt.value ? 'border-[var(--accent)] bg-[var(--accent)] text-white shadow-inner' : 'border-neutral-400/60 dark:border-neutral-500/50 bg-white/40 dark:bg-neutral-700/40'}
              peer-focus-visible:outline peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)]
            `}
                            aria-hidden
                        >{value === opt.value ? '•' : ''}</span>
                        <span className="flex flex-col">
                            <span className="leading-tight font-medium">{opt.label}</span>
                            {opt.hint && <span className="text-[10px] opacity-60 -mt-0.5">{opt.hint}</span>}
                        </span>
                    </label>
                );
            })
        }</div>
    );
}
