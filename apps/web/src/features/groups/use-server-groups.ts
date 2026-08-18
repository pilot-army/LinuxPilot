import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listServerGroups } from '../../api/servers';
import { ApiRequestError } from '../../api/client';
import { useDebounce } from '../servers/use-debounce';
import { filterAndSortGroups } from './compute';
import type { GroupsListState, GroupsQueryState } from './types';

export function useServerGroups(query: GroupsQueryState) {
  const debouncedQ = useDebounce(query.q, 280);
  const [state, setState] = useState<GroupsListState>({
    items: [],
    ungroupedCount: 0,
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

      const request = listServerGroups()
        .then((result) => {
          if (cancelled?.current) {
            return;
          }
          hasLoaded.current = true;
          setState({
            items: result.items,
            ungroupedCount: result.ungroupedCount ?? result.unassignedCount,
            status: result.items.length === 0 ? 'empty' : 'success',
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
    [],
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

  const visible = useMemo(
    () =>
      filterAndSortGroups(state.items, {
        q: debouncedQ,
        filter: query.filter,
        sort: query.sort,
        tag: query.tag,
      }),
    [state.items, debouncedQ, query.filter, query.sort, query.tag],
  );

  return {
    ...state,
    visible,
    refresh,
    refreshing: state.status === 'refreshing',
  };
}

function toError(cause: unknown): GroupsListState['error'] {
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
