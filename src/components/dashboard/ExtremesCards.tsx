"use client";
import React from 'react';
import { useDashboardMetrics } from '@/state/useDashboardMetrics';
import { useCurrencyFormatter } from '@/lib/format';
import { useI18n } from '@/state/I18nContext';
import InfoHint from '@/components/InfoHint';

export const ExtremesCards: React.FC = () => {
    const { extremes } = useDashboardMetrics();
    const fc = useCurrencyFormatter();
    const { t } = useI18n();
    if (!extremes.maxExpense && !extremes.maxIncome) return null;
    const cardBase = 'flex-1 min-w-[130px] p-3 rounded-md bg-white/45 dark:bg-white/10 border border-white/40 dark:border-white/10 backdrop-blur-sm flex flex-col gap-1';
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide uppercase text-secondary">{t('dashboard.maxExpense')} / {t('dashboard.maxIncome')}</span>
                <InfoHint tKey="dashboard.hint.extremes" side="top" />
            </div>
            <div className="flex flex-wrap gap-3">
                {extremes.maxExpense && (
                    <div className={cardBase}>
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-danger">{t('dashboard.maxExpense')}</span>
                        <span className="text-sm font-medium tabular-nums">{fc(extremes.maxExpense.amount)}</span>
                        <span className="text-[11px] text-tertiary line-clamp-1">{extremes.maxExpense.description}</span>
                    </div>
                )}
                {extremes.maxIncome && (
                    <div className={cardBase}>
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-success">{t('dashboard.maxIncome')}</span>
                        <span className="text-sm font-medium tabular-nums">{fc(extremes.maxIncome.amount)}</span>
                        <span className="text-[11px] text-tertiary line-clamp-1">{extremes.maxIncome.description}</span>
                    </div>
                )}
            </div>
        </div>
    );
};
