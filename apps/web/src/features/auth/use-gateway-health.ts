import { useEffect, useState } from 'react';
import { fetchGatewayHealth, type GatewayHealth } from '../../api/health';

export type GatewayHealthState = {
  status: 'loading' | 'success' | 'error';
  health: GatewayHealth | null;
};

export function useGatewayHealth(): GatewayHealthState {
  const [state, setState] = useState<GatewayHealthState>({
    status: 'loading',
    health: null,
  });

  useEffect(() => {
    let cancelled = false;

    void fetchGatewayHealth()
      .then((health) => {
        if (!cancelled) {
          setState({ status: 'success', health });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ status: 'error', health: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
