import { OPERATION_STATUSES, type OperationStatus } from '@linuxpilot/server-contracts';

const TRANSITIONS: Record<OperationStatus, readonly OperationStatus[]> = {
  PENDING: [OPERATION_STATUSES.DELIVERED, OPERATION_STATUSES.CANCELLED, OPERATION_STATUSES.EXPIRED],
  DELIVERED: [
    OPERATION_STATUSES.RUNNING,
    OPERATION_STATUSES.SUCCEEDED,
    OPERATION_STATUSES.FAILED,
    OPERATION_STATUSES.CANCELLED,
    OPERATION_STATUSES.EXPIRED,
  ],
  RUNNING: [OPERATION_STATUSES.SUCCEEDED, OPERATION_STATUSES.FAILED, OPERATION_STATUSES.EXPIRED],
  SUCCEEDED: [],
  FAILED: [],
  CANCELLED: [],
  EXPIRED: [],
};

export function canTransition(from: OperationStatus, to: OperationStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: OperationStatus, to: OperationStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Invalid operation transition ${from} -> ${to}`);
  }
}

export function isTerminal(status: OperationStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

export function canCancel(status: OperationStatus): boolean {
  return canTransition(status, OPERATION_STATUSES.CANCELLED);
}
