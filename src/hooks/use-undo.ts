import { useCallback, useRef, useSyncExternalStore } from 'react';

import type { Individual } from '../types/pedigree.types';

/** Maximum number of snapshots kept in the undo stack. */
const MAX_HISTORY = 50;

interface UndoState {
  past: (readonly Individual[])[];
  future: (readonly Individual[])[];
}

export interface UseUndoResult {
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly undo: () => Promise<void>;
  readonly redo: () => Promise<void>;
  /** Call BEFORE any mutation to push current state onto the undo stack. */
  readonly pushSnapshot: (current: readonly Individual[]) => void;
}

/**
 * Lightweight snapshot-based undo/redo.
 *
 * Uses a ref + useSyncExternalStore to avoid React batching issues with
 * setState updaters that need to synchronously read-then-write.
 */
export function useUndo(
  replaceAll: (next: readonly Individual[]) => Promise<void>,
  getCurrentIndividuals: () => readonly Individual[],
): UseUndoResult {
  const stateRef = useRef<UndoState>({ past: [], future: [] });
  const listenersRef = useRef(new Set<() => void>());
  const busyRef = useRef(false);

  // Snapshot for useSyncExternalStore — changes identity on every notify.
  const snapRef = useRef({ canUndo: false, canRedo: false });

  const notify = useCallback(() => {
    const s = stateRef.current;
    snapRef.current = { canUndo: s.past.length > 0, canRedo: s.future.length > 0 };
    listenersRef.current.forEach((l) => l());
  }, []);

  const subscribe = useCallback((cb: () => void) => {
    listenersRef.current.add(cb);
    return () => { listenersRef.current.delete(cb); };
  }, []);

  const getSnapshot = useCallback(() => snapRef.current, []);

  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const pushSnapshot = useCallback((current: readonly Individual[]) => {
    const s = stateRef.current;
    s.past.push(current);
    // Cap history length.
    if (s.past.length > MAX_HISTORY) {
      s.past.splice(0, s.past.length - MAX_HISTORY);
    }
    // Any new mutation clears the redo stack.
    s.future.length = 0;
    notify();
  }, [notify]);

  const undo = useCallback(async () => {
    if (busyRef.current) return;
    const s = stateRef.current;
    if (s.past.length === 0) return;
    busyRef.current = true;
    try {
      const snapshot = s.past.pop()!;
      const current = getCurrentIndividuals();
      s.future.push(current);
      notify();
      await replaceAll(snapshot);
    } finally {
      busyRef.current = false;
    }
  }, [replaceAll, getCurrentIndividuals, notify]);

  const redo = useCallback(async () => {
    if (busyRef.current) return;
    const s = stateRef.current;
    if (s.future.length === 0) return;
    busyRef.current = true;
    try {
      const snapshot = s.future.pop()!;
      const current = getCurrentIndividuals();
      s.past.push(current);
      notify();
      await replaceAll(snapshot);
    } finally {
      busyRef.current = false;
    }
  }, [replaceAll, getCurrentIndividuals, notify]);

  return {
    canUndo: snap.canUndo,
    canRedo: snap.canRedo,
    undo,
    redo,
    pushSnapshot,
  };
}
