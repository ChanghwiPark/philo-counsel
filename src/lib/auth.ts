import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  onSnapshot,
  query,
} from 'firebase/firestore';
import { auth, db, getFirebaseAuth, getFirebaseDb } from './firebase';
import { UserProfile, ChatSession } from './types';
import { LikedAdvice } from './valueSystem';
import { canonicalAgentId, getAgentMeta } from './agents';

const getLiveDb = () => (typeof window !== 'undefined' ? getFirebaseDb() : db);
const getLiveAuth = () => (typeof window !== 'undefined' ? getFirebaseAuth() : auth);

const STORAGE_CURRENT_USER_KEY = 'phil_counseling_current_user';
const STORAGE_SESSIONS_PREFIX = 'phil_counseling_sessions_';
const STORAGE_REACTIONS_PREFIX = 'phil_counseling_reactions_';
const STORAGE_MIGRATED_PREFIX = 'phil_counseling_migrated_';

// -------------------------------------------------------------
// Current User Helper (Synchronous Local Cache + Firebase Auth)
// -------------------------------------------------------------

export function getCurrentUser(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveCurrentUserToCache(profile: UserProfile | null) {
  if (typeof window === 'undefined') return;
  try {
    if (profile) {
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    }
  } catch (e) {}
}

/**
 * Real-time Firebase Auth listener.
 * Synchronizes user authentication state across all browser tabs and devices.
 */
export function subscribeAuthState(callback: (user: UserProfile | null) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  return onAuthStateChanged(getLiveAuth(), async (firebaseUser: FirebaseUser | null) => {
    if (firebaseUser) {
      let displayName = firebaseUser.displayName || '';

      // Try fetching existing profile name from Firestore if displayName is empty
      if (!displayName) {
        try {
          const userDoc = await getDoc(doc(getLiveDb(), 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            displayName = userDoc.data()?.name || '';
          }
        } catch (e) {}
      }

      const profile: UserProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: displayName || '고민자',
        createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
      };

      saveCurrentUserToCache(profile);
      callback(profile);
    } else {
      saveCurrentUserToCache(null);
      callback(null);
    }
  });
}

// -------------------------------------------------------------
// Firebase Authentication Methods
// -------------------------------------------------------------

export async function firebaseSignup(
  email: string,
  password: string,
  name: string
): Promise<UserProfile> {
  const trimmedEmail = email.trim();
  const trimmedName = name.trim() || '고민자';

  const userCredential = await createUserWithEmailAndPassword(getLiveAuth(), trimmedEmail, password);
  const user = userCredential.user;

  if (trimmedName) {
    await updateProfile(user, { displayName: trimmedName });
  }

  const profile: UserProfile = {
    id: user.uid,
    email: user.email || trimmedEmail,
    name: trimmedName,
    createdAt: new Date().toISOString(),
  };

  // Upsert user profile document in Firestore users/{uid}
  try {
    await setDoc(
      doc(getLiveDb(), 'users', user.uid),
      {
        id: user.uid,
        email: profile.email,
        name: profile.name,
        createdAt: profile.createdAt,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('Firestore user doc create warning:', e);
  }

  saveCurrentUserToCache(profile);
  return profile;
}

export async function firebaseLogin(email: string, password: string): Promise<UserProfile> {
  const userCredential = await signInWithEmailAndPassword(getLiveAuth(), email.trim(), password);
  const user = userCredential.user;

  let displayName = user.displayName || '';
  try {
    const userDoc = await getDoc(doc(getLiveDb(), 'users', user.uid));
    if (userDoc.exists()) {
      displayName = userDoc.data()?.name || displayName;
    }
  } catch (e) {}

  const profile: UserProfile = {
    id: user.uid,
    email: user.email || email,
    name: displayName || '고민자',
    createdAt: user.metadata.creationTime || new Date().toISOString(),
  };

  saveCurrentUserToCache(profile);
  return profile;
}

export async function firebaseDemoLogin(): Promise<UserProfile> {
  const demoEmail = 'demo@counselor.kr';
  const demoPassword = 'demoUser2026!';
  const demoName = '체험 사용자';

  try {
    return await firebaseLogin(demoEmail, demoPassword);
  } catch (err: any) {
    // If demo account doesn't exist yet, auto-provision it
    if (
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/wrong-password'
    ) {
      return await firebaseSignup(demoEmail, demoPassword, demoName);
    }
    throw err;
  }
}

export async function logoutUser(): Promise<void> {
  saveCurrentUserToCache(null);
  try {
    await signOut(getLiveAuth());
  } catch (e) {}
}

// -------------------------------------------------------------
// Cloud Firestore Real-time Chat Sessions (users/{uid}/sessions)
// -------------------------------------------------------------

export function getUserSessions(userId: string): ChatSession[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_SESSIONS_PREFIX}${userId}`);
    const list: ChatSession[] = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

/**
 * Subscribe to real-time Cloud Firestore updates for user's chat sessions.
 * Automatically keeps all logged-in devices in sync.
 */
export function subscribeUserSessions(
  userId: string,
  callback: (sessions: ChatSession[]) => void
): () => void {
  if (typeof window === 'undefined' || !userId || userId === 'guest') {
    return () => {};
  }

  const sessionsRef = collection(getLiveDb(), 'users', userId, 'sessions');

  return onSnapshot(
    query(sessionsRef),
    (snapshot) => {
      const remoteSessions: ChatSession[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as ChatSession;
        if (data && data.id) {
          remoteSessions.push({
            ...data,
            id: docSnap.id,
          });
        }
      });

      // Sort newest updated first
      remoteSessions.sort(
        (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
      );

      // Cache locally for instant loading
      try {
        localStorage.setItem(
          `${STORAGE_SESSIONS_PREFIX}${userId}`,
          JSON.stringify(remoteSessions)
        );
      } catch (e) {}

      callback(remoteSessions);
    },
    (error) => {
      console.warn('Firestore sessions subscription error:', error);
    }
  );
}

export async function saveUserSession(userId: string, session: ChatSession): Promise<void> {
  if (typeof window === 'undefined' || !session || !session.id) return;

  // 1. Immediately update local storage cache for zero-latency local UI response
  try {
    const sessions = getUserSessions(userId);
    const existingIndex = sessions.findIndex((s) => s.id === session.id);
    const nowIso = new Date().toISOString();
    const updatedSession = { ...session, updatedAt: nowIso };

    if (existingIndex >= 0) {
      sessions[existingIndex] = updatedSession;
    } else {
      sessions.unshift(updatedSession);
    }

    localStorage.setItem(`${STORAGE_SESSIONS_PREFIX}${userId}`, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to cache session locally:', e);
  }

  // 2. Persist to Cloud Firestore if logged in
  if (userId && userId !== 'guest' && getLiveAuth().currentUser) {
    try {
      const sessionDocRef = doc(getLiveDb(), 'users', userId, 'sessions', session.id);
      // Clean undefined fields for Firestore serialization
      const cleanData = JSON.parse(JSON.stringify(session));
      await setDoc(sessionDocRef, cleanData, { merge: true });
    } catch (e) {
      console.error('Failed to save session to Firestore:', e);
    }
  }
}

export async function deleteUserSession(userId: string, sessionId: string): Promise<void> {
  if (typeof window === 'undefined') return;

  // 1. Delete from local cache
  try {
    const sessions = getUserSessions(userId).filter((s) => s.id !== sessionId);
    localStorage.setItem(`${STORAGE_SESSIONS_PREFIX}${userId}`, JSON.stringify(sessions));
  } catch (e) {
    console.error('Failed to delete session locally:', e);
  }

  // 2. Delete from Cloud Firestore if logged in
  if (userId && userId !== 'guest' && getLiveAuth().currentUser) {
    try {
      const sessionDocRef = doc(getLiveDb(), 'users', userId, 'sessions', sessionId);
      await deleteDoc(sessionDocRef);
    } catch (e) {
      console.error('Failed to delete session from Firestore:', e);
    }
  }
}

// -------------------------------------------------------------
// Cloud Firestore Real-time Reactions / Value System
// -------------------------------------------------------------

export function getUserReactions(userId: string): LikedAdvice[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${STORAGE_REACTIONS_PREFIX}${userId}`);
    const list: LikedAdvice[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) return [];
    return list.map((item) => {
      const canonId = canonicalAgentId(item.agentId);
      const meta = getAgentMeta(canonId);
      return {
        ...item,
        agentId: canonId,
        agentName: meta.name,
        agentStance: meta.stance,
      };
    });
  } catch (e) {
    return [];
  }
}

export function saveUserReactions(userId: string, reactions: LikedAdvice[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_REACTIONS_PREFIX}${userId}`, JSON.stringify(reactions));
  } catch (e) {}

  if (userId && userId !== 'guest' && getLiveAuth().currentUser) {
    setDoc(
      doc(getLiveDb(), 'users', userId),
      {
        userLikes: JSON.parse(JSON.stringify(reactions)),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch((e) => console.warn('Firestore saveUserReactions error:', e));
  }
}

/**
 * Subscribe to real-time Cloud Firestore updates for user's reactions/value system.
 */
export function subscribeUserReactions(
  userId: string,
  callback: (reactions: LikedAdvice[]) => void
): () => void {
  if (typeof window === 'undefined' || !userId || userId === 'guest') {
    return () => {};
  }

  const userDocRef = doc(getLiveDb(), 'users', userId);

  return onSnapshot(
    userDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const rawLikes = docSnap.data()?.userLikes || [];
        if (Array.isArray(rawLikes)) {
          const normalized = rawLikes.map((item: any) => {
            const canonId = canonicalAgentId(item.agentId);
            const meta = getAgentMeta(canonId);
            return {
              ...item,
              agentId: canonId,
              agentName: meta.name,
              agentStance: meta.stance,
            };
          });

          try {
            localStorage.setItem(
              `${STORAGE_REACTIONS_PREFIX}${userId}`,
              JSON.stringify(normalized)
            );
          } catch (e) {}

          callback(normalized);
        }
      }
    },
    (err) => {
      console.warn('Firestore reactions subscription error:', err);
    }
  );
}

export function toggleUserReaction(
  userId: string,
  advice: LikedAdvice
): { isLiked: boolean; reactions: LikedAdvice[] } {
  if (typeof window === 'undefined') return { isLiked: false, reactions: [] };
  const current = getUserReactions(userId);
  const existingIdx = current.findIndex((item) => item.messageId === advice.messageId);

  let updated: LikedAdvice[];
  let isLiked: boolean;

  if (existingIdx >= 0) {
    updated = current.filter((item) => item.messageId !== advice.messageId);
    isLiked = false;
  } else {
    const canonId = canonicalAgentId(advice.agentId);
    const meta = getAgentMeta(canonId);
    const normalizedAdvice: LikedAdvice = {
      ...advice,
      agentId: canonId,
      agentName: meta.name,
      agentStance: meta.stance,
    };
    updated = [normalizedAdvice, ...current];
    isLiked = true;
  }

  saveUserReactions(userId, updated);
  return { isLiked, reactions: updated };
}

export function migrateGuestReactions(targetUserId: string): void {
  if (typeof window === 'undefined' || targetUserId === 'guest') return;
  const guestReactions = getUserReactions('guest');
  if (guestReactions.length === 0) return;

  const targetReactions = getUserReactions(targetUserId);
  const targetMap = new Map(targetReactions.map((r) => [r.messageId, r]));

  guestReactions.forEach((r) => {
    if (!targetMap.has(r.messageId)) {
      targetMap.set(r.messageId, r);
    }
  });

  saveUserReactions(targetUserId, Array.from(targetMap.values()));
}

// -------------------------------------------------------------
// Local Data to Cloud Firestore Migration Option
// -------------------------------------------------------------

export interface LocalDataSummary {
  hasData: boolean;
  sessionsCount: number;
  reactionsCount: number;
  sessions: ChatSession[];
  reactions: LikedAdvice[];
}

/**
 * Scan localStorage for local guest sessions or un-migrated records on this device.
 */
export function getLocalDataToMigrate(currentUserId: string): LocalDataSummary {
  if (typeof window === 'undefined') {
    return { hasData: false, sessionsCount: 0, reactionsCount: 0, sessions: [], reactions: [] };
  }

  // If already migrated to this account, don't re-prompt
  const migratedFlag = localStorage.getItem(`${STORAGE_MIGRATED_PREFIX}${currentUserId}`);
  if (migratedFlag === 'true') {
    return { hasData: false, sessionsCount: 0, reactionsCount: 0, sessions: [], reactions: [] };
  }

  // Collect guest data and any pre-existing local data
  const guestSessions = getUserSessions('guest');
  const userCachedSessions = getUserSessions(currentUserId);
  const allSessionsMap = new Map<string, ChatSession>();

  guestSessions.forEach((s) => allSessionsMap.set(s.id, s));
  userCachedSessions.forEach((s) => allSessionsMap.set(s.id, s));

  const guestReactions = getUserReactions('guest');
  const userCachedReactions = getUserReactions(currentUserId);
  const allReactionsMap = new Map<string, LikedAdvice>();

  guestReactions.forEach((r) => allReactionsMap.set(r.messageId, r));
  userCachedReactions.forEach((r) => allReactionsMap.set(r.messageId, r));

  const sessions = Array.from(allSessionsMap.values());
  const reactions = Array.from(allReactionsMap.values());
  const hasData = sessions.length > 0 || reactions.length > 0;

  return {
    hasData,
    sessionsCount: sessions.length,
    reactionsCount: reactions.length,
    sessions,
    reactions,
  };
}

/**
 * Migrate all collected local sessions and reactions into Cloud Firestore under users/{uid}
 */
export async function migrateLocalDataToFirestore(
  currentUserId: string
): Promise<{ migratedSessions: number; migratedReactions: number }> {
  if (typeof window === 'undefined' || !currentUserId || currentUserId === 'guest') {
    return { migratedSessions: 0, migratedReactions: 0 };
  }

  const data = getLocalDataToMigrate(currentUserId);
  if (!data.hasData) {
    return { migratedSessions: 0, migratedReactions: 0 };
  }

  // 1. Migrate sessions to users/{uid}/sessions/{sessionId}
  for (const session of data.sessions) {
    try {
      const sessionDocRef = doc(getLiveDb(), 'users', currentUserId, 'sessions', session.id);
      const cleanData = JSON.parse(
        JSON.stringify({
          ...session,
          userId: currentUserId,
          updatedAt: session.updatedAt || new Date().toISOString(),
        })
      );
      await setDoc(sessionDocRef, cleanData, { merge: true });
    } catch (e) {
      console.warn(`Failed to migrate session ${session.id}:`, e);
    }
  }

  // 2. Migrate reactions to users/{uid}
  if (data.reactions.length > 0) {
    try {
      saveUserReactions(currentUserId, data.reactions);
    } catch (e) {
      console.warn('Failed to migrate reactions:', e);
    }
  }

  // 3. Mark migration as completed in localStorage so user isn't prompted again
  try {
    localStorage.setItem(`${STORAGE_MIGRATED_PREFIX}${currentUserId}`, 'true');
  } catch (e) {}

  return {
    migratedSessions: data.sessionsCount,
    migratedReactions: data.reactionsCount,
  };
}

/**
 * Mark migration as skipped when user explicitly opts out.
 */
export function skipLocalDataMigration(currentUserId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_MIGRATED_PREFIX}${currentUserId}`, 'skipped');
  } catch (e) {}
}
