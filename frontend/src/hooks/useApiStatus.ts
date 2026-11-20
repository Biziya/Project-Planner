import { useEffect, useState } from 'react';
import { api } from '../api/api';

export type ApiStatus = 'checking' | 'online' | 'offline';

export const API_STATUS_INTERVAL_MS = 30_000;

/**
 * Whether the API answers: calls `check` on mount, every `intervalMs`, and when the browser comes back online.
 * The browser's `offline` event sets offline straight away.
 */
export function useApiStatus(check: () => Promise<unknown> = api.health, intervalMs = API_STATUS_INTERVAL_MS): ApiStatus {
  const [status, setStatus] = useState<ApiStatus>('checking');

  useEffect(() => {
    let active = true;
    const run = () => {
      check().then(
        () => { if (active) setStatus('online'); },
        () => { if (active) setStatus('offline'); },
      );
    };
    const goOffline = () => setStatus('offline');

    run();
    const timer = window.setInterval(run, intervalMs);
    window.addEventListener('online', run);
    window.addEventListener('offline', goOffline);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('online', run);
      window.removeEventListener('offline', goOffline);
    };
  }, [check, intervalMs]);

  return status;
}
