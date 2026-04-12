import { useCallback, useEffect, useState } from 'react';
import { listMatings, upsertMating, removeMating, bulkImportMatings } from '../services/pedigree-store';
import type { Mating } from '../types/pedigree.types';

export function useMatings() {
  const [matings, setMatings] = useState<readonly Mating[]>([]);

  const refresh = useCallback(async () => {
    const rows = await listMatings();
    setMatings(rows);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const addMating = useCallback(async (m: Mating) => {
    await upsertMating(m);
    await refresh();
  }, [refresh]);

  const updateMating = useCallback(async (m: Mating) => {
    await upsertMating(m);
    await refresh();
  }, [refresh]);

  const deleteMating = useCallback(async (id: string) => {
    await removeMating(id);
    await refresh();
  }, [refresh]);

  const replaceAllMatings = useCallback(async (list: readonly Mating[]) => {
    await bulkImportMatings(list);
    await refresh();
  }, [refresh]);

  return { matings, refresh, addMating, updateMating, deleteMating, replaceAllMatings };
}
