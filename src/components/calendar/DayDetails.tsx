"use client";
import React from 'react';
import { AnyExpense } from '@/domain/types';
import { DayBucket, isSyntheticInstance } from '@/components/calendarTypes';

export interface DayDetailsProps {
  activeDay: string;
  buckets: Map<string, DayBucket>;
  sortBy: 'date'|'amount';
  viewMode: 'list'|'category';
  setSortBy: React.Dispatch<React.SetStateAction<'date'|'amount'>>;
  setViewMode: React.Dispatch<React.SetStateAction<'list'|'category'>>;
  getExpenseDate: (e: AnyExpense)=> string;
}

export const DayDetails: React.FC<DayDetailsProps> = ({ activeDay, buckets, sortBy, viewMode, setSortBy, setViewMode, getExpenseDate }) => {
  const bucket = buckets.get(activeDay);
  if(!bucket) return <div className="text-[11px] opacity-60">Nessun movimento</div>;
  const totalIn = bucket.in;
  const totalOut = bucket.out;
  const net = totalIn - totalOut;
  const items = [...bucket.items];
  if(sortBy==='amount') items.sort((a,b)=> b.amount - a.amount); else items.sort((a,b)=> getExpenseDate(a).localeCompare(getExpenseDate(b)));
  const grouped = items.reduce<Record<string,{in:number;out:number;count:number}>>((acc,e)=> {
    acc[e.category] ||= {in:0,out:0,count:0};
    if(e.direction==='in') acc[e.category].in += e.amount; else acc[e.category].out += e.amount;
    acc[e.category].count++;
    return acc;
  }, {});
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3 text-[11px]">
        <span>Entrate <strong className="text-green-600">€ {totalIn.toFixed(2)}</strong></span>
        <span>Uscite <strong className="text-red-600">€ {totalOut.toFixed(2)}</strong></span>
        <span>Saldo <strong className={net>=0?'text-green-600':'text-red-600'}>{net>=0?'+':'-'}€ {Math.abs(net).toFixed(2)}</strong></span>
        <div className="ml-auto flex gap-1">
          <button type="button" onClick={()=> setSortBy(s=> s==='date'?'amount':'date')} className="glass-button glass-button--xs" aria-label="Toggle ordinamento">Ordina: {sortBy==='date'?'Data':'Importo'}</button>
          <button type="button" onClick={()=> setViewMode(v=> v==='list'?'category':'list')} className="glass-button glass-button--xs" aria-label="Toggle vista">Vista: {viewMode==='list'?'Lista':'Categorie'}</button>
        </div>
      </div>
      {viewMode==='list' ? (
        <div className="max-h-64 overflow-auto pr-1 glass-scroll">
          {items.map(e=> {
            const synthetic = isSyntheticInstance(e);
            return (
              <div key={e.id} className="flex justify-between gap-2 text-[11px] py-0.5 border-b last:border-none border-white/30 dark:border-white/10">
                <span className="flex-1 truncate">
                  {e.description} <span className="opacity-50">[{e.category}]</span>
                  {synthetic && <span className="ml-1 inline-block px-1 rounded bg-indigo-500/70 text-[9px] text-white align-middle" title="Istanza sintetica ricorrenza">S</span>}
                </span>
                <span className={`font-mono ${e.direction==='in'?'text-green-600':'text-red-600'}`}>{e.direction==='in'?'+':'-'}€ {e.amount.toFixed(2)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="max-h-64 overflow-auto pr-1 glass-scroll flex flex-col gap-1">
          {Object.entries(grouped).sort((a,b)=> (b[1].in + b[1].out) - (a[1].in + a[1].out)).map(([cat,val])=> {
            const netCat = val.in - val.out;
            const mag = val.in + val.out;
            return (
              <div key={cat} className="relative p-2 rounded-md glass-panel glass-panel--subtle">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-medium truncate">{cat} <span className="opacity-50">({val.count})</span></span>
                  <span className={`font-mono ${netCat>=0?'text-green-600':'text-red-600'}`}>{netCat>=0?'+':'-'}€ {Math.abs(netCat).toFixed(2)}</span>
                </div>
                <div className="h-1.5 w-full rounded bg-neutral-300/40 dark:bg-neutral-700/40 overflow-hidden flex">
                  <div style={{width: mag===0?0: (val.in/mag)*100+'%'}} className="bg-green-500/70" />
                  <div style={{width: mag===0?0: (val.out/mag)*100+'%'}} className="bg-red-500/70" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
