import fs from 'fs';
import os from 'os';
import path from 'path';

// The socket server limits "new user" and "new session" events to 20 per
// minute per address, and every browser context in this suite shares one
// address. Tests that make the app create a user or session through the UI
// take a slot here first, coordinated across worker processes with a lock
// directory, so parallel runs never trip the (intentional) rate limit.
const FILE = path.join(os.tmpdir(), 'ezpoll-e2e-rate-budget.json');
const LOCK = `${FILE}.lock`;
const LIMIT = 16; // the server allows 20, the rest is headroom
const WINDOW_MS = 60_000;

export type Bucket = 'users' | 'sessions';
type Stamps = Record<Bucket, number[]>;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function withLock<T>(fn: () => T): Promise<T> {
  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      fs.mkdirSync(LOCK);
      break;
    } catch {
      try {
        if (Date.now() - fs.statSync(LOCK).mtimeMs > 5_000) fs.rmdirSync(LOCK);
      } catch { /* another worker released it */ }
      if (Date.now() > deadline) throw new Error('rate budget lock timeout');
      await sleep(15);
    }
  }
  try {
    return fn();
  } finally {
    try { fs.rmdirSync(LOCK); } catch { /* ignore */ }
  }
}

/** Waits until the given creations fit into the server's per-minute limits, then reserves them. */
export async function takeCreationSlots(wanted: Partial<Record<Bucket, number>>): Promise<void> {
  for (;;) {
    const waitMs = await withLock(() => {
      const now = Date.now();
      let stamps: Stamps = { users: [], sessions: [] };
      try { stamps = { ...stamps, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch { /* first use */ }
      let wait = 0;
      for (const bucket of ['users', 'sessions'] as Bucket[]) {
        stamps[bucket] = stamps[bucket].filter(t => now - t < WINDOW_MS);
        const count = wanted[bucket] ?? 0;
        if (count > 0 && stamps[bucket].length + count > LIMIT) {
          wait = Math.max(wait, WINDOW_MS - (now - stamps[bucket][0]), 50);
        }
      }
      if (wait > 0) return wait;
      for (const bucket of ['users', 'sessions'] as Bucket[]) {
        for (let i = 0; i < (wanted[bucket] ?? 0); i++) stamps[bucket].push(now);
      }
      fs.writeFileSync(FILE, JSON.stringify(stamps));
      return 0;
    });
    if (waitMs === 0) return;
    await sleep(Math.min(waitMs, 2_000));
  }
}
