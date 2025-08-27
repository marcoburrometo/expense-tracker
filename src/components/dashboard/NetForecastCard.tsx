"use client";
import React from 'react';
import { useDashboardMetrics } from '@/state/useDashboardMetrics';
import { useCurrencyFormatter } from '@/lib/format';
import { useI18n } from '@/state/I18nContext';
import InfoHint from '@/components/InfoHint';

export const NetForecastCard: React.FC = () => {
    const metrics = useDashboardMetrics();
    useI18n(); // ensure re-render on locale change (labels are minimal static here)
    const fc = useCurrencyFormatter();
    const { netDelta, net } = { netDelta: metrics.netDelta, net: metrics.net };
    const mom = netDelta.momPct;
    const momLabel = mom !== undefined ? (mom * 100).toFixed(0) + '%' : '—';
    // Simple projection: assume linear pace of net vs elapsed days
    const daysElapsed = (Date.now() - metrics.monthStart.getTime()) / 86400000 + 1;
    const daysInMonth = metrics.monthEnd.getDate();
    const pace = net / Math.max(1, daysElapsed);
    const projected = pace * daysInMonth;
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide uppercase text-secondary">Net</h3>
                <InfoHint tKey="dashboard.hint.netForecast" side="top" />
            </div>
            <div className="p-3 rounded-md bg-white/45 dark:bg-white/10 border border-white/40 dark:border-white/10 backdrop-blur-sm flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm font-medium tabular-nums">
                    <span>{fc(net)}</span>
                    <span className={mom !== undefined ? (mom >= 0 ? 'text-success' : 'text-danger') : 'text-tertiary'}>{momLabel}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-tertiary tabular-nums">
                    <span>Proj.</span>
                    <span>{fc(projected)}</span>
                </div>
                <div className="h-1.5 w-full bg-black/5 dark:bg-white/10 rounded overflow-hidden">
                    <div className="h-full bg-accent" style={{ width: Math.min(100, Math.abs(net) > 0 ? (net / projected) * 100 : 0) + '%' }} />
                </div>
            </div>
        </div>
    );
};

export default NetForecastCard;
