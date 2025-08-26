// Firestore adapter for multi-user workspaces (Step B - initial)
// Keeps functions isolated so UI can remain mostly unchanged until sync wiring.

import { getFirebaseApp } from '@/lib/firebaseClient';
import { getFirestore, collection, doc, getDoc, setDoc, addDoc, serverTimestamp, query, where, getDocs, runTransaction, deleteDoc } from 'firebase/firestore';
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

// Fetch a single workspace by id (utility for displaying invite target names)
export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
  if(!workspaceId) return null;
  const ref = doc(db(), WS_COLLECTION, workspaceId);
  const snap = await getDoc(ref);
  if(!snap.exists()) return null;
  const data = snap.data() as Omit<Workspace, 'id'>;
  return { id: workspaceId, ...data };
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
  // Firestore rejects any field value that is strictly undefined anywhere within the object graph.
  // Defensive sanitization: deep-strip undefined (without mutating original) prior to persistence.
  // JSON stringify/parse is acceptable here because tracker contains only POJOs / primitives.
  const sanitizedTracker = JSON.parse(JSON.stringify(tracker)) as TrackerState;
  await setDoc(ref, { workspaceId, tracker: sanitizedTracker, updatedAt: serverTimestamp() }, { merge: true });
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
  const token = cryptoRandomToken();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(); // 7 days
  const lowerEmail = email.toLowerCase();
  // Check for existing pending invite for same email+workspace
  const existingQ = query(col, where('workspaceId','==', workspaceId), where('email','==', lowerEmail), where('status','==','pending'));
  const existingSnap = await getDocs(existingQ);
  if(!existingSnap.empty) {
    const d = existingSnap.docs[0];
    const data = d.data() as {
      workspaceId: string; email: string; invitedBy: string; status: WorkspaceInvite['status']; createdAt: string; updatedAt: string; token?: string; expiresAt?: string
    };
    return {
      id: d.id,
      workspaceId: data.workspaceId,
      email: data.email,
      invitedBy: data.invitedBy,
      status: data.status,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      token: data.token,
      expiresAt: data.expiresAt
    };
  }
  const ref = await addDoc(col, { workspaceId, email: lowerEmail, invitedBy, status: 'pending', createdAt: now, updatedAt: now, token, expiresAt });
  log(workspaceId, invitedBy, 'invite.create', { email: lowerEmail });
  return { id: ref.id, workspaceId, email: lowerEmail, invitedBy, status: 'pending', createdAt: now, updatedAt: now, token, expiresAt };
}

// Wrapper returning duplicate info (UI convenience)
export async function createWorkspaceInviteWithInfo(workspaceId: string, email: string, invitedBy: string): Promise<{ invite: WorkspaceInvite; duplicated: boolean }>{
  const col = collection(db(), WS_INVITES_COLLECTION);
  const lowerEmail = email.toLowerCase();
  const existingQ = query(col, where('workspaceId','==', workspaceId), where('email','==', lowerEmail), where('status','==','pending'));
  const existingSnap = await getDocs(existingQ);
  if(!existingSnap.empty) {
    const d = existingSnap.docs[0];
    return { invite: { id: d.id, ...(d.data() as Omit<WorkspaceInvite,'id'>) }, duplicated: true };
  }
  const invite = await createWorkspaceInvite(workspaceId, email, invitedBy);
  return { invite, duplicated: false };
}

function cryptoRandomToken(): string {
  // Prefer crypto.randomUUID if available
  const c = (globalThis as unknown as { crypto?: { randomUUID?: () => string; getRandomValues?: (arr: Uint8Array)=>void } }).crypto;
  if (c?.randomUUID) {
    return c.randomUUID().replace(/-/g,'');
  }
  if (c?.getRandomValues) {
    const arr = new Uint8Array(16);
    c.getRandomValues(arr);
    return Array.from(arr).map(b => b.toString(16).padStart(2,'0')).join('');
  }
  return Math.random().toString(36).slice(2, 18);
}

export async function getInviteByToken(token: string): Promise<WorkspaceInvite | null> {
  const qRef = query(collection(db(), WS_INVITES_COLLECTION), where('token','==', token));
  const snap = await getDocs(qRef);
  if(snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<WorkspaceInvite,'id'>) };
}

export async function acceptInviteByToken(token: string, currentUid: string, currentEmail: string) {
  const invite = await getInviteByToken(token);
  if(!invite) throw new Error('Invite invalid');
  if(invite.status !== 'pending') return;
  if(invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
    await setDoc(doc(db(), WS_INVITES_COLLECTION, invite.id), { ...invite, status: 'expired', updatedAt: new Date().toISOString() }, { merge: true });
    throw new Error('Invite expired');
  }
  // ensure email matches
  if(invite.email !== currentEmail.toLowerCase()) throw new Error('Email mismatch');
  await acceptInvite(invite.id, currentUid);
}

export async function listWorkspaceInvites(workspaceId: string): Promise<WorkspaceInvite[]> {
  const q = query(collection(db(), WS_INVITES_COLLECTION), where('workspaceId','==', workspaceId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Omit<WorkspaceInvite,'id'>) }));
}

export async function listUserIncomingInvites(email: string): Promise<WorkspaceInvite[]> {
  const lower = email.toLowerCase();
  const qRef = query(collection(db(), WS_INVITES_COLLECTION), where('email','==', lower), where('status','==','pending'));
  const snap = await getDocs(qRef);
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
    tx.set(ref, { ...data, status: 'accepted', acceptedUserId: currentUid, updatedAt: new Date().toISOString() });
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

export async function deleteWorkspaceInvite(inviteId: string, actorId: string) {
  const ref = doc(db(), WS_INVITES_COLLECTION, inviteId);
  const snap = await getDoc(ref);
  if(!snap.exists()) return;
  const data = snap.data() as WorkspaceInvite;
  // Only allow deletion of pending invites; accepted/declined/expired retained for audit
  if(data.status !== 'pending') return;
  await deleteDoc(ref);
  log(data.workspaceId, actorId, 'invite.delete', { email: data.email });
}

// Remove a member from a workspace (used when deleting an accepted invite)
export async function removeWorkspaceMember(workspaceId: string, memberUid: string) {
  const wsRef = doc(db(), WS_COLLECTION, workspaceId);
  await runTransaction(db(), async (tx) => {
    const wsSnap = await tx.get(wsRef);
    if(!wsSnap.exists()) throw new Error('Workspace missing');
    const wsData = wsSnap.data() as Workspace;
    const idx = wsData.memberIds.indexOf(memberUid);
    if(idx === -1) return; // already removed
    wsData.memberIds.splice(idx,1);
    wsData.updatedAt = new Date().toISOString();
    tx.set(wsRef, wsData);
  });
  log(workspaceId, memberUid, 'workspace.removeMember');
}

// Delete accepted invite and remove membership (owner or self-triggered)
export async function removeAcceptedInvite(inviteId: string, actorId: string) {
  const ref = doc(db(), WS_INVITES_COLLECTION, inviteId);
  const snap = await getDoc(ref);
  if(!snap.exists()) return;
  const data = snap.data() as WorkspaceInvite;
  if(data.status !== 'accepted') return; // only accepted case here
  // Determine which member to remove: the user who accepted (preferred), fallback to actor if matches invite email
  const targetUid = data.acceptedUserId || actorId;
  await removeWorkspaceMember(data.workspaceId, targetUid);
  // Delete invite doc for cleanup (optional: could mark removed)
  await deleteDoc(ref);
  log(data.workspaceId, actorId, 'invite.removeAccepted', { email: data.email, removedUid: targetUid });
}

export async function listAuditEntries(workspaceId: string, limit = 50): Promise<AuditEntry[]> {
  const qRef = query(collection(db(), WS_AUDIT_COLLECTION), where('workspaceId','==', workspaceId));
  const snap = await getDocs(qRef);
  return snap.docs
    .map(d => ({ id: d.id, ...(d.data() as Omit<AuditEntry,'id'>) }))
    .sort((a,b)=> b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}
