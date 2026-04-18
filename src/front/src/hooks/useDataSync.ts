/**
 * src/hooks/useDataSync.ts
 * Cross-tab data synchronization using BroadcastChannel API.
 * 
 * Usage:
 *   const { broadcast } = useDataSync('projects', onUpdate);
 *   broadcast({ type: 'updated', id: project.id });   // notify other tabs
 * 
 * Supported channels: 'projects' | 'councils' | 'contracts' | 'settlements' | 'notifications'
 */
import { useEffect, useRef, useCallback } from 'react';

export type DataSyncEvent<T = unknown> = {
  type: 'created' | 'updated' | 'deleted' | 'refreshed';
  id?: string;
  payload?: T;
  timestamp: number;
};

export function useDataSync<T = unknown>(
  channelName: string,
  onMessage: (event: DataSyncEvent<T>) => void,
) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const onMessageRef = useRef(onMessage);

  // Keep callback ref current without re-subscribing
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;

    const channel = new BroadcastChannel(`nckh_${channelName}`);
    channelRef.current = channel;

    channel.onmessage = (ev: MessageEvent<DataSyncEvent<T>>) => {
      if (ev.data && ev.data.type) {
        onMessageRef.current(ev.data);
      }
    };

    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, [channelName]);

  const broadcast = useCallback((event: Omit<DataSyncEvent<T>, 'timestamp'>) => {
    channelRef.current?.postMessage({ ...event, timestamp: Date.now() });
  }, []);

  return { broadcast };
}
