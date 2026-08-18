import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useBodyScrollLock } from './use-body-scroll-lock';

describe('useBodyScrollLock', () => {
  afterEach(() => {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  it('locks body overflow and restores it after nested unlocks', () => {
    const first = renderHook(({ locked }) => useBodyScrollLock(locked), {
      initialProps: { locked: true },
    });
    const second = renderHook(({ locked }) => useBodyScrollLock(locked), {
      initialProps: { locked: true },
    });

    expect(document.body.style.overflow).toBe('hidden');

    first.unmount();
    expect(document.body.style.overflow).toBe('hidden');

    second.unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
