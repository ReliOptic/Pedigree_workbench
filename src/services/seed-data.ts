import type { Individual } from '../types/pedigree.types';

/**
 * First-run seed dataset. Used by `pedigree-store.ensureSeeded` when the
 * IndexedDB store is empty so that fresh installs render a populated canvas
 * instead of an empty workspace. Shape follows PRD v3.1: only `id` is
 * required, everything else is optional and free-form.
 */
export const SEED_INDIVIDUALS: readonly Individual[] = [
  {
    id: 'SNUDB #1-1',
    sex: '수컷',
    generation: 'F0',
    group: 'G1',
    surrogate: '14-84',
    birthDate: '2025-07-13',
    status: '교배예정돈',
    label: '1-1',
    fields: { CD163: '100.00%', Germline: '─', 부: 'DD', 모: '도축란' },
  },
  {
    id: 'SNUDB #1-2',
    sex: '수컷',
    generation: 'F0',
    group: 'G1',
    surrogate: '14-84',
    birthDate: '2025-07-13',
    label: '1-2',
    fields: { CD163: '100.00%' },
  },
  {
    id: 'SNUDB #2-1',
    sex: '암컷',
    generation: 'F0',
    group: 'G2',
    surrogate: '06-31',
    birthDate: '2025-07-20',
    label: '2-1',
    fields: { CD163: '80.00%' },
  },
  {
    id: 'SNUDB #2-2',
    sex: '수컷',
    generation: 'F0',
    group: 'G2',
    surrogate: '06-31',
    birthDate: '2025-07-20',
    status: '폐사',
    label: '2-2',
    fields: { CD163: '80.00%' },
  },
  {
    id: 'F1-1',
    sex: 'M',
    generation: 'F1',
    sire: 'SNUDB #1-1',
    dam: 'SNUDB #2-1',
    label: 'F1-1',
    fields: {},
  },
  {
    id: 'F1-2',
    sex: 'F',
    generation: 'F1',
    sire: 'SNUDB #1-1',
    dam: 'SNUDB #2-1',
    label: 'F1-2',
    fields: {},
  },
];
