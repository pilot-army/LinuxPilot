import { describe, expect, it } from 'vitest';
import { emptyForm } from './types';
import { formatSystemSummary } from './system-summary';

const copy = {
  osWillDetect: 'OS will be detected automatically',
  ubuntu: 'Ubuntu',
  debian: 'Debian',
  otherLinux: 'Other Linux',
};

describe('formatSystemSummary', () => {
  it('uses the automatic label while auto-detect is on', () => {
    expect(
      formatSystemSummary(
        { ...emptyForm(), distribution: 'ubuntu', architecture: 'amd64', osVersion: '24.04' },
        copy,
      ),
    ).toBe(copy.osWillDetect);
  });

  it('formats a manual selection', () => {
    expect(
      formatSystemSummary(
        {
          ...emptyForm(),
          detectAutomatically: false,
          distribution: 'ubuntu',
          osVersion: '24.04',
          architecture: 'amd64',
        },
        copy,
      ),
    ).toBe('Ubuntu 24.04 · amd64');
  });
});
