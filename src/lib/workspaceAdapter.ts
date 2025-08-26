// Firestore adapter for multi-user workspaces (Step B - initial)
// Keeps functions isolated so UI can remain mostly unchanged until sync wiring.

import { getFirebaseApp } from '@/lib/firebaseClient';
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, serverTimestamp, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { Workspace, WorkspaceTrackerDocument, TrackerState, INITIAL_STATE, WorkspaceInvite, AuditEntry } from '@/domain/types';

const WS_COLLECTION = 'workspaces';
const WS_TRACKERS_COLLECTION = 'workspaceTrackers';
const WS_INVITES_COLLECTION = 'workspaceInvites';
const WS_AUDIT_COLLECTION = 'workspaceAudit';

function db() { return getFirestore(getFirebaseApp()); }

export async function listUserWorkspaces(uid: string): Promise<Workspace[]> {
  const q = query(collection(db(), WS_COLLECTION), where('memberIds', 'array-contains', uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<Workspace,'id'>) }));
}

async function log(workspaceId: string, actorId: string | null, action: string, payload?: Record<string, unknown>) {
  try {
    const col = collection(db(), WS_AUDIT_COLLECTION);
    const now = new Date().toISOString();
    await addDoc(col, { workspaceId, actorId: actorId || 'system', action, payload: payload || {}, createdAt: now });
  } catch { /* silent */ }
}

export async function createWorkspace(uid: string, name: string): Promise<Workspace> {
  const col = collection(db(), WS_COLLECTION);
  const now = new Date().toISOString();
  const ref = await addDoc(col, { name, ownerId: uid, memberIds: [uid], createdAt: now, updatedAt: now });
  log(ref.id, uid, 'workspace.create', { name });
  return { id: ref.id, name, ownerId: uid, memberIds: [uid], createdAt: now, updatedAt: now };
}

export async function ensurePersonalWorkspace(uid: string): Promise<Workspace> {
  const existing = await listUserWorkspaces(uid);
  if (existing.length) return existing[0];
  return createWorkspace(uid, 'Workspace');
}

export async function loadWorkspaceTracker(workspaceId: string): Promise<TrackerState> {
  const ref = doc(db(), WS_TRACKERS_COLLECTION, workspaceId);
  const snap = await getDoc(ref);
  if(!snap.exists()) {
    // seed new tracker doc
    const trackerDoc: WorkspaceTrackerDocument = { workspaceId, tracker: INITIAL_STATE, updatedAt: new Date().toISOString() };
  await setDoc(ref, { ...trackerDoc, updatedAt: serverTimestamp() });
  log(workspaceId, null, 'tracker.seed');
    return trackerDoc.tracker;
  }
  const data = snap.data() as WorkspaceTrackerDocument & { updatedAt?: unknown };
  return data.tracker;
}

export async function saveWorkspaceTracker(workspaceId: string, tracker: TrackerState, actorId?: string): Promise<void> {
  const ref = doc(db(), WS_TRACKERS_COLLECTION, workspaceId);
  await setDoc(ref, { workspaceId, tracker, updatedAt: serverTimestamp() }, { merge: true });
  log(workspaceId, actorId || null, 'tracker.save', { expenses: tracker.expenses.length, budgets: tracker.budgets.length });
}

export async function addWorkspaceMember(workspaceId: string, uid: string) {
  const ref = doc(db(), WS_COLLECTION, workspaceId);
  await runTransaction(db(), async (tx) => {
    const snap = await tx.get(ref);
    if(!snap.exists()) throw new Error('Workspace not found');
    const data = snap.data() as Workspace;
    if (data.memberIds.includes(uid)) return;
    const updated = { ...data, memberIds: [...data.memberIds, uid], updatedAt: new Date().toISOString() };
    tx.set(ref, updated);
  });
  log(workspaceId, uid, 'workspace.addMember');
}

// Invites
export async function createWorkspaceInvite(workspaceId: string, email: string, invitedBy: string): Promise<WorkspaceInvite> {
  const col = collection(db(), WS_INVITES_COLLECTION);
  const now = new Date().toISOString();
  const ref = await addDoc(col, { workspaceId, email: email.toLowerCase(), invitedBy, status: 'pending', createdAt: now, updatedAt: now });
  log(workspaceId, invitedBy, 'invite.create', { email: email.toLowerCase() });
  return { id: ref.id, workspaceId, email: email.toLowerCase(), invitedBy, status: 'pending', createdAt: now, updatedAt: now };
}

export async function listWorkspaceInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
  const q = query(collection(db(), WS_INVITES_COLLECTION), where('workspaceId','==', workspaceId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<WorkspaceInvite,'id'>) }));
}

export async function acceptInvite(inviteId: string, currentUid: string) {
  const ref = doc(db(), WS_INVITES_COLLECTION, inviteId);
  const inviteSnap = await getDoc(ref);
  if(!inviteSnap.exists()) throw new Error('Invite not found');
  const data = inviteSnap.data() as WorkspaceInvite;
  if (data.status !== 'pending') return;
  // Add membership & mark accepted in a transaction
  await runTransaction(db(), async (tx) => {
    const wsRef = doc(db(), WS_COLLECTION, data.workspaceId);
    const wsSnap = await tx.get(wsRef);
    if(!wsSnap.exists()) throw new Error('Workspace missing');
    const wsData = wsSnap.data() as Workspace;
    if(!wsData.memberIds.includes(currentUid)) {
      wsData.memberIds.push(currentUid);
      wsData.updatedAt = new Date().toISOString();
      tx.set(wsRef, wsData);
    }
    tx.set(ref, { ...data, status: 'accepted', updatedAt: new Date().toISOString() });
  });
  log(data.workspaceId, currentUid, 'invite.accept');
}

export async function declineInvite(inviteId: string) {
  const ref = doc(db(), WS_INVITES_COLLECTION, inviteId);
  const snap = await getDoc(ref);
  if(!snap.exists()) return;
  const data = snap.data() as WorkspaceInvite;
  if(data.status !== 'pending') return;
  await setDoc(ref, { ...data, status: 'declined', updatedAt: new Date().toISOString() }, { merge: true });
  log(data.workspaceId, null, 'invite.decline');
}

export async function listAuditEntries(workspaceId: string, limit = 50): Promise<AuditEntry[]> {
  const qRef = query(collection(db(), WS_AUDIT_COLLECTION), where('workspaceId','==', workspaceId));
  const snap = await getDocs(qRef);
  return snap.docs
    .map(d => ({ id: d.id, ...(d.data() as Omit<AuditEntry,'id'>) }))
    .sort((a,b)=> b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
