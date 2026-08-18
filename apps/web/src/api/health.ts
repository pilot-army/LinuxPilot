import { apiRequest } from './client';

export type GatewayHealth = {
  status: string;
  service: string;
  dependencies?: {
    authService?: string;
    serverService?: string;
  };
};

export async function fetchGatewayHealth(): Promise<GatewayHealth> {
  return apiRequest<GatewayHealth>('/health');
}
