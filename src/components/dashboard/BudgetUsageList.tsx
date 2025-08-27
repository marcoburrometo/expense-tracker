"use client";
import React from 'react';
import { useDashboardMetrics } from '@/state/useDashboardMetrics';
import { useCurrencyFormatter } from '@/lib/format';
import { useI18n } from '@/state/I18nContext';
import InfoHint from '@/components/InfoHint';

export const BudgetUsageList: React.FC = () => {
    const { t } = useI18n();
    const metrics = useDashboardMetrics();
    const fc = useCurrencyFormatter();
    if (!metrics.budgetUsage.length) return null;
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide uppercase text-secondary">{t('dashboard.budget.title')}</h3>
                <InfoHint tKey="dashboard.hint.budgetUsage" side="top" />
            </div>
            <ul className="flex flex-col gap-2">
                {metrics.budgetUsage.map(b => {
                    const pct = Math.min(1, b.pct);
                    const pctLabel = (pct * 100).toFixed(0) + '%';
                    const barColor = pct >= 1 ? 'bg-danger' : pct >= .9 ? 'bg-warning' : b.pace === 'fast' ? 'bg-accent' : 'bg-success';
                    return (
                        <li key={b.budgetId} className="flex flex-col gap-1 p-2 rounded-md bg-white/40 dark:bg-white/10 border border-white/40 dark:border-white/10 backdrop-blur-sm">
                            <div className="flex items-center justify-between gap-2 text-[11px] font-medium"><span className="truncate">{b.category || t('dashboard.category.uncategorized')}</span><span className="tabular-nums text-secondary">{pctLabel}</span></div>
                            <div className="h-2 w-full rounded bg-black/5 dark:bg-white/10 overflow-hidden relative">
                                <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: pct * 100 + '%' }} />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-tertiary tabular-nums">
                                <span>{fc(b.spent)} / {fc(b.limit)}</span>
                                {b.pace === 'fast' && pct < 0.9 && <span className="text-warning">{t('dashboard.budget.fastPace')}</span>}
                                {pct >= .9 && pct < 1 && <span className="text-warning">{t('dashboard.budget.near')}</span>}
                                {pct >= 1 && <span className="text-danger">{t('dashboard.budget.over')}</span>}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};
