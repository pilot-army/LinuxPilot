import { useCallback, useEffect, useRef, useState } from 'react';
import type { ServerAuditEvent } from '@linuxpilot/server-contracts';
import { ApiRequestError } from '../../api/client';
import { listServerAudit } from '../../api/servers';
import { sanitizeRecord } from '../servers/sanitize';
import { periodToRange, type AuditQueryState } from './query';

type AuditState = {
  items: ServerAuditEvent[];
  total: number;
  status: 'loading' | 'refreshing' | 'success' | 'empty' | 'error';
  error: 'network' | 'forbidden' | 'generic' | null;
  lastSuccessfulAt: string | null;
};

export function useAudit(query: AuditQueryState, enabled: boolean) {
  const [state, setState] = useState<AuditState>({
    items: [],
    total: 0,
    status: enabled ? 'loading' : 'empty',
    error: null,
    lastSuccessfulAt: null,
  });
  const inFlight = useRef<Promise<void> | null>(null);
  const hasLoaded = useRef(false);

  const load = useCallback(
    async (mode: 'initial' | 'refresh', cancelled?: { current: boolean }) => {
      if (!enabled) return;
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
      if (query.actorId) params.set('actorId', query.actorId);
      if (query.action) params.set('action', query.action);
      if (query.serverId) params.set('serverId', query.serverId);
      if (query.result) params.set('result', query.result);
      const range = periodToRange(query.period);
      if (range.from) params.set('from', range.from);
      if (range.to) params.set('to', range.to);

      const request = listServerAudit(params)
        .then((result) => {
          if (cancelled?.current) return;
          hasLoaded.current = true;
          const needle = query.q.trim().toLowerCase();
          const items = result.items.map((item) => ({
            ...item,
            metadata: sanitizeRecord(item.metadata),
          }));
          const filtered = needle
            ? items.filter((item) =>
                [item.action, item.actorId ?? '', item.targetType ?? '', item.serverId ?? '', item.id]
                  .join(' ')
                  .toLowerCase()
                  .includes(needle),
              )
            : items;
          setState({
            items: filtered,
            total: result.total ?? filtered.length,
            status: filtered.length === 0 ? 'empty' : 'success',
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
    [enabled, query],
  );

  useEffect(() => {
    const cancelled = { current: false };
    void load(hasLoaded.current ? 'refresh' : 'initial', cancelled);
    return () => {
      cancelled.current = true;
    };
  }, [load]);

  useEffect(() => {
    if (!enabled || query.refresh <= 0) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') return;
      void load('refresh');
    }, query.refresh * 1000);
    return () => window.clearInterval(timer);
  }, [enabled, load, query.refresh]);

  return {
    ...state,
    refresh: () => load('refresh'),
    refreshing: state.status === 'refreshing',
  };
}
