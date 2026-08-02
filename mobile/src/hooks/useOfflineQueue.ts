import { useEffect, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useNetworkState } from 'expo-network';

import {
  clearFailedAction,
  getFailedSnapshot,
  getQueueSnapshot,
  hydrate,
  processQueue,
  subscribe,
  type FailedAction,
  type QueuedAction,
} from '@/lib/offlineQueue';

interface OfflineQueueState {
  pending: QueuedAction[];
  failed: FailedAction[];
  clearFailed: (id: string) => void;
}

/** Hydrates the queue once and auto-replays it on reconnect / app foreground — mount near the app root so it's always active, not per-screen. */
export function useOfflineQueue(): OfflineQueueState {
  const network = useNetworkState();
  const pending = useSyncExternalStore(subscribe, getQueueSnapshot);
  const failed = useSyncExternalStore(subscribe, getFailedSnapshot);

  useEffect(() => {
    hydrate().then(() => processQueue());
  }, []);

  useEffect(() => {
    if (network.isInternetReachable) processQueue();
  }, [network.isInternetReachable]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') processQueue();
    });
    return () => sub.remove();
  }, []);

  return { pending, failed, clearFailed: clearFailedAction };
}
