"use client";
import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';

export interface MovementFiltersState {
  from: string; // ISO date (YYYY-MM-DD)
  to: string;   // ISO date
  dir: 'all'|'in'|'out';
  category: string; // '' = all
  q: string; // search text
  sortDesc: boolean; // table sort direction
  includeProj: boolean; // include future projections
  smooth: boolean; // chart smoothing
}

interface MovementFiltersContextValue extends MovementFiltersState {
  setFilters: (fn: (prev: MovementFiltersState) => MovementFiltersState) => void;
  update: (patch: Partial<MovementFiltersState>) => void;
  reset: () => void;
}

const MovementFiltersContext = createContext<MovementFiltersContextValue | null>(null);

export const MovementFiltersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const defaults: MovementFiltersState = useMemo(()=> {
    const now = new Date();
    return {
    from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10),
    to: new Date(now.getFullYear()+1, 11, 31).toISOString().slice(0,10),
    dir: 'all',
    category: '',
    q: '',
    sortDesc: false, // ascending default
    includeProj: true,
    smooth: false,
  };}, []);
  const [state, setState] = useState<MovementFiltersState>(defaults);

  const setFilters = useCallback((fn: (p: MovementFiltersState)=>MovementFiltersState) => setState(fn), []);
  const update = useCallback((patch: Partial<MovementFiltersState>) => {
    setState(s => {
      let changed = false;
      const draft: MovementFiltersState = { ...s };
      (Object.keys(patch) as (keyof MovementFiltersState)[]).forEach(k => {
        const val = patch[k];
        if(val !== undefined && draft[k] !== val){
          switch(k){
            case 'from':
            case 'to':
            case 'category':
            case 'q':
              draft[k] = val as MovementFiltersState[typeof k]; break;
            case 'dir':
              draft[k] = val as MovementFiltersState['dir']; break;
            case 'sortDesc':
            case 'includeProj':
            case 'smooth':
              draft[k] = val as MovementFiltersState[typeof k]; break;
            default:
              break;
          }
          changed = true;
        }
      });
      return changed ? draft : s;
    });
  }, []);
  const reset = useCallback(()=> setState(defaults), [defaults]);

  const value: MovementFiltersContextValue = useMemo(()=> ({ ...state, setFilters, update, reset }), [state, setFilters, update, reset]);
  return <MovementFiltersContext.Provider value={value}>{children}</MovementFiltersContext.Provider>;
};

export function useMovementFilters() {
  const ctx = useContext(MovementFiltersContext);
  if (!ctx) throw new Error('useMovementFilters must be used within MovementFiltersProvider');
  return ctx;
}
