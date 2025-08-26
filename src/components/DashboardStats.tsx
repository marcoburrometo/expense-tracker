"use client";
import React from 'react';
import { useTracker, useMonthlyTotals } from '@/state/TrackerContext';
import { StatCard } from './StatCard';

export const DashboardStats: React.FC = () => {
  const { expenses } = useTracker();
  const monthly = useMonthlyTotals();
  const monthTotalOut = Object.values(monthly).reduce((a,b)=> a+b, 0);
  const totalIn = expenses.filter(e=>e.direction==='in').reduce((s,e)=> s+e.amount,0);
  const totalOut = expenses.filter(e=>e.direction==='out').reduce((s,e)=> s+e.amount,0);
  const net = totalIn - totalOut;
  const recurringCount = expenses.filter(e=> e.type==='recurring-template').length;
  return (
    <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      <StatCard label="Entrate" value={`€ ${totalIn.toFixed(2)}`} accent="green" hint="Totale storico" />
      <StatCard label="Uscite" value={`€ ${totalOut.toFixed(2)}`} accent="red" hint="Totale storico" />
      <StatCard label="Saldo" value={`€ ${net.toFixed(2)}`} accent={net>=0? 'green':'red'} hint="Entrate - Uscite" />
      <StatCard label="Categorie" value={new Set(expenses.map(e=>e.category)).size} accent="indigo" hint="Totali Distinti" />
      <StatCard label="Ricorrenti" value={recurringCount} accent="blue" hint="Template attivi" />
      <StatCard label="Spesa Mese" value={`€ ${monthTotalOut.toFixed(2)}`} accent="indigo" hint="Somma categorie" />
    </div>
  );
};
