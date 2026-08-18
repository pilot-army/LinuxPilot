import { describe, expect, it } from 'vitest';
import { isSpaceDetailTab, spacePath, spaceSlugOf } from './space-path';

describe('space path', () => {
  it('prefers the stored slug over the display name', () => {
    expect(spaceSlugOf({ id: 'abc', slug: 'development' })).toBe('development');
    expect(spacePath({ id: 'abc', slug: 'production' })).toBe('/server-spaces/production');
    expect(spacePath({ id: 'abc', slug: 'staging' }, 'settings')).toBe(
      '/server-spaces/staging/settings',
    );
  });

  it('falls back to the space id when slug is missing', () => {
    expect(spaceSlugOf({ id: 'space-1' })).toBe('space-1');
    expect(spacePath({ id: 'space-1' })).toBe('/server-spaces/space-1');
  });

  it('recognizes detail tabs', () => {
    expect(isSpaceDetailTab('overview')).toBe(true);
    expect(isSpaceDetailTab('servers')).toBe(true);
    expect(isSpaceDetailTab('unknown')).toBe(false);
  });
});
