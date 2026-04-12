import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { LucideIcon } from 'lucide-react';

/**
 * Generic right-click context menu primitive.
 *
 * Headless-ish: the caller provides an `items[]` list and this component
 * renders them at the given cursor position, clipping to the viewport so
 * it never overflows the window edge. Keyboard navigation: ↑/↓ move focus,
 * Home/End jump to ends, Enter/Space activate, Escape closes.
 *
 * Rendered via a portal on `document.body` so CSS `overflow:hidden` or
 * `transform` on any ancestor doesn't clip it.
 */

export interface MenuItem {
  readonly kind: 'item';
  readonly id: string;
  readonly label: string;
  readonly icon?: LucideIcon;
  readonly shortcut?: string;
  readonly disabled?: boolean;
  readonly destructive?: boolean;
  readonly onSelect: () => void;
}

export interface MenuSeparator {
  readonly kind: 'separator';
  readonly id: string;
}

export type MenuEntry = MenuItem | MenuSeparator;

export interface ContextMenuProps {
  readonly open: boolean;
  /** Cursor position in viewport coordinates. Ignored when `open` is false. */
  readonly position: { readonly x: number; readonly y: number } | null;
  readonly items: readonly MenuEntry[];
  readonly onClose: () => void;
  /** Optional accessible label for the menu (defaults to "Context menu"). */
  readonly ariaLabel?: string;
}

const MENU_PADDING = 4;

export function ContextMenu({
  open,
  position,
  items,
  onClose,
  ariaLabel = 'Context menu',
}: ContextMenuProps): React.JSX.Element | null {
  const menuRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<{ left: number; top: number } | null>(null);
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);

  // Usable (non-separator, non-disabled) entry indices for keyboard nav.
  const usableIndices = items
    .map((entry, idx) => ({ entry, idx }))
    .filter(({ entry }) => entry.kind === 'item' && !entry.disabled)
    .map(({ idx }) => idx);

  // Reset focus to first usable item when the menu opens.
  useEffect(() => {
    if (open) {
      setFocusedIdx(usableIndices[0] ?? -1);
    } else {
      setFocusedIdx(-1);
      setPlacement(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Clip the menu to the viewport. Measured after first paint so we know the
  // menu's actual size, then re-positioned if it would overflow.
  useLayoutEffect(() => {
    if (!open || position === null) return;
    const el = menuRef.current;
    if (el === null) return;
    const rect = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = position.x;
    let top = position.y;
    if (left + rect.width + MENU_PADDING > vw) left = Math.max(MENU_PADDING, vw - rect.width - MENU_PADDING);
    if (top + rect.height + MENU_PADDING > vh) top = Math.max(MENU_PADDING, vh - rect.height - MENU_PADDING);
    setPlacement({ left, top });
  }, [open, position, items]);

  // Keyboard handling at the window level while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (usableIndices.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const curr = usableIndices.indexOf(focusedIdx);
        const next = usableIndices[(curr + 1) % usableIndices.length];
        if (next !== undefined) setFocusedIdx(next);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const curr = usableIndices.indexOf(focusedIdx);
        const prev =
          usableIndices[(curr - 1 + usableIndices.length) % usableIndices.length];
        if (prev !== undefined) setFocusedIdx(prev);
        return;
      }
      if (e.key === 'Home') {
        e.preventDefault();
        const first = usableIndices[0];
        if (first !== undefined) setFocusedIdx(first);
        return;
      }
      if (e.key === 'End') {
        e.preventDefault();
        const last = usableIndices[usableIndices.length - 1];
        if (last !== undefined) setFocusedIdx(last);
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        const target = items[focusedIdx];
        if (target !== undefined && target.kind === 'item' && !target.disabled) {
          e.preventDefault();
          target.onSelect();
          onClose();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, focusedIdx, items, usableIndices, onClose]);

  // Dismiss on outside click / blur / window blur.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent): void => {
      const el = menuRef.current;
      if (el !== null && e.target instanceof Node && el.contains(e.target)) return;
      onClose();
    };
    const onBlur = (): void => onClose();
    const onScroll = (): void => onClose();
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('blur', onBlur);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, onClose]);

  if (!open || position === null) return null;

  // First paint: render off-screen for measurement.
  const style: React.CSSProperties =
    placement !== null
      ? { position: 'fixed', left: placement.left, top: placement.top, zIndex: 200 }
      : { position: 'fixed', left: -9999, top: -9999, zIndex: 200, visibility: 'hidden' };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={ariaLabel}
      data-testid="context-menu"
      style={style}
      className="min-w-[200px] py-1 bg-surface-raised border border-border rounded-md shadow-xl text-sm select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((entry, idx) => {
        if (entry.kind === 'separator') {
          return <div key={entry.id} role="separator" className="my-1 h-px bg-slate-200" />;
        }
        const isFocused = idx === focusedIdx;
        const Icon = entry.icon;
        const baseCls =
          'flex items-center w-full gap-2 px-3 py-1.5 text-left transition-colors';
        const stateCls = entry.disabled
          ? 'text-slate-300 cursor-not-allowed'
          : entry.destructive
            ? isFocused
              ? 'bg-red-50 text-red-700 cursor-pointer'
              : 'text-red-700 hover:bg-red-50 cursor-pointer'
            : isFocused
              ? 'bg-slate-100 text-slate-900 cursor-pointer'
              : 'text-slate-800 hover:bg-slate-100 cursor-pointer';
        return (
          <button
            key={entry.id}
            type="button"
            role="menuitem"
            disabled={entry.disabled}
            data-testid={`ctx-${entry.id}`}
            aria-disabled={entry.disabled}
            tabIndex={-1}
            onMouseEnter={() => {
              if (!entry.disabled) setFocusedIdx(idx);
            }}
            onClick={() => {
              if (entry.disabled) return;
              entry.onSelect();
              onClose();
            }}
            className={`${baseCls} ${stateCls}`}
          >
            {Icon !== undefined && <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}
            <span className="flex-1">{entry.label}</span>
            {entry.shortcut !== undefined && (
              <span className="font-mono text-[11px] text-slate-400">{entry.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
