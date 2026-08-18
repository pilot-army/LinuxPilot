import { useCallback, useEffect, useRef, useState } from 'react';
import { listSshKeys } from '../../api/ssh-keys';
import { ApiRequestError } from '../../api/client';
import { useDebounce } from '../servers/use-debounce';
import { toListParams } from './query';
import type { SshKeysListState, SshKeysQueryState } from './types';

const emptySummary = {
  total: 0,
  used: 0,
  unused: 0,
  attention: 0,
  rotationDue: 0,
  passwordAuthServers: 0,
};

export function useSshKeys(query: SshKeysQueryState) {
  const debouncedQ = useDebounce(query.q, 280);
  const [state, setState] = useState<SshKeysListState>({
    items: [],
    total: 0,
    summary: emptySummary,
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
      const params = toListParams({
        q: debouncedQ,
        type: query.type,
        algorithm: query.algorithm,
        status: query.status,
        usage: query.usage,
        sort: query.sort,
        keyId: '',
        refresh: query.refresh,
      });
      const request = listSshKeys(params)
        .then((result) => {
          if (cancelled?.current) {
            return;
          }
          hasLoaded.current = true;
          setState({
            items: result.items,
            total: result.total,
            summary: result.summary,
            status: result.summary.total === 0 ? 'empty' : 'success',
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
    [debouncedQ, query.algorithm, query.refresh, query.sort, query.status, query.type, query.usage],
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

  return {
    ...state,
    refresh,
    refreshing: state.status === 'refreshing',
  };
}

function toError(cause: unknown): SshKeysListState['error'] {
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
