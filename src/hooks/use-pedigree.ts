import { useCallback, useEffect, useState } from 'react';

import { bulkImport, ensureSeeded, listAll } from '../services/pedigree-store';
import { logger } from '../services/logger';
import type { Individual } from '../types/pedigree.types';

interface UsePedigreeResult {
  readonly individuals: readonly Individual[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refresh: () => Promise<void>;
  readonly replaceAll: (next: readonly Individual[]) => Promise<void>;
}

/**
 * Binds the React UI to the IndexedDB-backed pedigree store.
 *
 * Handles first-run seeding, loading state, and error surfacing. Mutations
 * (`replaceAll`) write through the store and refresh local state in a single
 * pass so the canvas stays consistent with persistence.
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

  return { individuals, isLoading, error, refresh, replaceAll };
}
