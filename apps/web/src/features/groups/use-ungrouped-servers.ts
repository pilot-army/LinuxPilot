import { useEffect, useState } from 'react';
import type { ServerSummary } from '@linuxpilot/server-contracts';
import { listServers } from '../../api/servers';

export function useUngroupedServers(count: number, revision?: string | null) {
  const [servers, setServers] = useState<ServerSummary[]>([]);

  useEffect(() => {
    if (count <= 0) {
      setServers([]);
      return;
    }
    const params = new URLSearchParams({
      page: '1',
      pageSize: '50',
      sort: 'name',
      order: 'asc',
      unassigned: 'true',
    });
    let cancelled = false;
    void listServers(params)
      .then((result) => {
        if (!cancelled) {
          setServers(result.items.filter((server) => !(server.spaceId ?? server.groupId)));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setServers([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [count, revision]);

  return servers;
}
