import type { HealthReasonCode, HealthStatus } from './status';

export type HealthReason = {
  code: HealthReasonCode;
  severity: 'WARNING' | 'CRITICAL';
  value?: number;
  threshold?: number;
  since?: string;
};

export type ServerHealth = {
  status: HealthStatus;
  reasons: HealthReason[];
};
