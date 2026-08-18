import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SERVER_STATUSES } from '@linuxpilot/server-contracts';
import { listServers } from '../../api/servers';
import { ApiRequestError } from '../../api/client';
import { matchesClientFilters } from './compute';
import { apiStatusForQuery } from './query';
import { useDebounce } from './use-debounce';
import type { ServerCounts, ServersListState, ServersQueryState } from './types';

const emptyCounts: ServerCounts = {
  all: 0,
  online: 0,
  offline: 0,
  warning: 0,
  noAgent: 0,
  maintenance: 0,
};

export function useServers(query: ServersQueryState) {
  const debouncedQ = useDebounce(query.q, 280);
  const requestQuery = useMemo(() => ({ ...query, q: debouncedQ }), [query, debouncedQ]);
  const [state, setState] = useState<ServersListState>({
    items: [],
    total: 0,
    page: query.page,
    pageSize: query.pageSize,
    counts: emptyCounts,
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

      const request = Promise.all([loadPage(requestQuery), loadCounts()])
        .then(([page, counts]) => {
          if (cancelled?.current) {
            return;
          }
          hasLoaded.current = true;
          const items = page.items.filter((server) =>
            matchesClientFilters(server, {
              q: requestQuery.q,
              os: requestQuery.os,
              agent: requestQuery.agent,
              spaceId: requestQuery.spaceId,
            }),
          );
          setState({
            items,
            total: page.total,
            page: page.page,
            pageSize: page.pageSize,
            counts,
            status: items.length === 0 ? 'empty' : 'success',
            error: null,
            lastSuccessfulAt: new Date().toISOString(),
          });
        })
        .catch((cause) => {
          if (cancelled?.current) {
            return;
          }
          setState((current) => ({
            ...current,
            status: 'error',
            error: toError(cause),
          }));
        })
        .finally(() => {
          inFlight.current = null;
        });

      inFlight.current = request;
      return request;
    },
    [requestQuery],
  );

  useEffect(() => {
    const cancelled = { current: false };
    void load(hasLoaded.current ? 'refresh' : 'initial', cancelled);
    return () => {
      cancelled.current = true;
    };
  }, [load]);

  useEffect(() => {
    if (query.refresh <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'hidden') {
        return;
      }
      void load('refresh');
    }, query.refresh * 1000);
    return () => window.clearInterval(timer);
  }, [load, query.refresh]);

  const refresh = useCallback(() => load('refresh'), [load]);

  const osOptions = useMemo(
    () =>
      [
        ...new Set(
          state.items
            .map((server) => server.osName)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort(),
    [state.items],
  );

  return { ...state, osOptions, refresh, refreshing: state.status === 'refreshing' };
}

async function loadPage(query: ServersQueryState) {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    sort: query.sort,
    order: query.order,
  });
  const status = apiStatusForQuery(query);
  if (status) {
    params.set('status', status);
  }
  if (query.q.trim()) {
    params.set('q', query.q.trim());
  }
  if (query.spaceId) {
    params.set('spaceId', query.spaceId);
  }
  return listServers(params);
}

async function loadCounts(): Promise<ServerCounts> {
  const [all, online, offline, warning, noAgent, maintenance] = await Promise.all([
    countServers(),
    countServers(SERVER_STATUSES.ONLINE),
    countServers(SERVER_STATUSES.OFFLINE),
    countServers(SERVER_STATUSES.DEGRADED),
    countServers(SERVER_STATUSES.PENDING),
    countServers(SERVER_STATUSES.MAINTENANCE),
  ]);
  return { all, online, offline, warning, noAgent, maintenance };
}

async function countServers(status?: string) {
  const params = new URLSearchParams({
    page: '1',
    pageSize: '1',
    sort: 'createdAt',
    order: 'desc',
  });
  if (status) {
    params.set('status', status);
  }
  const result = await listServers(params);
  return result.total;
}

function toError(cause: unknown): ServersListState['error'] {
  if (cause instanceof ApiRequestError) {
    if (cause.status === 0 || cause.code === 'NETWORK_ERROR') {
      return 'network';
    }
    if (cause.status === 403) {
      return 'forbidden';
    }
  }
  return 'generic';
}
