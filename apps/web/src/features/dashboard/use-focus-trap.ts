import { useEffect, type RefObject } from 'react';

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const FOCUS_OPTIONS: FocusOptions = { preventScroll: true };

export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement | null>,
  initialFocusRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!active) {
      return;
    }
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const focusables = () =>
      [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (node) => !node.hasAttribute('disabled') && node.getAttribute('aria-hidden') !== 'true',
      );

    const initial = initialFocusRef?.current ?? focusables()[0];
    initial?.focus(FOCUS_OPTIONS);

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Tab') {
        return;
      }
      const nodes = focusables();
      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const current = document.activeElement;
      if (event.shiftKey && current === first) {
        event.preventDefault();
        last?.focus(FOCUS_OPTIONS);
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first?.focus(FOCUS_OPTIONS);
      }
    }

    container.addEventListener('keydown', onKeyDown);
    return () => container.removeEventListener('keydown', onKeyDown);
  }, [active, containerRef, initialFocusRef]);
}
