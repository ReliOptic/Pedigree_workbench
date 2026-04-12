import type { Individual } from '../types/pedigree.types';
import type { Language } from '../types/translation.types';
import { computeInbreedingCoefficient } from './kinship';
import { getSpeciesProfile } from './species-profiles';

export interface AncestorSlot {
  id: string | null;
  label: string | null;
  sex: string | null;
  depth: number;         // 0 = self, 1 = parents, 2 = grandparents, etc.
  position: 'sire' | 'dam';  // which parent line
}

export interface CertificateData {
  subject: Individual;
  ancestors: AncestorSlot[];
  maxDepth: number;
  coi: number;
  speciesName: string;
  generatedAt: string;
}

/**
 * Build ancestor tree for pedigree certificate.
 * Returns a flat array of AncestorSlots up to the requested depth.
 */
function buildAncestorTree(
  individual: Individual,
  individuals: readonly Individual[],
  maxDepth: number,
): AncestorSlot[] {
  const idMap = new Map<string, Individual>();
  for (const ind of individuals) idMap.set(ind.id, ind);

  const slots: AncestorSlot[] = [];

  function traverse(id: string | undefined, depth: number, position: 'sire' | 'dam'): void {
    if (depth > maxDepth) return;

    const ind = id ? idMap.get(id) : undefined;
    slots.push({
      id: ind?.id ?? null,
      label: ind?.label ?? ind?.id ?? null,
      sex: ind?.sex ?? null,
      depth,
      position,
    });

    if (depth < maxDepth) {
      traverse(ind?.sire, depth + 1, 'sire');
      traverse(ind?.dam, depth + 1, 'dam');
    }
  }

  // Start from subject's parents
  const subject = idMap.get(individual.id);
  if (subject) {
    traverse(subject.sire, 1, 'sire');
    traverse(subject.dam, 1, 'dam');
  }

  return slots;
}

/**
 * Generate certificate data for a given individual.
 */
export function generateCertificate(
  individual: Individual,
  individuals: readonly Individual[],
  options: {
    maxDepth?: number;
    species?: string;
    language?: Language;
  } = {},
): CertificateData {
  const maxDepth = options.maxDepth ?? 3;
  const species = options.species ?? 'custom';
  const language = options.language ?? 'en';
  const profile = getSpeciesProfile(species);

  return {
    subject: individual,
    ancestors: buildAncestorTree(individual, individuals, maxDepth),
    maxDepth,
    coi: computeInbreedingCoefficient(individual.id, individuals),
    speciesName: profile.name[language],
    generatedAt: new Date().toISOString(),
  };
}
