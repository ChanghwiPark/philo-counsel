#!/usr/bin/env node

/**
 * Developer Export Script: export_events.mjs
 * 
 * Usage:
 *   node scripts/export_events.mjs --format=json
 *   node scripts/export_events.mjs --format=csv
 *   node scripts/export_events.mjs --limit=1000 --type=like_clicked
 *   node scripts/export_events.mjs --out=./research_events.csv
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load .env.local if present
function loadEnv() {
  const envPath = path.join(rootDir, '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[match[1]] = value;
      }
    }
  }
}
loadEnv();

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'philo-counsel.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'philo-counsel',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'philo-counsel.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '9328773525',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:9328773525:web:e730a9297c3b0149b7ce9c',
};

// Parse command line arguments
const args = process.argv.slice(2);
function getArg(key, defaultValue) {
  const arg = args.find((a) => a.startsWith(`--${key}=`));
  if (arg) return arg.split('=')[1];
  return defaultValue;
}

const format = (getArg('format', 'json')).toLowerCase();
const limitCount = parseInt(getArg('limit', '500'), 10);
const eventType = getArg('type', null);
const outPathArg = getArg('out', null);

async function main() {
  console.log(`[Philo Telemetry Export] Connecting to project: ${firebaseConfig.projectId}...`);
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  const db = getFirestore(app);

  const eventsCol = collection(db, 'events');
  let q = query(eventsCol, orderBy('createdAt', 'desc'), limit(limitCount));
  if (eventType) {
    q = query(eventsCol, where('eventType', '==', eventType), limit(limitCount));
  }

  console.log(`[Philo Telemetry Export] Fetching up to ${limitCount} events${eventType ? ` (type: ${eventType})` : ''}...`);
  const snapshot = await getDocs(q);
  const rows = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  console.log(`[Philo Telemetry Export] Retrieved ${rows.length} event records.`);

  let outputContent = '';
  const timestampStr = new Date().toISOString().slice(0, 10);
  const defaultFileName = `events_export_${timestampStr}.${format}`;
  const outPath = outPathArg ? path.resolve(process.cwd(), outPathArg) : path.join(rootDir, defaultFileName);

  if (format === 'csv') {
    if (rows.length === 0) {
      outputContent = 'id,eventType,sessionId,userId,timestamp\n';
    } else {
      const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
      const lines = [headers.join(',')];
      for (const row of rows) {
        const values = headers.map((h) => {
          const val = row[h];
          if (val === undefined || val === null) return '""';
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        });
        lines.push(values.join(','));
      }
      outputContent = lines.join('\n');
    }
  } else {
    outputContent = JSON.stringify(rows, null, 2);
  }

  fs.writeFileSync(outPath, outputContent, 'utf8');
  console.log(`[Philo Telemetry Export] Successfully exported to: ${outPath} (${outputContent.length} bytes)`);

  // Event type breakdown
  const breakdown = {};
  for (const r of rows) {
    breakdown[r.eventType] = (breakdown[r.eventType] || 0) + 1;
  }
  console.log('[Philo Telemetry Export] Event Breakdown:', breakdown);
}

main().catch((err) => {
  console.error('[Philo Telemetry Export] Error:', err.message);
  process.exit(1);
});
