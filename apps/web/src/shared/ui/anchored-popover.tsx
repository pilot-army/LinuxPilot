import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';

type AnchoredPopoverProps = {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<Element | null>;
  id?: string;
  role?: string;
  className?: string;
  children: ReactNode;
};

const GAP = 4;
const VIEW_PAD = 8;

export function AnchoredPopover({
  open,
  onClose,
  anchorRef,
  id,
  role,
  className,
  children,
}: AnchoredPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [style, setStyle] = useState<CSSProperties>({
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 'var(--z-dropdown)',
  });

  useLayoutEffect(() => {
    if (!open) {
      return;
    }

    function place() {
      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      if (!anchor || !popover) {
        return;
      }
      const rect = anchor.getBoundingClientRect();
      const width = popover.offsetWidth;
      const height = popover.offsetHeight;
      const spaceBelow = window.innerHeight - rect.bottom - VIEW_PAD;
      const openUp = spaceBelow < height && rect.top > spaceBelow;
      const top = openUp
        ? Math.max(VIEW_PAD, rect.top - height - GAP)
        : Math.min(rect.bottom + GAP, window.innerHeight - height - VIEW_PAD);
      const left = Math.min(
        Math.max(VIEW_PAD, rect.right - width),
        window.innerWidth - width - VIEW_PAD,
      );
      setStyle({
        position: 'fixed',
        top,
        left,
        zIndex: 'var(--z-dropdown)',
      });
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (anchorRef.current?.contains(target) || popoverRef.current?.contains(target)) {
        return;
      }
      onCloseRef.current();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseRef.current();
      }
    }

    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [anchorRef, open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div ref={popoverRef} id={id} role={role} className={className} style={style}>
      {children}
    </div>,
    document.body,
  );
}
