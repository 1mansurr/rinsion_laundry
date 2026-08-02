/**
 * lib/offlineQueue.ts
 *
 * Local queue for the three offline-capable actions (M5): create order,
 * record payment, advance status. Actions are only ever queued when the
 * real request fails with a NetworkError (lib/api.ts) — a genuine
 * validation/business error surfaces to the user immediately instead.
 *
 * Not a general sync engine: this device is the only writer, actions replay
 * in the order they were queued, and create-order/record-payment carry a
 * client-generated id the backend uses to no-op a retried request that
 * actually already succeeded (see src/services/mobile/idempotency.ts).
 * Status updates don't need that protection — re-applying the same status
 * is a harmless no-op server-side.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiPost, NetworkError } from '@/lib/api';

export type QueuedActionKind = 'create_order' | 'record_payment' | 'update_status';

export interface QueuedAction {
  id: string;
  kind: QueuedActionKind;
  path: string;
  body: Record<string, unknown>;
  createdAt: string;
}

export interface FailedAction extends QueuedAction {
  error: string;
  failedAt: string;
}

const QUEUE_KEY = 'offline_queue_v1';
const FAILED_KEY = 'offline_queue_failed_v1';

let queue: QueuedAction[] = [];
let failed: FailedAction[] = [];
let hydrated = false;
let isProcessing = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(l => l());
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getQueueSnapshot(): QueuedAction[] {
  return queue;
}

export function getFailedSnapshot(): FailedAction[] {
  return failed;
}

async function persist() {
  await Promise.all([
    AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue)),
    AsyncStorage.setItem(FAILED_KEY, JSON.stringify(failed)),
  ]);
}

export async function hydrate(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  const [storedQueue, storedFailed] = await Promise.all([
    AsyncStorage.getItem(QUEUE_KEY),
    AsyncStorage.getItem(FAILED_KEY),
  ]);
  queue = storedQueue ? JSON.parse(storedQueue) : [];
  failed = storedFailed ? JSON.parse(storedFailed) : [];
  notify();
}

/**
 * Not cryptographically secure — doesn't need to be, only unique enough for
 * one device's own queue to key an idempotency check server-side. Callers
 * generate this BEFORE the first (live) attempt and reuse the same value if
 * that attempt fails and the action gets queued, so a create-order/
 * record-payment retry carries the identical clientRequestId as the
 * original attempt — required for the idempotency check to work at all.
 */
export function generateOfflineActionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Queues an action for later, immediately (optimistic) — call only after a NetworkError from the real request. */
export async function enqueueAction(id: string, kind: QueuedActionKind, path: string, body: Record<string, unknown>): Promise<void> {
  await hydrate();
  queue = [...queue, { id, kind, path, body, createdAt: new Date().toISOString() }];
  await persist();
  notify();
}

export async function clearFailedAction(id: string): Promise<void> {
  await hydrate();
  failed = failed.filter(f => f.id !== id);
  await persist();
  notify();
}

/**
 * Replays the queue in order against the real API. Called on reconnect and
 * on app foreground. Stops at the first NetworkError (still offline) leaving
 * the rest queued; a genuine server rejection moves that one item to the
 * failed list (surfaced to the user) and continues with the rest, since a
 * rejection is specific to that action, not a sign we're offline.
 */
export async function processQueue(): Promise<void> {
  await hydrate();
  if (isProcessing) return;
  isProcessing = true;
  try {
    while (queue.length > 0) {
      const [next, ...rest] = queue;
      try {
        await apiPost(next.path, next.body);
        queue = rest;
        await persist();
        notify();
      } catch (err) {
        if (err instanceof NetworkError) break;
        queue = rest;
        failed = [...failed, { ...next, error: err instanceof Error ? err.message : 'Failed to sync.', failedAt: new Date().toISOString() }];
        await persist();
        notify();
      }
    }
  } finally {
    isProcessing = false;
  }
}
