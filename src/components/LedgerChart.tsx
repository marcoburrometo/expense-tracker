"use client";
import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { GlassPanel } from './GlassPanel';
import { useTracker } from '@/state/TrackerContext';
import { AnyExpense, RecurringExpenseTemplate, isTemplate } from '@/domain/types';
import { useMovementFilters } from '@/state/MovementFiltersContext';
import { useI18n } from '@/state/I18nContext';

interface Point { date: string; balance: number; projected?: boolean }

export const LedgerChart: React.FC = () => {
  const { expenses } = useTracker();
  const { from, to, includeProj, smooth, update, dir, category, q } = useMovementFilters();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const { t } = useI18n();

  // Base chronological items (actual only)
  const baseItems: (Exclude<AnyExpense, { type: 'recurring-template' }>)[] = useMemo(() => (
    expenses.filter(e => e.type !== 'recurring-template')
  ), [expenses]);

  const templates = useMemo(() => expenses.filter(isTemplate), [expenses]);

  const projectedInstances = useMemo(() => {
    if (!includeProj) return [] as { date: string; direction: 'in' | 'out'; amount: number; id: string }[];
    const toDate = new Date(to + 'T00:00:00');
    const today = new Date();
    if (toDate <= today) return [];
    const fromDate = new Date(from + 'T00:00:00');
    return buildProjections(templates, baseItems, fromDate, toDate);
  }, [includeProj, templates, baseItems, from, to]);

  interface ProjectedItem { id: string; date: string; direction: 'in' | 'out'; amount: number; templateId: string; description: string; category: string; }
  type ChronoItem = (Exclude<AnyExpense, { type: 'recurring-template' }>) | ProjectedItem;
  const allChrono = useMemo(() => {
    // projectedInstances currently are plain objects w/out templateId; keep empty templateId
    const projected: ProjectedItem[] = projectedInstances.map(p => ({
      id: p.id,
      date: p.date,
      direction: p.direction,
      amount: p.amount,
      templateId: '',
      description: '',
      category: '',
    }));
    const raw: ChronoItem[] = [...baseItems, ...projected];
    const text = q.trim().toLowerCase();
    return raw.filter(r => {
      const d = new Date(r.date);
      if (d < new Date(from + 'T00:00:00') || d > new Date(to + 'T23:59:59')) return false;
      if (dir !== 'all' && r.direction !== dir) return false;
      const catVal: string | undefined = r.category;
      if (category && catVal && catVal !== category) return false;
      if (text) {
        const descVal = r.description;
        const descLower = descVal.toLowerCase();
        const catLower = (catVal || '').toLowerCase();
        if (!(descLower.includes(text) || catLower.includes(text))) return false;
      }
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [baseItems, projectedInstances, from, to, dir, category, q]);

  const points: Point[] = useMemo(() => {
    // Preserve cumulative balance by adding baseline prior to filter 'from'
    const fromDate = new Date(from + 'T00:00:00');
    let baseline = 0;
    for (const e of baseItems) { // only real movements (baseItems excludes templates already)
      const d = new Date(e.date);
      if (d < fromDate) baseline += e.direction === 'in' ? e.amount : -e.amount;
    }
    let balance = baseline;
    return allChrono.map(e => {
      balance += e.direction === 'in' ? e.amount : -e.amount;
      return { date: e.date.slice(0, 10), balance, projected: e.id.startsWith('proj-') };
    });
  }, [allChrono, baseItems, from]);

  const smoothed = useMemo(() => {
    if (!smooth || points.length < 3) return points;
    const arr: Point[] = [];
    for (let i = 0; i < points.length; i++) {
      const w = points.slice(Math.max(0, i - 1), Math.min(points.length, i + 2));
      const avg = w.reduce((a, p) => a + p.balance, 0) / w.length;
      arr.push({ ...points[i], balance: avg });
    }
    return arr;
  }, [points, smooth]);

  const min = Math.min(0, ...smoothed.map(p => p.balance));
  const max = Math.max(0, ...smoothed.map(p => p.balance));
  const range = max - min || 1;

  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(entries => { for (const entry of entries) setWidth(entry.contentRect.width); });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const height = 280;

  const scaleX = useCallback((i: number) => (i / (smoothed.length - 1 || 1)) * width, [smoothed.length, width]);
  const scaleY = useCallback((v: number) => height - ((v - min) / range) * height, [height, min, range]);

  const pathActual = useMemo(() => {
    if (!smoothed.length) return '';
    return smoothed.map((p, i) => `${i ? 'L' : 'M'}${scaleX(i)},${scaleY(p.balance)}`).join(' ');
  }, [smoothed, scaleX, scaleY]);

  const areaPath = useMemo(() => {
    if (!smoothed.length) return '';
    const top = smoothed.map((p, i) => `${i ? 'L' : 'M'}${scaleX(i)},${scaleY(p.balance)}`).join(' ');
    return `${top} L${scaleX(smoothed.length - 1)},${scaleY(0)} L${scaleX(0)},${scaleY(0)} Z`;
  }, [smoothed, scaleX, scaleY]);

  // Trend on smoothed
  const trendLine = useMemo(() => {
    if (smoothed.length < 2) return '';
    const n = smoothed.length;
    const xs = smoothed.map((_, i) => i);
    const ys = smoothed.map(p => p.balance);
    const sumX = xs.reduce((a, b) => a + b, 0);
    const sumY = ys.reduce((a, b) => a + b, 0);
    const sumXY = xs.reduce((acc, x, i) => acc + x * ys[i], 0);
    const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);
    const denom = n * sumX2 - sumX * sumX || 1;
    const m = (n * sumXY - sumX * sumY) / denom;
    const c = (sumY - m * sumX) / n;
    const y0 = m * 0 + c;
    const yN = m * (n - 1) + c;
    return `M0,${scaleY(y0)} L${scaleX(n - 1)},${scaleY(yN)}`;
  }, [smoothed, scaleX, scaleY]);

  // Grid lines (horizontal: zero, min, max, maybe mid)
  const yTicks = useMemo(() => {
    const ticks = new Set<number>([min, 0, max]);
    if (range > 0) ticks.add(min + range / 2);
    return Array.from(ticks.values()).sort((a, b) => a - b);
  }, [min, max, range]);

  const months = useMemo(() => {
    const out: { idx: number; label: string }[] = [];
    let lastMonth = '';
    smoothed.forEach((p, i) => {
      const m = p.date.slice(0, 7);
      if (m !== lastMonth) { out.push({ idx: i, label: m }); lastMonth = m; }
    });
    return out;
  }, [smoothed]);

  // Tooltip data
  const hoverPoint = hoverIdx != null ? smoothed[hoverIdx] : null;

  function onMove(e: React.MouseEvent<SVGRectElement, MouseEvent>) {
    if (!smoothed.length) return;
    const rect = (e.currentTarget.parentNode as SVGSVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const rel = x / (width || 1);
    const idx = Math.round(rel * (smoothed.length - 1));
    setHoverIdx(Math.min(smoothed.length - 1, Math.max(0, idx)));
  }
  function onLeave() { setHoverIdx(null); }

  // GlassPanel's generic ref is HTMLElement; our ref is HTMLDivElement which is compatible.
  return (
    <GlassPanel ref={ref as React.Ref<HTMLDivElement> as unknown as React.Ref<HTMLElement>} variant="pure" className="p-4 space-y-3">
      <div className="flex flex-wrap gap-3 items-end text-xs">
        <label className="flex items-center gap-1 select-none cursor-pointer">
          <input type="checkbox" checked={includeProj} onChange={e => update({ includeProj: e.target.checked })} />
          <span className="text-xs">{t('chart.projections')}</span>
        </label>
        <label className="flex items-center gap-1 select-none cursor-pointer">
          <input type="checkbox" checked={smooth} onChange={e => update({ smooth: e.target.checked })} />
          <span className="text-xs">{t('chart.smooth')}</span>
        </label>
        <div className="ml-auto flex gap-4 text-neutral-500">
          <span className="hidden sm:inline">{t('chart.points')}: {points.length}</span>
          {points.length > 0 && <span>{t('chart.last')}: € {points[points.length - 1].balance.toFixed(2)}</span>}
        </div>
      </div>
      <div className="relative w-full overflow-hidden">
        <svg width={width} height={height} className="block">
          <defs>
            <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          {/* Grid */}
          {yTicks.map(v => {
            const y = scaleY(v);
            return <g key={v}>
              <line x1={0} y1={y} x2={width} y2={y} stroke={v === 0 ? 'var(--text-tertiary)' : 'var(--text-muted-strong)'} strokeDasharray={v === 0 ? '' : '4 4'} strokeWidth={v === 0 ? 1.2 : 1} />
              <text x={4} y={y - 2} fontSize={10} fill="var(--text-tertiary)">€ {v.toFixed(0)}</text>
            </g>;
          })}
          {/* Area + Line */}
          {areaPath && <path d={areaPath} fill="url(#areaGrad)" stroke="none" />}
          {pathActual && <path d={pathActual} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
          {trendLine && <path d={trendLine} fill="none" stroke="var(--text-warning)" strokeWidth={2} strokeDasharray="5 4" />}
          {/* Today line if in range */}
          {(() => { const todayStr = new Date().toISOString().slice(0, 10); const idx = points.findIndex(p => p.date === todayStr); if (idx > -1) { const x = scaleX(idx); return <line x1={x} y1={0} x2={x} y2={height} stroke="var(--text-warning)" strokeDasharray="4 3" />; } return null; })()}
          {/* Month ticks */}
          {months.map(m => {
            const x = scaleX(m.idx);
            return <g key={m.label}>
              <line x1={x} y1={height} x2={x} y2={height - 6} stroke="var(--text-tertiary)" />
              <text x={x + 2} y={height - 6} fontSize={9} fill="var(--text-tertiary)" transform={`rotate(-45 ${x + 2},${height - 6})`}>{m.label}</text>
            </g>;
          })}
          {/* Hover marker */}
          {hoverPoint && (() => { const i = hoverIdx!; const x = scaleX(i); const y = scaleY(hoverPoint.balance); return <g pointerEvents="none"> <circle cx={x} cy={y} r={4} fill="var(--accent-bold)" stroke="var(--text-inverse)" strokeWidth={2} /> <line x1={x} y1={0} x2={x} y2={height} stroke="var(--text-muted)" strokeDasharray="3 3" /> </g>; })()}
          <rect x={0} y={0} width={width} height={height} fill="transparent" onMouseMove={onMove} onMouseLeave={onLeave} />
        </svg>
        {hoverPoint && (() => {
          const x = scaleX(hoverIdx!);
          // clamp horizontally inside container with small padding
          const pad = 8;
          const clampedX = Math.min(Math.max(x, pad), width - pad);
          return (
            <div
              className="absolute pointer-events-none text-[10px] md:text-xs px-2 py-1 rounded-md backdrop-blur-md bg-white/55 dark:bg-slate-700/55 border border-white/50 dark:border-white/10 shadow-sm font-medium leading-tight select-none"
              style={{ left: clampedX, top: 6, transform: 'translateX(-50%)', zIndex: 20, maxWidth: 160 }}
            >
              <div className="font-mono tracking-tight">{hoverPoint.date}</div>
              <div className="font-semibold text-[11px] md:text-[12px]">€ {hoverPoint.balance.toFixed(2)}</div>
              {hoverPoint.projected && <div className="text-[10px] text-accent mt-0.5">{t('chart.projectionBadge')}</div>}
            </div>
          );
        })()}
      </div>
      <div className="mt-1 text-[11px] text-muted flex gap-4 flex-wrap">
        <span>{t('chart.min')}: € {min.toFixed(2)}</span>
        <span>{t('chart.max')}: € {max.toFixed(2)}</span>
        {points.length > 0 && <span>{t('chart.lastReal')}: € {points.filter(p => !p.projected).slice(-1)[0]?.balance.toFixed(2) || '—'}</span>}
        {includeProj && points.some(p => p.projected) && <span>{t('chart.lastProjected')}: € {points.slice(-1)[0].balance.toFixed(2)}</span>}
      </div>
    </GlassPanel>
  );
};

function buildProjections(templates: RecurringExpenseTemplate[], existing: (Exclude<AnyExpense, { type: 'recurring-template' }>)[], fromDate: Date, toDate: Date) {
  interface SimpleInstance { id: string; date: string; direction: 'in' | 'out'; amount: number; templateId: string }
  const existingDates = buildExistingMap(existing);
  const today = new Date();
  const out: SimpleInstance[] = [];
  for (const t of templates) {
    if (t.endDate && new Date(t.endDate) < fromDate) continue;
    const start = new Date(t.startDate);
    const push = (d: Date) => pushIfValid(d, t, { today, fromDate, toDate, existingDates, out });
    projectByFrequency(t, start, fromDate, toDate, push);
  }
  return out;
}

function buildExistingMap(existing: (Exclude<AnyExpense, { type: 'recurring-template' }>)[]) {
  const m = new Map<string, Set<string>>();
  for (const e of existing) if (e.type === 'recurring-instance') { let s = m.get(e.templateId); if (!s) { s = new Set(); m.set(e.templateId, s); } s.add(e.date.slice(0, 10)); }
  return m;
}
interface ProjectionOut { id: string; date: string; direction: 'in' | 'out'; amount: number; templateId: string }
function pushIfValid(d: Date, t: RecurringExpenseTemplate, ctx: { today: Date; fromDate: Date; toDate: Date; existingDates: Map<string, Set<string>>; out: ProjectionOut[] }) {
  const { today, fromDate, toDate, existingDates, out } = ctx;
  if (d < today || d < fromDate || d > toDate) return;
  if (t.endDate && d > new Date(t.endDate)) return;
  const iso = d.toISOString().slice(0, 10);
  if (existingDates.get(t.id)?.has(iso)) return;
  out.push({ id: `proj-${t.id}-${iso}`, date: iso, direction: t.direction, amount: t.amount, templateId: t.id });
}
function projectByFrequency(t: RecurringExpenseTemplate, start: Date, fromDate: Date, toDate: Date, push: (d: Date) => void) {
  switch (t.frequency) {
    case 'weekly':
      projectWeekly(start, fromDate, toDate, push);
      break;
    case 'monthly':
      projectMonthlyFreq(start, fromDate, toDate, push);
      break;
    case 'yearly':
      projectYearlyFreq(start, fromDate, toDate, push);
      break;
  }
}
function projectWeekly(start: Date, fromDate: Date, toDate: Date, push: (d: Date) => void) {
  let c = new Date(start);
  while (c < fromDate) c = new Date(c.getFullYear(), c.getMonth(), c.getDate() + 7);
  while (c <= toDate) { push(c); c = new Date(c.getFullYear(), c.getMonth(), c.getDate() + 7); }
}
function projectMonthlyFreq(start: Date, fromDate: Date, toDate: Date, push: (d: Date) => void) {
  const first = start > fromDate ? start : fromDate;
  let c = new Date(first.getFullYear(), first.getMonth(), 1);
  const day = start.getDate();
  while (c <= toDate) {
    const lastDay = new Date(c.getFullYear(), c.getMonth() + 1, 0).getDate();
    const occ = new Date(c.getFullYear(), c.getMonth(), Math.min(day, lastDay));
    if (occ >= start) push(occ);
    c = new Date(c.getFullYear(), c.getMonth() + 1, 1);
  }
}
function projectYearlyFreq(start: Date, fromDate: Date, toDate: Date, push: (d: Date) => void) {
  for (let y = Math.max(start.getFullYear(), fromDate.getFullYear()); y <= toDate.getFullYear(); y++) {
    const occ = new Date(y, start.getMonth(), start.getDate());
    if (occ >= start && occ <= toDate) push(occ);
  }
}