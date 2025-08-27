"use client";
import React from 'react';
import { useDashboardMetrics } from '@/state/useDashboardMetrics';
import { useCurrencyFormatter } from '@/lib/format';
import { useI18n } from '@/state/I18nContext';
import InfoHint from '@/components/InfoHint';

export const TopCategories: React.FC = () => {
    const metrics = useDashboardMetrics();
    const { t } = useI18n();
    const fc = useCurrencyFormatter();
    if (!metrics.topCategories.length) return null;
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide uppercase text-secondary">{t('dashboard.topCategories.title')}</h3>
                <InfoHint tKey="dashboard.hint.topCategories" side="top" />
            </div>
            <ul className="flex flex-col divide-y divide-white/20 dark:divide-white/5 rounded-md overflow-hidden">
                {metrics.topCategories.map(c => (
                    <li key={c.category} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-[11px] py-1.5 px-1 first:pt-0 last:pb-0">
                        <span className="truncate text-secondary">{c.category || t('dashboard.category.uncategorized')}</span>
                        <span className="tabular-nums font-medium text-right min-w-[70px]">{fc(c.amount)}</span>
                        <span className="text-tertiary tabular-nums text-right w-[42px]">{(c.pct * 100).toFixed(1)}%</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};
