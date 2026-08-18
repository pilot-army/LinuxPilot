import { useEffect, useState } from 'react';
import { listServers } from '../../api/servers';

let cachedTotal: number | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function rememberFleetTotal(total: number | null) {
  if (total === cachedTotal) {
    return;
  }
  cachedTotal = total;
  emit();
}

export function getFleetTotal(): number | null {
  return cachedTotal;
}

export function useFleetPresence() {
  const [total, setTotal] = useState<number | null>(cachedTotal);

  useEffect(() => {
    const listener = () => setTotal(cachedTotal);
    listeners.add(listener);
    if (cachedTotal === null && !inFlight) {
      inFlight = listServers(new URLSearchParams({ page: '1', pageSize: '1' }))
        .then((result) => {
          rememberFleetTotal(result.total);
        })
        .catch(() => {
          // Keep unknown; the dashboard snapshot remains the source of truth.
        })
        .finally(() => {
          inFlight = null;
        });
    }
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    total,
    known: total !== null,
    hasServers: total !== null && total > 0,
  };
}
