import { useCallback, useEffect, useRef, useState } from 'react';

import {
  bulkImport,
  listAll,
  remove,
  upsert,
} from '../services/pedigree-store';
import { logger } from '../services/logger';
import { PedigreeStoreError } from '../types/error.types';
import type { Individual } from '../types/pedigree.types';

export type SaveStatus = 'idle' | 'saving' | 'saved';

interface UsePedigreeResult {
  readonly individuals: readonly Individual[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly saveStatus: SaveStatus;
  readonly refresh: () => Promise<void>;
  readonly replaceAll: (next: readonly Individual[]) => Promise<void>;
  /** Inserts a new individual. Throws if `ind.id` already exists. */
  readonly addOne: (ind: Individual) => Promise<void>;
  /** Merges a partial patch into the existing individual and persists. */
  readonly updateOne: (id: string, patch: Partial<Individual>) => Promise<void>;
  /** Removes an individual by id. Missing ids are a no-op. */
  readonly deleteOne: (id: string) => Promise<void>;
}

/**
 * Binds the React UI to the IndexedDB-backed pedigree store.
 *
 * Handles loading state, error surfacing, and save-status tracking.
 * Mutations write through the store and refresh local state in a single
 * pass so the canvas stays consistent with persistence.
 */
export function usePedigree(): UsePedigreeResult {
  const [individuals, setIndividuals] = useState<readonly Individual[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const markSaved = useCallback(() => {
    setSaveStatus('saved');
    if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => setSaveStatus('idle'), 2500);
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const rows = await listAll();
      setIndividuals(rows);
      setError(null);
    } catch (cause) {
      logger.error('use-pedigree.refresh-failed', { cause: String(cause) });
      setError(cause instanceof Error ? cause.message : 'Could not load pedigree data. Try refreshing the page. If the problem persists, check that the local database is not full or corrupted.');
    }
  }, []);

  const replaceAll = useCallback(
    async (next: readonly Individual[]): Promise<void> => {
      setSaveStatus('saving');
      await bulkImport(next);
      await refresh();
      markSaved();
    },
    [refresh, markSaved],
  );

  const addOne = useCallback(
    async (ind: Individual): Promise<void> => {
      setSaveStatus('saving');
      const existing = await listAll();
      if (existing.some((row) => row.id === ind.id)) {
        setSaveStatus('idle');
        throw new PedigreeStoreError('db-write-failed', `Duplicate id: ${ind.id}`);
      }
      await upsert(ind);
      await refresh();
      markSaved();
    },
    [refresh, markSaved],
  );

  const updateOne = useCallback(
    async (id: string, patch: Partial<Individual>): Promise<void> => {
      setSaveStatus('saving');
      const rows = await listAll();
      const existing = rows.find((row) => row.id === id);
      if (existing === undefined) {
        setSaveStatus('idle');
        throw new PedigreeStoreError('not-found', `No individual with id ${id}`);
      }
      const next: Individual = { ...existing, ...patch, id: existing.id };
      await upsert(next);
      await refresh();
      markSaved();
    },
    [refresh, markSaved],
  );

  const deleteOne = useCallback(
    async (id: string): Promise<void> => {
      setSaveStatus('saving');
      await remove(id);
      await refresh();
      markSaved();
    },
    [refresh, markSaved],
  );

  // Bootstrap: just load data, no seeding.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        if (!cancelled) await refresh();
      } catch (cause) {
        logger.error('use-pedigree.bootstrap-failed', { cause: String(cause) });
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not initialize pedigree storage. Try refreshing the page or clearing site data if the problem continues.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // Cleanup timer on unmount.
  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return { individuals, isLoading, error, saveStatus, refresh, replaceAll, addOne, updateOne, deleteOne };
}
