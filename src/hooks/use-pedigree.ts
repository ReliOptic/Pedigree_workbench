import { useCallback, useEffect, useState } from 'react';

import {
  bulkImport,
  ensureSeeded,
  listAll,
  remove,
  upsert,
} from '../services/pedigree-store';
import { logger } from '../services/logger';
import { PedigreeStoreError } from '../types/error.types';
import type { Individual } from '../types/pedigree.types';

interface UsePedigreeResult {
  readonly individuals: readonly Individual[];
  readonly isLoading: boolean;
  readonly error: string | null;
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
 * Handles first-run seeding, loading state, and error surfacing. Mutations
 * write through the store and refresh local state in a single pass so the
 * canvas stays consistent with persistence.
 */
export function usePedigree(): UsePedigreeResult {
  const [individuals, setIndividuals] = useState<readonly Individual[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const rows = await listAll();
      setIndividuals(rows);
      setError(null);
    } catch (cause) {
      logger.error('use-pedigree.refresh-failed', { cause: String(cause) });
      setError(cause instanceof Error ? cause.message : 'Failed to load pedigree.');
    }
  }, []);

  const replaceAll = useCallback(
    async (next: readonly Individual[]): Promise<void> => {
      await bulkImport(next);
      await refresh();
    },
    [refresh],
  );

  const addOne = useCallback(
    async (ind: Individual): Promise<void> => {
      // Guard against collision so the hook surfaces an actionable error
      // instead of silently overwriting via idb's put semantics.
      const existing = await listAll();
      if (existing.some((row) => row.id === ind.id)) {
        throw new PedigreeStoreError('db-write-failed', `Duplicate id: ${ind.id}`);
      }
      await upsert(ind);
      await refresh();
    },
    [refresh],
  );

  const updateOne = useCallback(
    async (id: string, patch: Partial<Individual>): Promise<void> => {
      const rows = await listAll();
      const existing = rows.find((row) => row.id === id);
      if (existing === undefined) {
        throw new PedigreeStoreError('not-found', `No individual with id ${id}`);
      }
      // Shallow merge — caller provides the full `fields` object if they
      // want to replace free-form columns, otherwise the existing object
      // is preserved.
      const next: Individual = { ...existing, ...patch, id: existing.id };
      await upsert(next);
      await refresh();
    },
    [refresh],
  );

  const deleteOne = useCallback(
    async (id: string): Promise<void> => {
      await remove(id);
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await ensureSeeded();
        if (!cancelled) await refresh();
      } catch (cause) {
        logger.error('use-pedigree.bootstrap-failed', { cause: String(cause) });
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Failed to initialize pedigree.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  return { individuals, isLoading, error, refresh, replaceAll, addOne, updateOne, deleteOne };
}
