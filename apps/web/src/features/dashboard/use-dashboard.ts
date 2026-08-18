import { useCallback, useEffect, useRef, useState } from 'react';
import { mergeServerWidget, resolveDashboardMode } from './compute';
import { loadDashboardSnapshot } from './dashboard-service';
import type { ChartPeriod, DashboardSnapshot, WidgetStatus } from './types';

const INITIAL_ATTEMPTS = 3;
const RETRY_DELAY_MS = import.meta.env.MODE === 'test' ? 0 : 250;

const emptySnapshot: DashboardSnapshot = {
  summary: {
    total: 0,
    online: 0,
    offline: 0,
    warning: 0,
    waitingAgent: 0,
    onlinePercent: 0,
    availabilityPercent: 0,
    averageCpu: null,
    currentCpu: null,
    averageRam: null,
    averageDisk: null,
    diskFree: null,
    disconnectedAgents: 0,
    attentionCount: 0,
    cpuCoresUsed: null,
    cpuCoresTotal: null,
    memoryUsedBytes: null,
    memoryTotalBytes: null,
    diskUsedBytes: null,
    diskTotalBytes: null,
    maintenanceCount: 0,
  },
  servers: { status: 'empty', data: [], error: null },
  load: {
    status: 'empty',
    data: { points: [], currentCpu: null, currentRam: null, lastMetricAt: null },
    error: null,
  },
  activity: { status: 'empty', data: [], error: null },
  system: { status: 'empty', data: null, error: null },
  attention: { status: 'empty', data: [], error: null },
  issues: { status: 'empty', data: [], error: null },
  weekActivity: { status: 'empty', data: [], error: null },
  connections: { status: 'empty', data: [], error: null },
  pendingOperations: null,
};

function mergeSnapshot(previous: DashboardSnapshot, next: DashboardSnapshot): DashboardSnapshot {
  const servers = mergeServerWidget(previous.servers, next.servers);
  return {
    ...next,
    servers,
    summary:
      next.servers.status === 'error' && previous.summary.total > 0
        ? previous.summary
        : next.summary,
    activity:
      next.activity.status === 'error' && previous.activity.data
        ? { ...previous.activity, stale: true, error: next.activity.error }
        : next.activity,
    system:
      next.system.status === 'error' && previous.system.data
        ? { ...previous.system, stale: true, error: next.system.error }
        : next.system,
    load:
      next.load.status === 'error' && previous.load.data?.points.length
        ? { ...previous.load, stale: true, error: next.load.error }
        : next.load,
    weekActivity:
      next.weekActivity.status === 'error' && previous.weekActivity.data
        ? { ...previous.weekActivity, stale: true, error: next.weekActivity.error }
        : next.weekActivity,
    connections:
      next.connections.status === 'error' && previous.connections.data
        ? { ...previous.connections, stale: true, error: next.connections.error }
        : next.connections,
    pendingOperations:
      next.pendingOperations === null && previous.pendingOperations !== null
        ? previous.pendingOperations
        : next.pendingOperations,
  };
}

function isIncomplete(snapshot: DashboardSnapshot): boolean {
  return snapshot.servers.status === 'error' || snapshot.system.status === 'error';
}

function shouldRetry(snapshot: DashboardSnapshot | null): boolean {
  if (!snapshot) {
    return true;
  }
  if (snapshot.servers.error === 'rateLimited') {
    return false;
  }
  return isIncomplete(snapshot);
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function useDashboard(period: ChartPeriod) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(emptySnapshot);
  const [status, setStatus] = useState<WidgetStatus>('loading');
  const [announce, setAnnounce] = useState('');
  const [lastSuccessfulAt, setLastSuccessfulAt] = useState<string | null>(null);
  const inFlight = useRef<Promise<void> | null>(null);
  const inFlightPeriod = useRef<ChartPeriod | null>(null);
  const hasLoaded = useRef(false);
  const seq = useRef(0);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (inFlight.current && inFlightPeriod.current === period) {
        return inFlight.current;
      }

      const requestSeq = seq.current + 1;
      seq.current = requestSeq;

      if (mode === 'initial' && !hasLoaded.current) {
        setStatus('loading');
      } else {
        setStatus('refreshing');
      }

      const attempts = mode === 'initial' && !hasLoaded.current ? INITIAL_ATTEMPTS : 1;

      const request = (async () => {
        let next: DashboardSnapshot | null = null;
        for (let attempt = 0; attempt < attempts; attempt += 1) {
          try {
            next = await loadDashboardSnapshot(period);
          } catch {
            next = null;
          }
          if (requestSeq !== seq.current) {
            return;
          }
          if (next && !shouldRetry(next)) {
            break;
          }
          if (attempt < attempts - 1) {
            await wait(RETRY_DELAY_MS * (attempt + 1));
          }
        }
        if (requestSeq !== seq.current) {
          return;
        }
        if (!next) {
          setStatus('error');
          setAnnounce('refreshFailed');
          setSnapshot((current) => {
            if (current.servers.data && current.servers.data.length > 0) {
              return current;
            }
            return {
              ...current,
              servers: { status: 'error', data: null, error: 'generic' },
            };
          });
          return;
        }
        hasLoaded.current = true;
        setSnapshot((current) => mergeSnapshot(current, next));
        if (next.servers.status !== 'error') {
          setLastSuccessfulAt(new Date().toISOString());
        }
        setStatus(next.servers.status === 'error' && !next.system.data ? 'error' : 'success');
        setAnnounce(
          mode === 'refresh'
            ? next.servers.status === 'error'
              ? 'refreshFailed'
              : 'refreshed'
            : '',
        );
      })().finally(() => {
        if (requestSeq === seq.current) {
          inFlight.current = null;
          inFlightPeriod.current = null;
        }
      });

      inFlight.current = request;
      inFlightPeriod.current = period;
      return request;
    },
    [period],
  );

  useEffect(() => {
    const mode = hasLoaded.current ? 'refresh' : 'initial';
    void load(mode);
  }, [load]);

  const refresh = useCallback(() => {
    return load('refresh');
  }, [load]);

  const mode = resolveDashboardMode({
    loading: status === 'loading',
    servers: snapshot.servers,
  });

  return {
    snapshot,
    status,
    mode,
    announce,
    lastSuccessfulAt,
    refreshing: status === 'refreshing',
    loading: status === 'loading',
    refresh,
  };
}
