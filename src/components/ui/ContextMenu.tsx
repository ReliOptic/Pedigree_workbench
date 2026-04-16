import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';

// ── ContextMenu ──────────────────────────────────────────────────────────────

export interface ContextMenuProps {
  open: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  children: React.ReactNode;
}

const PADDING = 8;

export function ContextMenu({ open, position, onClose, children }: ContextMenuProps): React.JSX.Element | null {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click, ESC, and scroll.
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent): void => {
      const el = menuRef.current;
      if (el !== null && e.target instanceof Node && el.contains(e.target)) return;
      onClose();
    };
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    const onScroll = (): void => onClose();

    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, onClose]);

  if (!open) return null;

  // Auto-reposition if near screen edge.
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Estimate menu size before mount; useLayoutEffect would be ideal but
  // a fixed estimate (220 × 200) is sufficient for the flip heuristic.
  // After paint the menu is already visible so no flicker occurs.
  const estimatedW = 220;
  const estimatedH = 200;

  const left = position.x + estimatedW + PADDING > vw
    ? Math.max(PADDING, position.x - estimatedW)
    : position.x;

  const top = position.y + estimatedH + PADDING > vh
    ? Math.max(PADDING, position.y - estimatedH)
    : position.y;

  return createPortal(
    <div
      ref={menuRef}
      className="ctx-menu"
      style={{ position: 'fixed', left, top, zIndex: 200 }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>,
    document.body,
  );
}

// ── ContextMenuItem ──────────────────────────────────────────────────────────

export interface ContextMenuItemProps {
  onClick?: () => void;
  onClose?: () => void;
  disabled?: boolean;
  danger?: boolean;
  children: React.ReactNode;
}

export function ContextMenuItem({
  onClick,
  onClose,
  disabled = false,
  danger = false,
  children,
}: ContextMenuItemProps): React.JSX.Element {
  const handleClick = (): void => {
    if (disabled) return;
    onClick?.();
    onClose?.();
  };

  return (
    <div
      role="menuitem"
      className={clsx('ctx-menu-item')}
      data-disabled={disabled || undefined}
      data-danger={danger || undefined}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') handleClick();
      }}
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
    >
      {children}
    </div>
  );
}

// ── ContextMenuDivider ───────────────────────────────────────────────────────

export function ContextMenuDivider(): React.JSX.Element {
  return <div role="separator" className="ctx-menu-divider" />;
}

// ── ContextMenuHeader ────────────────────────────────────────────────────────

export interface ContextMenuHeaderProps {
  children: React.ReactNode;
}

export function ContextMenuHeader({ children }: ContextMenuHeaderProps): React.JSX.Element {
  return <div className="ctx-menu-header">{children}</div>;
}
