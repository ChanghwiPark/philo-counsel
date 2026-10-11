'use client';

import { collection, addDoc, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { logEvent } from 'firebase/analytics';
import { getFirebaseDb, getFirebaseAnalytics, getFirebaseAuth } from './firebase';

export type AppEventType =
  | 'session_start'
  | 'user_query_submit'
  | 'agent_response_generated'
  | 'like_clicked'
  | 'idle_proactive_nudge'
  | 'session_end';

// Telemetry Exclusion Configuration:
// Author / Admin users are completely excluded from research analytics & telemetry to avoid data contamination.
export const EXCLUDED_TELEMETRY_EMAILS = [
  'changhwipark@kaist.ac.kr',
];

export const EXCLUDED_TELEMETRY_USER_IDS = [
  'uDnzScPtCATn3uBQpUhjC5Ct1eM2', // Changhwi Park
];

const EXCLUDED_DEVICE_KEY = 'philo_research_excluded_device';

/**
 * Checks whether the current user or device is an author/admin who should be excluded from telemetry.
 */
export function isTelemetryExcludedUser(explicitUserId?: string): boolean {
  if (typeof window === 'undefined') return false;

  // 1. Check explicit userId
  if (explicitUserId && EXCLUDED_TELEMETRY_USER_IDS.includes(explicitUserId)) {
    return true;
  }

  try {
    // 2. Check localStorage cached profile
    const rawUser = localStorage.getItem('phil_counseling_current_user');
    if (rawUser) {
      const parsed = JSON.parse(rawUser);
      if (parsed?.id && EXCLUDED_TELEMETRY_USER_IDS.includes(parsed.id)) {
        return true;
      }
      const email = parsed?.email?.toLowerCase()?.trim();
      if (email) {
        if (EXCLUDED_TELEMETRY_EMAILS.includes(email)) {
          localStorage.setItem(EXCLUDED_DEVICE_KEY, 'true');
          return true;
        } else {
          localStorage.removeItem(EXCLUDED_DEVICE_KEY);
        }
      }
    }

    // 3. Check live Firebase Auth user
    const auth = getFirebaseAuth();
    if (auth?.currentUser) {
      if (auth.currentUser.uid && EXCLUDED_TELEMETRY_USER_IDS.includes(auth.currentUser.uid)) {
        return true;
      }
      const email = auth.currentUser.email?.toLowerCase()?.trim();
      if (email) {
        if (EXCLUDED_TELEMETRY_EMAILS.includes(email)) {
          localStorage.setItem(EXCLUDED_DEVICE_KEY, 'true');
          return true;
        } else {
          localStorage.removeItem(EXCLUDED_DEVICE_KEY);
        }
      }
    }

    // 4. Check persistent device exclusion marker
    if (localStorage.getItem(EXCLUDED_DEVICE_KEY) === 'true') {
      return true;
    }
  } catch {
    // Graceful fallback
  }

  return false;
}

// Research Data Configuration:
// Raw user dilemma queries, agent responses, and interaction texts are collected directly into Firestore for qualitative research analysis.
export const STORE_RAW_QUERY_TEXT = true;

const ANON_DEVICE_KEY = 'philo_research_anon_device_id';

/**
 * Generates or retrieves a persistent anonymous guest device identifier
 */
export function getAnonymousUserId(): string {
  if (typeof window === 'undefined') return 'server_guest';
  try {
    let anonId = localStorage.getItem(ANON_DEVICE_KEY);
    if (!anonId) {
      anonId = `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(ANON_DEVICE_KEY, anonId);
    }
    return anonId;
  } catch {
    return `anon_${Math.random().toString(36).slice(2, 8)}`;
  }
}

/**
 * Fast non-cryptographic 32-bit hash (FNV-1a) for tracking duplicate/distinct queries without storing text
 */
export function hashString(str: string): string {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Extracts domain from URL for anonymous citation logging (e.g. "ko.wikipedia.org")
 */
export function extractDomain(url?: string): string {
  if (!url) return 'none';
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return 'invalid_url';
  }
}

/**
 * Cleans metadata for Google Analytics: only alphanumeric keys, no PII, primitive values only.
 */
function sanitizeForGoogleAnalytics(
  params: Record<string, any>
): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};

  for (const [key, value] of Object.entries(params)) {
    // Exclude potential sensitive or raw text keys
    if (
      key.includes('raw_') ||
      key.includes('content') ||
      key.includes('message') ||
      key.includes('query_text') ||
      key.includes('email') ||
      key.includes('name') ||
      key.includes('thought')
    ) {
      continue;
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      // GA parameter keys must be <= 40 chars
      const safeKey = key.slice(0, 40);
      // String values must be <= 100 chars
      sanitized[safeKey] = typeof value === 'string' ? value.slice(0, 100) : value;
    }
  }

  return sanitized;
}

export interface LogEventParams {
  sessionId?: string;
  userId?: string;
  isAnonymous?: boolean;
  [key: string]: any;
}

/**
 * Core Non-blocking Logging Dispatcher:
 * Simultaneously records to Firebase Analytics (dashboard aggregation)
 * and Cloud Firestore 'events' collection (raw research telemetry).
 * Never interrupts or throws in the UI thread.
 */
export function logAppEvent(eventType: AppEventType, data: LogEventParams = {}): void {
  if (typeof window === 'undefined') return;

  const targetUserId = data.userId;
  if (isTelemetryExcludedUser(targetUserId)) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[Analytics Excluded] Telemetry event '${eventType}' bypassed for author.`);
    }
    return;
  }

  // Execute asynchronously in background microtask without blocking UX
  Promise.resolve().then(async () => {
    try {
      const timestamp = new Date().toISOString();
      const userId = data.userId || getAnonymousUserId();
      const isAnonymous = data.isAnonymous ?? userId.startsWith('anon_');
      const sessionId = data.sessionId || 'default_session';

      const enrichedPayload: Record<string, any> = {
        ...data,
        eventType,
        sessionId,
        userId,
        isAnonymous,
        timestamp,
        clientTimestampMs: Date.now(),
      };

      // 1. Send to Firebase Analytics
      try {
        const analytics = await getFirebaseAnalytics();
        if (analytics) {
          const gaParams = sanitizeForGoogleAnalytics({
            session_id: sessionId,
            user_id: userId,
            is_anonymous: isAnonymous,
            ...data,
          });
          logEvent(analytics, eventType, gaParams);
        }
      } catch (gaErr) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Analytics] GA dispatch skipped:', gaErr);
        }
      }

      // 2. Send to Cloud Firestore 'events' collection
      try {
        const db = getFirebaseDb();
        if (db) {
          // Construct research log document
          const firestoreDoc: Record<string, any> = {
            eventType,
            sessionId,
            userId,
            isAnonymous,
            timestamp,
            createdAt: Date.now(),
          };

          // Store all research telemetry data and raw texts in Firestore
          for (const [k, v] of Object.entries(data)) {
            if (k === 'sessionId' || k === 'userId' || k === 'isAnonymous') continue;

            if (v !== undefined) {
              firestoreDoc[k] = v;
            }
          }

          const eventsCol = collection(db, 'events');
          await addDoc(eventsCol, firestoreDoc);
        }
      } catch (fsErr) {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[Analytics] Firestore dispatch skipped:', fsErr);
        }
      }
    } catch {
      // Completely silent catch: telemetry must NEVER degrade end-user UX
    }
  });
}

/**
 * Developer utility: Export events from Firestore into JSON or CSV.
 * Also exposed on window.__exportPhiloEvents for developer console inspection.
 */
export async function exportFirestoreEvents(
  format: 'json' | 'csv' = 'json',
  options: { limitCount?: number; eventType?: string; excludeAdmin?: boolean } = {}
): Promise<string> {
  if (typeof window === 'undefined') return '';
  const db = getFirebaseDb();
  if (!db) throw new Error('Firestore is not available');

  const { limitCount = 500, eventType, excludeAdmin = true } = options;
  const eventsCol = collection(db, 'events');
  let q = query(eventsCol, orderBy('createdAt', 'desc'), limit(limitCount));
  if (eventType) {
    q = query(eventsCol, where('eventType', '==', eventType), limit(limitCount));
  }

  const snapshot = await getDocs(q);
  let rows = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  if (excludeAdmin) {
    rows = rows.filter((r: any) => !EXCLUDED_TELEMETRY_USER_IDS.includes(r.userId));
  }

  if (format === 'json') {
    return JSON.stringify(rows, null, 2);
  }

  // Convert to CSV
  if (rows.length === 0) return '';
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const csvLines = [headers.join(',')];

  for (const row of rows) {
    const values = headers.map((header) => {
      const val = (row as any)[header];
      if (val === undefined || val === null) return '""';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    });
    csvLines.push(values.join(','));
  }

  return csvLines.join('\n');
}

// Attach export utility to window for easy developer access in DevTools without any UI changes
if (typeof window !== 'undefined') {
  (window as any).__exportPhiloEvents = async (
    format: 'json' | 'csv' = 'json',
    limitCount: number = 500,
    excludeAdmin: boolean = true
  ) => {
    console.info(`[Philo Analytics] Exporting last ${limitCount} events as ${format.toUpperCase()} (excludeAdmin: ${excludeAdmin})...`);
    try {
      const result = await exportFirestoreEvents(format, { limitCount, excludeAdmin });
      console.info(`[Philo Analytics] Export complete (${result.length} bytes).`);

      const blob = new Blob([result], {
        type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `philo_events_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return result;
    } catch (err: any) {
      console.error('[Philo Analytics] Export failed:', err.message);
      throw err;
    }
  };
}
