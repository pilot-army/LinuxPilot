import { useEffect } from 'react';

let lockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

function acquireBodyScrollLock() {
  if (lockCount === 0) {
    const { body, documentElement } = document;
    savedOverflow = body.style.overflow;
    savedPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
    const gutter = getComputedStyle(documentElement).scrollbarGutter;
    const gutterStable = gutter === 'stable' || gutter === 'stable both-edges';
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0 && !gutterStable) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }
  lockCount += 1;
}

function releaseBodyScrollLock() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = savedOverflow;
    document.body.style.paddingRight = savedPaddingRight;
  }
}

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) {
      return;
    }
    acquireBodyScrollLock();
    return () => {
      releaseBodyScrollLock();
    };
  }, [locked]);
}
