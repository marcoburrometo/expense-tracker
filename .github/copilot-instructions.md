# Copilot Project Instructions (JANET Expense Tracker)

Concise guidelines for AI agents working in this repo. Focus on THESE patterns; avoid generic boilerplate.

## 1. Architecture Snapshot
- Client‑only Next.js 15 (App Router) + React 19; no custom server/APIs yet.
- Domain state (tracker) = single serializable `TrackerState` (expenses + budgets + settings + version) in `TrackerContext` reducer.
- Multi‑tenant via Firestore: one `workspaceTrackers/{workspaceId}` doc stores whole tracker snapshot. Sync is full‑document replace (no patch/merge logic beyond Firestore merge set).
- Workspaces + invites + audit collections; adapter functions in `src/lib/workspaceAdapter.ts` encapsulate all Firestore calls & audit logging.
- UI composed of glassmorphism utilities defined centrally in `src/app/globals.css` (do NOT scatter new inline glass styles—extend tokens / variants instead).

## 2. Core Data Types (see `src/domain/types.ts`)
- Expense variants: `oneoff`, `recurring-template`, `recurring-instance` (generated). Guard helpers: `isTemplate`, `isRecurringInstance`.
- Recurring frequencies: `weekly` | `monthly` | `yearly`.
- `Budget` only supports `period: 'monthly'` for now.
- `TrackerState.version` used for lightweight migrations (currently to add `direction`). Keep migrations idempotent.

## 3. Recurrence Generation Model
Two places generate instances:
1. On tracker mount (`GENERATE_CURRENT_PERIOD_INSTANCES` action) inside `TrackerContext` (client local).
2. Calendar synthetic preview (CalendarView) also generates ephemeral instances (not persisted) if missing.
Agents adding new frequencies MUST update both: reducer generation helpers + calendar synthetic generation.

### 9.a Internationalization (i18n)
- I18n introduced with `I18nContext` (`src/state/I18nContext.tsx`).
- Use `const { t } = useI18n();` then replace hardcoded user‑facing strings with keys.
- Key pattern: `section.label` (e.g. `form.amount`, `calendar.prevMonth`, `nav.movements`).
- Extend translations by adding keys to both `it` and `en` objects; keep keys alphabetically grouped by prefix if adding many.
- Avoid dynamic key construction unless previously established; prefer explicit keys.
- When adding new components: start with English/Italian simultaneously to prevent partial language gaps.
- HTML `lang` attribute auto-updated via provider; don't hardcode `lang` elsewhere.

## 4. Sync Pattern
- Debounced (800ms) save in `WorkspaceContext` comparing JSON string of tracker vs last saved.
- Before saving: deep sanitize via JSON stringify/parse to strip `undefined`.
- All remote ops go through `workspaceAdapter.ts`; extend there (never call Firestore directly from components/contexts).
- Audit logging: `log()` internal helper; add new actions with compact, predictable keys (e.g. `expense.update`).

## 5. Offline / Local Mode
- When user not authenticated or no active workspace: tracker works purely from localStorage (`loadJSON/saveJSON` in `TrackerContext`). Avoid introducing logic that assumes `user` or `activeWorkspaceId` unless guarded.

## 6. Context Responsibilities
- `TrackerContext`: pure domain mutations; keep side‑effects (I/O) out.
- `WorkspaceContext`: orchestrates remote load/save + workspace switching only.
- `AuthContext`: Firebase Auth state & login/logout.
- Additional contexts (Filters, Theme) follow lightweight state pattern.
Agents adding new global state should mirror this separation: domain reducer (pure) + orchestrator context (effects & sync).

## 7. Glass UI Conventions
- Reuse `GlassPanel` variants (`flat-pure`, `subtle`, `pure`, etc.). Prefer adding a variant rather than composing large custom class strings repeatedly.
- Brand text uses `.glass-text-brand` (gradient text only; background layers intentionally removed). Do not reintroduce highlight overlays without explicit request.
- Instead of using "glass-panel" class strings directly, prefer `GlassPanel` component with `variant` prop.
- Popups / overlays (e.g. DatePicker) MUST wrap content in `GlassPanel variant="pure"` (rendered via portal if detached) instead of duplicating raw panel utility classes.

## 8. i18n / Language
- Mixed Italian labels exist (e.g. form placeholders, calendar labels). If converting to full English, batch changes & keep README in sync. Do not partially translate randomly.

## 9. Adding New Features
Example flow (e.g. add quarterly recurrence):
1. Extend `RecurringFrequency` union + generators in `TrackerContext` (weeklyOccurrences / monthlyOccurrence pattern) & calendar synthetic logic.
2. Adjust forms (ExpenseForm) frequency select.
3. Migrate existing state if needed (bump version + migration guard).
4. Update README & copilot instructions if pattern changes.

## 10. Error Handling & Edge Cases
- Firestore adapter currently swallows audit log errors silently—keep it that way unless a feature requires surfacing them.
- Save failures set `lastError` in `WorkspaceContext`; prefer reusing that path rather than adding new error popups.

## 11. Performance Guidelines
- Avoid more than 2 nested blurred panels; when adding new modal/overlay prefer existing panel classes.
- Large list optimizations (virtualization) not yet implemented—if adding, isolate in a dedicated component (do not overcomplicate existing simple list code).

## 12. Tests / Tooling
- No test harness present. If adding tests, choose lightweight (e.g. Vitest) and keep domain logic (recurrence generation, migrations) testable in isolation.

## 13. Env & Build
- Env vars prefixed with `NEXT_PUBLIC_FIREBASE_...` consumed only in `firebaseClient.ts`.
- Scripts: `dev`, `build`, `start`, `lint`, `deploy` (build + firebase deploy placeholder). Use Turbopack friendly patterns.

## 14. When Modifying Data Shape
- Update `types.ts` first.
- Provide a migration in `migrate()` inside `TrackerContext` if backwards compatibility required.
- Bump `INITIAL_STATE.version` and gate transformation by version check.

## 15. Adding Audit Actions
- Keep action keys lowercase dot‑separated (`entity.verb`).
- Add logging inside adapter right after successful operation.

## 16. Do Not
- Do NOT import `firebase/*` directly in components or contexts (except `firebaseClient` in AuthContext).
- Do NOT persist partial tracker slices; always save the whole sanitized `TrackerState`.
- Do NOT mutate state objects directly in reducers; always return new copies (current code already respects this).

## 17. Quick Reference Key Files
- Domain types: `src/domain/types.ts`
- Firestore adapter: `src/lib/workspaceAdapter.ts`
- Tracker reducer & migration: `src/state/TrackerContext.tsx`
- Workspace sync: `src/state/WorkspaceContext.tsx`
- Auth: `src/state/AuthContext.tsx`
- UI patterns: `src/components/ExpenseForm.tsx`, `src/components/CalendarView.tsx`, `src/components/Navbar.tsx`
- Styling system: `src/app/globals.css`

---
If unclear: clarify intent (domain vs sync vs presentation) before adding code. Keep changes small & cohesive.
