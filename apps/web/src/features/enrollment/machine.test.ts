import { describe, expect, it } from 'vitest';
import { canVisitStep, progressPercent, stepStateFor } from './machine';

describe('enrollment wizard machine', () => {
  it('blocks future steps until they have been reached', () => {
    expect(canVisitStep(1, 1)).toBe(true);
    expect(canVisitStep(2, 1)).toBe(false);
    expect(canVisitStep(2, 2)).toBe(true);
  });

  it('keeps the current step active instead of red', () => {
    expect(stepStateFor(3, 3, 3, 3)).toBe('active');
    expect(stepStateFor(2, 3, 3, 2)).toBe('error');
    expect(stepStateFor(1, 3, 3, null)).toBe('completed');
    expect(stepStateFor(4, 3, 3, null)).toBe('pending');
  });

  it('computes progress from the current step and connection', () => {
    expect(progressPercent(1, false, false)).toBe(0);
    expect(progressPercent(4, true, false)).toBe(92);
    expect(progressPercent(4, true, true)).toBe(100);
  });
});
