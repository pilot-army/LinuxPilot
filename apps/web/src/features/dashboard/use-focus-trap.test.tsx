import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useFocusTrap } from './use-focus-trap';

describe('useFocusTrap', () => {
  afterEach(() => {
    document.body.replaceChildren();
    vi.restoreAllMocks();
  });

  it('focuses the initial element without scrolling the page', () => {
    const container = document.createElement('div');
    const title = document.createElement('h2');
    title.tabIndex = -1;
    const action = document.createElement('button');
    action.textContent = 'Add servers';
    container.append(title, action);
    document.body.append(container);

    const focusSpy = vi.spyOn(HTMLElement.prototype, 'focus');
    const containerRef = { current: container };
    const initialRef = { current: title };

    renderHook(() => useFocusTrap(true, containerRef, initialRef));

    expect(title).toHaveFocus();
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(focusSpy.mock.instances[0]).toBe(title);
  });
});
