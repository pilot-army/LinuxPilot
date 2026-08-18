import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { OPERATION_STATUSES, type ServerOperation } from '@linuxpilot/server-contracts';
import { ApiRequestError } from '../../api/client';
import { listServerOperations } from '../../api/servers';
import { periodToRange, type OperationsQueryState } from './query';

type OperationsState = {
  items: ServerOperation[];
  total: number;
  status: 'loading' | 'refreshing' | 'success' | 'empty' | 'error';
  error: 'network' | 'forbidden' | 'generic' | null;
  lastSuccessfulAt: string | null;
};

export function useOperations(query: OperationsQueryState) {
  const [state, setState] = useState<OperationsState>({
    items: [],
    total: 0,
    status: 'loading',
    error: null,
    lastSuccessfulAt: null,
  });
  const inFlight = useRef<Promise<void> | null>(null);
  const hasLoaded = useRef(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh', cancelled?: { current: boolean }) => {
      if (mode === 'refresh' && inFlight.current) {
        return inFlight.current;
      }
      setState((current) => ({
        ...current,
        status: hasLoaded.current ? 'refreshing' : 'loading',
      }));
      const params = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
      });
      if (query.serverId) params.set('serverId', query.serverId);
      if (query.type) params.set('type', query.type);
      if (query.status) params.set('status', query.status);
      if (query.requestedBy) params.set('requestedBy', query.requestedBy);
      const range = periodToRange(query.period);
      if (range.from) params.set('from', range.from);
      if (range.to) params.set('to', range.to);

      const request = listServerOperations(params)
        .then((result) => {
          if (cancelled?.current) return;
          hasLoaded.current = true;
          const needle = query.q.trim().toLowerCase();
          const filtered = needle
            ? result.items.filter((item) =>
                [item.id, item.serverId, item.serverName ?? '', item.type, item.status]
                  .join(' ')
                  .toLowerCase()
                  .includes(needle),
              )
            : result.items;
          const sorted =
            query.sort === 'status'
              ? [...filtered].sort((a, b) => a.status.localeCompare(b.status))
              : filtered;
          setState({
            items: sorted,
            total: result.total,
            status: sorted.length === 0 ? 'empty' : 'success',
            error: null,
            lastSuccessfulAt: new Date().toISOString(),
          });
        })
        .catch((cause) => {
          if (cancelled?.current) return;
          setState((current) => ({
            ...current,
            status: 'error',
            error:
              cause instanceof ApiRequestError &&
              (cause.status === 0 || cause.code === 'NETWORK_ERROR')
                ? 'network'
                : cause instanceof ApiRequestError && cause.status === 403
                  ? 'forbidden'
                  : 'generic',
          }));
        })
        .finally(() => {
          inFlight.current = null;
        });
      inFlight.current = request;
      return request;
    },
    [query],
  );

  useEffect(() => {
    const cancelled = { current: false };
    void load(hasLoaded.current ? 'refresh' : 'initial', cancelled);
    return () => {
      cancelled.current = true;
    };
  }, [load]);

  useEffect(() => {
    if (query.refresh <= 0) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void load('refresh');
    }, query.refresh * 1000);
    return () => window.clearInterval(timer);
  }, [load, query.refresh]);

  const counts = useMemo(() => {
    const queued = state.items.filter(
      (item) => item.status === OPERATION_STATUSES.PENDING || item.status === OPERATION_STATUSES.DELIVERED,
    ).length;
    const running = state.items.filter((item) => item.status === OPERATION_STATUSES.RUNNING).length;
    const completed = state.items.filter((item) => item.status === OPERATION_STATUSES.SUCCEEDED).length;
    const errors = state.items.filter(
      (item) => item.status === OPERATION_STATUSES.FAILED || item.status === OPERATION_STATUSES.EXPIRED,
    ).length;
    return { queued, running, completed, errors };
  }, [state.items]);

  return {
    ...state,
    counts,
    refresh: () => load('refresh'),
    refreshing: state.status === 'refreshing',
  };
}
