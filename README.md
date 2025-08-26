# Expense Tracker (Glass UI + Workspaces + Firebase Sync)

Expense and budget tracking app with glass UI, recurring items, advanced calendar, and multi‑workspace Firebase sync.

## Stack

* Next.js App Router (TS, React 19)
* Tailwind CSS v4 + custom glass classes (`globals.css`)
* Local state via Context/Reducer (`TrackerContext`) + `localStorage` persistence
* Firebase (Google Auth + Firestore) for workspaces & state sync
* No custom backend (client only)

## Core Features

* Movements: one‑off and recurring (weekly / monthly / yearly) with in‑period instance generation
* Monthly budgets per category
* Shared filters (direction, date range, category, search, projections)
* Calendar with volume highlighting, synthetic instances, per‑day detail modal
* Light/Dark theme + toggle / system detection
* Quick Add FAB + reusable confirmation modals
* Multi‑user workspaces with automatic provisioning and fast switching
* Cloud sync (800ms debounce) + offline local fallback
* Workspace invites (create + list) – acceptance handled in adapter for now
* Audit log of key actions (workspace, tracker save, invites, membership)
* Export / Import current JSON state

## Getting Started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>

## Firebase Configuration

Create `.env.local` with:

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...
```

Firestore security rules (draft – refine for production):

```javascript
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
			allow read, write: if isAuth(); // TODO: restrict by workspace membership
		}
		match /workspaceInvites/{iid} {
			allow create: if isAuth();
			allow read: if isAuth();
			allow update: if isAuth();
		}
		match /workspaceAudit/{aid} {
			allow create: if true; // client writes audit entries; tighten if needed
			allow read: if isAuth();
		}
	}
}
```

## Workspaces & Sync (Flow)

1. Google login → list workspaces (if none: create personal)
2. Select workspace → load tracker document and HYDRATE local state
3. Edits (800ms debounce) → save `workspaceTrackers/{workspaceId}` + audit `tracker.save`
4. Switch workspace → state replaced (no cross merge)
5. Logout → local mode (only `localStorage`)

## Firestore Data Shape

* `workspaces/{id}`: { name, ownerId, memberIds[], createdAt, updatedAt }
* `workspaceTrackers/{id}`: { tracker: TrackerState, updatedAt }
* `workspaceInvites/{id}`: { workspaceId, email, invitedBy, status }
* `workspaceAudit/{id}`: { workspaceId, actorId, action, payload, createdAt }

## Import / Export

* Export: downloads JSON (expenses, budgets, settings)
* Import: replaces entire state (TODO: smart merge / confirmation)

## Tracked Audit Actions

`workspace.create`, `tracker.seed`, `tracker.save`, `workspace.addMember`, `invite.create`, `invite.accept`, `invite.decline`

## Short Roadmap

* Smart import merge (by id) + diff preview
* Invite accept/decline from UI
* Save conflict handling (version compare / soft lock)
* Retry/backoff failed saves
* Realtime audit log (onSnapshot) + filters
* Roles (owner / editor / viewer) enforcement
* Email invite sending (Cloud Functions)

## NPM Scripts

* `npm run dev` – development (Turbopack)
* `npm run build` – production build
* `npm start` – production start

## Project Structure

```text
src/
	app/ (Next pages / app router)
	components/ (UI & calendar)
	state/ (Contexts: Tracker, Workspace, Theme, Filters, Auth)
	lib/ (firebaseClient, workspaceAdapter, localStorage)
	domain/ (types & categories)
```

## Design Notes

* Glass UI with neutral gradients controlled via CSS vars
* Theme forced via `data-theme` + `prefers-color-scheme` fallback
* No custom server calls: easy future migration to APIs / Functions

## License

Internal/demo project. Add a LICENSE if needed.

---

See roadmap or open an internal issue for improvements.
