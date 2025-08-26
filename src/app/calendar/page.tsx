import React from 'react';
import { CalendarView } from '@/components/CalendarView';

export default function CalendarPage(){
  return (
    <main className="w-full p-4 md:p-8 space-y-6 flex flex-col flex-1 min-h-0">
      <header className="space-y-2 fade-in">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight heading-gradient">Calendario</h1>
        <p className="text-sm text-neutral-800 dark:text-neutral-400">Visuale mensile di entrate e uscite.</p>
      </header>
      <div className="flex-1 min-h-0 fade-in" style={{animationDelay: '.05s'}}>
        <CalendarView />
      </div>
    </main>
  );
}