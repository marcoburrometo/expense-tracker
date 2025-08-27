"use client";
import React from 'react';
import { GlassPanel } from '@/components/GlassPanel';
import { useI18n } from '@/state/I18nContext';
import Link from 'next/link';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="space-y-2">
        <h2 className="text-[11px] font-semibold tracking-[0.14em] uppercase text-accent/90">{title}</h2>
        <div className="prose prose-invert max-w-none text-[13px] leading-relaxed text-secondary/90 prose-p:my-0 prose-ul:my-0 prose-li:my-0">
            {children}
        </div>
    </section>
);

export default function AboutPage() {
    const { t } = useI18n();
    return (
        <div className="max-w-4xl mx-auto w-full px-4 md:px-6 py-6 md:py-10 flex flex-col gap-6 md:gap-8">
            <GlassPanel variant="subtle" className="p-6 md:p-8 space-y-6">
                <header className="space-y-3">
                    <h1 className="text-2xl md:text-3xl font-semibold tracking-tight glass-text-brand">{t('about.title')}</h1>
                    <p className="text-sm md:text-base text-secondary/80 max-w-2xl">{t('about.tagline')}</p>
                </header>
                <div className="grid gap-8 md:gap-10">
                    <Section title={t('about.section.who')}>
                        {t('about.who.body')}
                    </Section>
                    <Section title={t('about.section.value')}>
                        {t('about.value.points')}
                    </Section>
                    <Section title={t('about.section.pillars')}>
                        {t('about.pillars.list')}
                    </Section>
                    <Section title={t('about.section.trust')}>
                        {t('about.trust.body')}
                    </Section>
                    <Section title={t('about.section.collaboration')}>
                        {t('about.collaboration.body')}
                    </Section>
                    <Section title={t('about.section.feedback')}>
                        {t('about.feedback.body')}
                    </Section>
                    <Section title={t('about.section.cta')}>
                        {t('about.cta.body')}
                    </Section>
                    <Section title={t('about.section.license')}>
                        {t('about.license.body')}
                    </Section>
                </div>
                <div className="pt-4 flex flex-wrap gap-3">
                    <Link href="/" className="glass-button glass-button--sm" aria-label={t('about.back')}>
                        ← {t('about.back')}
                    </Link>
                    <a
                        href="https://github.com/marcoburrometo/expense-tracker"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="glass-button glass-button--sm"
                    >GitHub ↗</a>
                </div>
            </GlassPanel>
        </div>
    );
}
