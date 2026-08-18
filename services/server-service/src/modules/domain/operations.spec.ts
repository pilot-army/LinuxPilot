import { OPERATION_STATUSES } from '@linuxpilot/server-contracts';
import { canCancel, canTransition, isTerminal } from './operations';

describe('operation state machine', () => {
  it('allows the delivery lifecycle and rejects terminal re-entry', () => {
    expect(canTransition(OPERATION_STATUSES.PENDING, OPERATION_STATUSES.DELIVERED)).toBe(true);
    expect(canTransition(OPERATION_STATUSES.DELIVERED, OPERATION_STATUSES.RUNNING)).toBe(true);
    expect(canTransition(OPERATION_STATUSES.DELIVERED, OPERATION_STATUSES.SUCCEEDED)).toBe(true);
    expect(canTransition(OPERATION_STATUSES.RUNNING, OPERATION_STATUSES.SUCCEEDED)).toBe(true);
    expect(canTransition(OPERATION_STATUSES.SUCCEEDED, OPERATION_STATUSES.FAILED)).toBe(false);
    expect(canTransition(OPERATION_STATUSES.FAILED, OPERATION_STATUSES.SUCCEEDED)).toBe(false);
    expect(isTerminal(OPERATION_STATUSES.SUCCEEDED)).toBe(true);
    expect(canCancel(OPERATION_STATUSES.PENDING)).toBe(true);
    expect(canCancel(OPERATION_STATUSES.RUNNING)).toBe(false);
  });
});
