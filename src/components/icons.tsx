"use client";
import React from 'react';

const base = 'w-4 h-4 stroke-current';

export const IconArrowUp: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={`${base} ${className || ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5" />
        <path d="M5 12l7-7 7 7" />
    </svg>
);

export const IconArrowDown: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={`${base} ${className || ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" />
        <path d="M19 12l-7 7-7-7" />
    </svg>
);

export const IconBalance: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={`${base} ${className || ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4v16" />
        <path d="M6 8h12" />
        <path d="M8 8l-3.5 7H11L8 8z" />
        <path d="M16 8l-3 7h6l-3-7z" />
        <path d="M9 20h6" />
    </svg>
);

export const IconGrid: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={`${base} ${className || ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
    </svg>
);

export const IconLoop: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={`${base} ${className || ''}`} viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 13a8 8 0 0 1-8 7 8 8 0 0 1-6.6-3.4" />
        <path d="M3 11a8 8 0 0 1 8-7 8 8 0 0 1 6.6 3.4" />
        <path d="M16 16h5v5" />
        <path d="M8 8H3V3" />
    </svg>
);
