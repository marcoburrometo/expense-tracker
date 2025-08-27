# JANET – Just ANother Expense Tracker

> Intelligent budgeting, recurring calendar, collaborative multi‑workspaces. Advanced glass UI built on Next.js.

JANET ("Just ANother Expense Tracker") is a modern expense & budget tracker focused on:

* Speed (client‑only, debounced saves, local fallback)
* Visual clarity (multi‑layer glass design, gradient brand text without extra background overlays)
* Calendar intelligence (synthetic recurrences, heat density, per‑day details)
* Collaboration (multiple workspaces with invites and audit trail)

---

## 🌐 Technology Stack

| Layer               | Choice                             | Notes                                                                |
| ------------------- | ---------------------------------- | -------------------------------------------------------------------- |
| Framework           | Next.js 15 (App Router)            | React 19, edge‑friendly structure                                    |
| Language            | TypeScript                         | Strict domain & state typing                                         |
| UI                  | Tailwind v4 + custom CSS           | Tokens + glass utilities in `globals.css`                            |
| Local state         | Context + Reducer                  | `TrackerContext`, `WorkspaceContext`, `MovementFiltersContext`, etc. |
| Offline persistence | `localStorage`                     | Re‑hydrate if no login / offline fallback                            |
| Auth / Sync         | Firebase (Google Auth + Firestore) | No custom backend yet                                                |
| Charts              | (WIP / simple custom chart)        | Extensible toward external libs                                      |

---

## ✨ Core Features

* One‑off and recurring movements (weekly / monthly / yearly) generated synthetically for the current window
* Monthly budgets per category with progress summary
* Shared filters (direction, date range, category, search, future projections)
* Calendar with intensity highlighting, synthetic badges, per‑day detail panel
* Light / Dark theme + toggle + system detection
* Quick Add FAB + reusable confirmations
* Multi‑workspace: automatic personal creation, fast switching, invites
* Firestore sync with debounce (~800ms) + action audit log
* Offline mode (continues using local state while saves retry)
* Export / Import full JSON state (movements, budgets, config)
* Basic security (draft Firestore rules needing hardening)

---

## 🧱 Architecture & Structure

```
src/
  app/                # Layout & pages (App Router)
  components/         # Atomic + composite UI (Calendar, Tables, Forms, Stat Cards)
  domain/             # Domain types, categories, constants
  lib/                # Firebase adapter, local storage helpers, workspace adapter
  state/              # Context + Providers (Auth, Tracker, Workspace, Theme, Filters)
```

Principles:

* Domain tracker state isolated in a single serializable reducer
* Thin Firestore adapter (`workspaceAdapter`) translating remote doc <-> `TrackerState`
* No side‑effects inside presentation components (delegated to contexts / adapters)
* CSS tokens + utilities: all glass surfaces centralized in `globals.css` for consistency & performance

---

## 🗃️ Firestore Data Model (current)

| Collection               | Schema (key: type)                               | Notes                                 |
| ------------------------ | ------------------------------------------------ | ------------------------------------- |
| `workspaces/{id}`        | name, ownerId, memberIds[], createdAt, updatedAt | Simple membership (array)             |
| `workspaceTrackers/{id}` | tracker: TrackerState, updatedAt                 | Single state doc per workspace        |
| `workspaceInvites/{id}`  | workspaceId, email, invitedBy, status            | Status: pending / accepted / declined |
| `workspaceAudit/{id}`    | workspaceId, actorId, action, payload, createdAt | Append‑only log                       |

Tracked audit actions: `workspace.create`, `tracker.seed`, `tracker.save`, `workspace.addMember`, `invite.create`, `invite.accept`, `invite.decline`

---

## 🔄 Sync & Workspace Flow

1. Google login → fetch workspace list (if empty: create personal)
2. Select workspace → load tracker document → HYDRATE local state
3. Mutations (debounced) → push document + append audit `tracker.save`
4. Switch workspace → replace entire state (no cross merge)
5. Logout → local mode (browser persistence only)

Fallback: if save fails retain pending state and retry (TODO advanced retry/backoff).

---

## 🧪 State & Persistence

Key contexts:

* `TrackerContext` – movements, recurrences, budgets
* `WorkspaceContext` – current workspace, list, switching
* `AuthContext` – Firebase user + login/logout
* `MovementFiltersContext` – shared filters & UI binding
* `ThemeContext` – current theme + toggle (persisted via `localStorage`)

Serialization: full `TrackerState` is JSON‑safe; export/import operates on this block.

---

## 🎨 Design System (Glass)

All glass styling defined via CSS custom properties & utilities in `globals.css`:

* Surface layers (`--surface-1..3`) with light/dark alpha shifts
* Blur & saturation controlled by `--surface-backdrop-blur` / `--surface-saturate`
* Panel variants: `default`, `subtle`, `solid`, `frosted`, `elevated`, `flat`, `pure`, composite `flat-pure`
* Brand text `.glass-text-brand`: single linear gradient only (background highlight/gloss removed)
* Reduced transparency via `prefers-reduced-transparency`

Performance guidelines:

* Avoid more than two nested blur layers
* Tooltips / ephemeral overlays: prefer lightweight styles (skip blur if not essential)

---

## 🛡️ Firestore Rules (draft)

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    function isAuth() { return request.auth != null; }
    function uid() { return request.auth.uid; }

    match /workspaces/{wid} {
      allow read, update: if isAuth() && uid() in resource.data.memberIds;
      allow create: if isAuth();
    }
    match /workspaceTrackers/{wid} {
      allow read, write: if isAuth(); // TODO harden membership check
    }
    match /workspaceInvites/{iid} {
      allow create, read, update: if isAuth();
    }
    match /workspaceAudit/{aid} {
      allow create: if true; // TODO restrict to isAuth & membership
      allow read: if isAuth();
    }
  }
}
```

Security TODO:

* Enforce membership also on `workspaceTrackers`, `workspaceInvites`, `workspaceAudit`
* Restrict `invite.create` to owner / editor
* Server time validations (`request.time`) & field schema constraints

---

## ⚙️ Local Setup

1. Clone repo
2. `npm install`
3. Create `.env.local` with your Firebase keys:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=... 
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=... 
NEXT_PUBLIC_FIREBASE_PROJECT_ID=... 
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=... 
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=... 
NEXT_PUBLIC_FIREBASE_APP_ID=... 
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
```

4. `npm run dev`
5. Open http://localhost:3000

Production build: `npm run build` then `npm start`.

Deploy (Firebase Hosting): simplified script `npm run deploy` (validate hardened rules first).

---

## 🧰 NPM Scripts

| Script   | Description                           |
| -------- | ------------------------------------- |
| `dev`    | Development (Turbopack)               |
| `build`  | Production build                      |
| `start`  | Run production server                 |
| `lint`   | Run ESLint                            |
| `deploy` | Build + Firebase deploy (placeholder) |

---

## 📤 Import / Export

* Export: downloads full JSON (budgets, movements, settings)
* Import: replaces entire state (ROADMAP: guided merge + diff preview)

Anticipated edge cases:

* Import with missing categories → auto add
* Duplicate IDs → overwrite (improve with versioning)

---

## 🚀 Short Roadmap

| Area        | Task                                                 |
| ----------- | ---------------------------------------------------- |
| Sync        | Retry/backoff + version conflict handling            |
| Security    | Harden Firestore rules + roles (owner/editor/viewer) |
| Invites     | UI accept/decline + email sending (Cloud Function)   |
| Import      | Intelligent ID merge + diff viewer                   |
| Audit       | Realtime filterable feed                             |
| UX          | Optional brand shimmer, reduced motion accessibility |
| Performance | Movement list virtualization + lazy calendar weeks   |
| Mobile      | Swipe gestures for quick movement actions            |

Legend: near term ≈ upcoming iterations; update progressively.

---

## ♿ Accessibility

* Custom focus ring via `--focus-ring` maintaining contrast
* `prefers-reduced-transparency`: reduces blur / increases legibility
* Keyboard nav: tables & calendar highlight focused row/day
* Brand tooltip purely decorative → keep primary text semantic

TODO: granular aria labels for icon buttons, live region save announcements.

---

## 🧩 Contribute / Extend

1. Create a feature branch
2. Keep glass style changes inside `globals.css` (avoid inline drift)
3. Add types to `domain/types.ts` before using a new field in the reducer
4. Update the README if you change architecture / flows

Tip: for new UI patterns prefer composable components over variant proliferation.

---

## 📄 License

Internal / demo project. Add a license before making it public.

---

Questions or ideas? Open an internal issue or append to the roadmap section.
