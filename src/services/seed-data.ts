import type { Individual } from '../types/pedigree.types';

/**
 * First-run seed dataset. Used by `pedigree-store.ensureSeeded` when the
 * IndexedDB store is empty so that fresh installs render a populated canvas
 * instead of an empty workspace.
 */
export const SEED_INDIVIDUALS: readonly Individual[] = [
  {
    id: 'GEN-0942',
    label: '003',
    gender: 'male',
    generation: 1,
    isProband: true,
    isVerified: true,
    birthDate: '12-OCT-1982',
    karyotype: '46,XY',
    phenotype: 'H-TENSION',
    consanguinity: false,
    notes:
      'Patient presents with bilateral hearing loss and history of early-onset cardiac arrhythmia. Family history indicates similar patterns in Generation 1.',
    hpoAnnotations: ['HP:0000365', 'HP:0011675', 'HP:0001657'],
    sireId: 'S-001',
    damId: 'D-001',
  },
  { id: 'S-001', label: '001', gender: 'male', generation: 1 },
  { id: 'D-001', label: '002', gender: 'female', generation: 1 },
  { id: 'U-2201', label: '004', gender: 'unknown', generation: 1 },
  {
    id: 'GEN2-F31',
    label: '031',
    gender: 'female',
    generation: 2,
    sireId: 'GEN-0942',
    damId: 'D-001',
  },
  {
    id: 'GEN2-M32',
    label: '032',
    gender: 'male',
    generation: 2,
    sireId: 'GEN-0942',
    damId: 'D-001',
  },
];
