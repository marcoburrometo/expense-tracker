# Copilot Project Instructions

Concise guidance for AI agents contributing to this repository. Focus on these concrete patterns and constraints (do not add generic advice).

## 1. Stack & Build
- Framework: Next.js App Router (see `src/app/`). TypeScript, React 19, Turbopack dev/build (`npm run dev|build`).
- Styling: Tailwind v4 + handcrafted "glass" utility classes in `src/app/globals.css` (custom classes prefixed `glass-`). Respect existing style tokens & class patterns.
- No backend: purely client-side state + `localStorage` persistence. Avoid server actions unless explicitly added later.

## 2. Core Architecture
- Domain models declared in `src/domain/types.ts` (versioned state, expense variants, budgets). Changes require updating migrations in `TrackerContext`.
- Global state via React Contexts:
  - `TrackerContext` (`src/state/TrackerContext.tsx`): single source of truth for expenses & budgets. Reducer + action types. Persistence key: `tracker-state-v1`. Auto-generates recurring instances on mount.
  - `MovementFiltersContext` (`src/state/MovementFiltersContext.tsx`): shared filters (date range, direction, category, search, projections, sorting) used by table & chart.
  - `ThemeContext` (`src/state/ThemeContext.tsx`): manages theme (light/dark/system) via `data-theme` attributes.
- UI Components consume contexts directly (client components). Never call hooks in server components; wrap logic in a `"use client"` component (see `DashboardStats`).

## 3. Recurring Logic
- Recurring templates (`type: 'recurring-template'`) spawn instances (`'recurring-instance'`). Generation paths:
  - On mount: `GENERATE_CURRENT_PERIOD_INSTANCES` action in `TrackerContext` (weekly/monthly/yearly strategies).
  - On-the-fly future projection (without persisting) inside `MovementTable` & `LedgerChart` when `includeProj` filter true.
- When editing a recurring template only editable fields differ from one-off; see `UPDATE_EXPENSE` switch.

## 4. Data Flow Patterns
- Add/update/delete go through dispatch wrappers (e.g., `addOneOff`, `updateExpense`). Always use these—do not mutate arrays directly.
- After modifying domain shape, ensure migration (`migrate()` in `TrackerContext`) assigns defaults & increments `version` if needed.
- Monthly totals: selector `useMonthlyTotals()` (only counts outflow expenses of current month—templates excluded).

## 5. UI & Styling Conventions
- Prefer existing glass classes (`glass-panel`, `glass-button`, variants `--primary|--danger|--success`, `glass-input`, badges) over new bespoke CSS.
- New metric/summary blocks should use `StatCard` (`src/components/StatCard.tsx`) or replicate its pattern.
- Inline destructive confirmations: small inline prompt + secondary cancel (see `ExpenseList` & `BudgetSummary`). Reuse that style.
- Category input now standardized as `<select>` populated via defaults + dynamic categories; mirror logic from `ExpenseForm` if needed elsewhere.

## 6. Filters & Sync
- Movement filters: any feature affecting both chart & table must patch shared state via `useMovementFilters().update()` rather than local component state.
- Sorting: `sortDesc` boolean controls date order; balance is recomputed chronologically then re-ordered for display.

## 7. File / Import Practices
- Path alias `@/*` maps to `src/*` (see `tsconfig.json`). Some imports switched to relative to avoid server/client boundary issues—prefer alias unless it breaks type resolution.
- Each new context or hook should throw if used outside its provider (pattern already established).

## 8. Persistence & Local Only
- Persistence: `localStorage` helpers in `src/lib/localStorage` (not shown here—create if extending). Keep operations resilient (try/catch) and JSON versioned.
- Do NOT introduce network calls or external DB without explicit instruction. Future backend likely Firebase—plan for optional async layer separation (e.g., adapter interface) if refactoring.

## 9. Testing & Validation (Current State)
- No test harness exists yet. If adding, prefer lightweight vitest or jest with isolated reducers & projection logic (`computeGeneratedInstances`, projection helpers in `MovementTable`).
- Form validation: simple synchronous checks; replicate pattern from `ExpenseForm` (errors map + touched state).

## 10. Adding Features Safely
- For new expense fields: update type definitions, form, reducer actions, persistence migration, and any CSV export (`formatCSV` in `MovementTable`).
- For new recurring frequency: implement occurrence generator & hook into `computeGeneratedInstances` + projection functions in `MovementTable` / `LedgerChart`.
- For new summary metrics: derive from `expenses` directly or create a selector to avoid duplicating logic.

## 11. Accessibility & Semantics
- Maintain `aria-current='page'` (Navbar), `aria-label` for icon-only buttons, and preserve keyboard focus styles (`:focus-visible`).
- Avoid div-based buttons; reuse `.glass-button` with semantic `<button>`.

## 12. Performance Notes
- Large lists rely on memoization (`useMemo`) for filtered/sorted rows. If introducing expensive selectors consider extracting pure utilities.
- Future projection should remain optional (controlled by `includeProj`) to keep rendering fast.

## 13. Common Pitfalls
- Using hooks in server components (fix by moving to client file with `"use client"`).
- Forgetting to update migration after domain change—leads to undefined fields in persisted state.
- Duplicating category logic—centralize with defaults + dynamic merge.

## 14. Quick Reference
- Add one-off: `useTracker().addOneOff({...})`
- Add recurring template: `addRecurringTemplate({... frequency })`
- Update expense: `updateExpense(id, partial)`
- Filter update: `useMovementFilters().update({ q: 'rent' })`
- Theme toggle: `useTheme().toggle()`

Refine this doc after structural changes or adding persistence/backend layers.
