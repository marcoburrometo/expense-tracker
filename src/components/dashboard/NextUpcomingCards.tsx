"use client";
import React, { useMemo } from 'react';
import { useTracker } from '@/state/TrackerContext';
import { useI18n } from '@/state/I18nContext';
import { AnyExpense, isTemplate, isRecurringInstance } from '@/domain/types';
import { useCurrencyFormatter } from '@/lib/format';
import InfoHint from '@/components/InfoHint';

type ConcreteExpense = Exclude<AnyExpense, { type: 'recurring-template' }>;
interface UpcomingPair { nextExpense?: ConcreteExpense; nextIncome?: ConcreteExpense }

function selectUpcoming(expenses: AnyExpense[], nowISO: string): UpcomingPair {
    const now = new Date(nowISO);
    let nextExpense: ConcreteExpense | undefined;
    let nextIncome: ConcreteExpense | undefined;
    for (const e of expenses) {
        if (isTemplate(e)) continue; // only concrete entries (oneoff or recurring-instance)
        const concrete = e as ConcreteExpense;
        const d = new Date(concrete.date);
        if (d <= now) continue; // only future
        if (concrete.direction === 'out') {
            if (!nextExpense || d < new Date(nextExpense.date)) nextExpense = concrete;
        } else {
            if (!nextIncome || d < new Date(nextIncome.date)) nextIncome = concrete;
        }
    }
    return { nextExpense, nextIncome };
}

export const NextUpcomingCards: React.FC = () => {
    const { expenses } = useTracker();
    const { t } = useI18n();
    const fc = useCurrencyFormatter();
    const { nextExpense, nextIncome } = useMemo(() => selectUpcoming(expenses, new Date().toISOString()), [expenses]);
    if (!nextExpense && !nextIncome) return null;
    const box = 'flex-1 min-w-[140px] p-3 rounded-md bg-white/45 dark:bg-white/10 border border-white/40 dark:border-white/10 backdrop-blur-sm flex flex-col gap-1';
    const dateFmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
    const daysDiff = (iso: string) => {
        const today = new Date();
        const target = new Date(iso);
        const diff = Math.ceil((target.getTime() - today.setHours(0, 0, 0, 0)) / 86400000);
        return diff;
    };
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold tracking-wide uppercase text-secondary">{t('dashboard.nextExpense.title')} / {t('dashboard.nextIncome.title')}</h3>
                <div className="flex gap-1">
                    {nextExpense && <InfoHint tKey="dashboard.hint.nextExpense" side="top" />}
                    {nextIncome && <InfoHint tKey="dashboard.hint.nextIncome" side="top" />}
                </div>
            </div>
            <div className="flex flex-wrap gap-3">
                {nextExpense && (
                    <div className={box}>
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-danger">{t('dashboard.nextExpense.title')}</span>
                        <span className="text-sm font-medium tabular-nums">{fc(nextExpense.amount)}</span>
                        <div className="flex items-center justify-between text-[10px] text-tertiary tabular-nums">
                            <span>{dateFmt(nextExpense.date)}</span>
                            <span>{daysDiff(nextExpense.date)}{t('dashboard.daySuffix')}</span>
                        </div>
                        {isRecurringInstance(nextExpense) && <span className="text-[9px] px-1 py-0.5 rounded bg-black/10 dark:bg-white/15 text-secondary w-max">REC</span>}
                        <span className="text-[11px] text-secondary line-clamp-1">{nextExpense.description}</span>
                    </div>
                )}
                {nextIncome && (
                    <div className={box}>
                        <span className="text-[10px] uppercase tracking-wide font-semibold text-success">{t('dashboard.nextIncome.title')}</span>
                        <span className="text-sm font-medium tabular-nums">{fc(nextIncome.amount)}</span>
                        <div className="flex items-center justify-between text-[10px] text-tertiary tabular-nums">
                            <span>{dateFmt(nextIncome.date)}</span>
                            <span>{daysDiff(nextIncome.date)}{t('dashboard.daySuffix')}</span>
                        </div>
                        {isRecurringInstance(nextIncome) && <span className="text-[9px] px-1 py-0.5 rounded bg-black/10 dark:bg-white/15 text-secondary w-max">REC</span>}
                        <span className="text-[11px] text-secondary line-clamp-1">{nextIncome.description}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NextUpcomingCards;