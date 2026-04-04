export type Gender = 'male' | 'female' | 'unknown';

export interface Individual {
  id: string;
  label: string;
  gender: Gender;
  generation: number;
  isProband?: boolean;
  isVerified?: boolean;
  birthDate?: string;
  karyotype?: string;
  phenotype?: string;
  consanguinity?: boolean;
  notes?: string;
  hpoAnnotations?: string[];
  sireId?: string;
  damId?: string;
}

export interface PedigreeData {
  individuals: Individual[];
  totalIndividuals: number;
  generations: number;
}
