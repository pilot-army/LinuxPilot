import { useCallback, useEffect, useState } from 'react';
import { getServer, getServerAudit } from '../../api/servers';
import { ApiRequestError } from '../../api/client';
import type { InspectorState } from './types';

export function useServerInspector(serverId: string) {
  const [state, setState] = useState<InspectorState>({
    status: 'idle',
    server: null,
    lastEvent: null,
    error: null,
  });
  const [tick, setTick] = useState(0);
  const retry = useCallback(() => setTick((value) => value + 1), []);

  useEffect(() => {
    if (!serverId) {
      setState({ status: 'idle', server: null, lastEvent: null, error: null });
      return;
    }
    let cancelled = false;
    setState((current) => ({ ...current, status: 'loading', error: null }));
    Promise.all([getServer(serverId), getServerAudit(serverId)])
      .then(([server, audit]) => {
        if (cancelled) {
          return;
        }
        const last = audit.items[0] ?? null;
        setState({
          status: 'success',
          server,
          lastEvent: last ? { action: last.action, createdAt: last.createdAt } : null,
          error: null,
        });
      })
      .catch((cause) => {
        if (cancelled) {
          return;
        }
        setState({
          status: 'error',
          server: null,
          lastEvent: null,
          error:
            cause instanceof ApiRequestError &&
            (cause.status === 0 || cause.code === 'NETWORK_ERROR')
              ? 'network'
              : cause instanceof ApiRequestError && cause.status === 403
                ? 'forbidden'
                : 'generic',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [serverId, tick]);

  return { ...state, retry };
}
