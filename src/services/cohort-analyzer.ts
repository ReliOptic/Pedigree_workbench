import type { Individual } from '../types/pedigree.types';
import type { CohortStats, LitterGroup, MissingDataAlert } from '../types/breeding.types';
import { resolveGenotype } from './genotype-resolver';

/**
 * Returns true if any individual has a non-empty sire OR dam field
 * that references another individual in the dataset.
 */
export function hasF1Data(individuals: readonly Individual[]): boolean {
  const idSet = new Set(individuals.map((i) => i.id));
  return individuals.some(
    (ind) =>
      (ind.sire !== undefined && ind.sire !== '' && idSet.has(ind.sire)) ||
      (ind.dam !== undefined && ind.dam !== '' && idSet.has(ind.dam)),
  );
}

/**
 * Computes aggregate cohort statistics from a flat list of individuals.
 */
export function computeCohortStats(individuals: readonly Individual[]): CohortStats {
  let male = 0;
  let female = 0;
  let unknown = 0;
  const genMap = new Map<string, number>();
  const statusMap = new Map<string, number>();
  const groupMap = new Map<string, string[]>();
  let breedingCount = 0;

  for (const ind of individuals) {
    // Sex
    const sex = (ind.sex ?? '').trim().toLowerCase();
    if (sex === 'm' || sex === 'male' || sex === '수컷') male++;
    else if (sex === 'f' || sex === 'female' || sex === '암컷') female++;
    else unknown++;

    // Generation
    const gen = ind.generation ?? 'unknown';
    genMap.set(gen, (genMap.get(gen) ?? 0) + 1);

    // Status
    if (ind.status) {
      statusMap.set(ind.status, (statusMap.get(ind.status) ?? 0) + 1);
      if (
        ind.status === '교배예정돈' ||
        ind.status.toLowerCase().includes('breeding')
      ) {
        breedingCount++;
      }
    }

    // Litter groups
    if (ind.group) {
      const list = groupMap.get(ind.group) ?? [];
      list.push(ind.id);
      groupMap.set(ind.group, list);
    }
  }

  const litterGroups: LitterGroup[] = Array.from(groupMap.entries())
    .map(([groupId, ids]) => {
      const groupInds = ids.map((id) => individuals.find((i) => i.id === id)!);
      let gm = 0;
      let gf = 0;
      let gu = 0;
      let surrogate: string | undefined;
      for (const gi of groupInds) {
        const s = (gi.sex ?? '').trim().toLowerCase();
        if (s === 'm' || s === 'male' || s === '수컷') gm++;
        else if (s === 'f' || s === 'female' || s === '암컷') gf++;
        else gu++;
        if (gi.surrogate !== undefined && gi.surrogate !== '' && surrogate === undefined) {
          surrogate = gi.surrogate;
        }
      }
      return {
        groupId,
        surrogate,
        individuals: ids,
        sexDistribution: { male: gm, female: gf, unknown: gu },
      };
    })
    .sort((a, b) => a.groupId.localeCompare(b.groupId));

  return {
    totalCount: individuals.length,
    sexDistribution: { male, female, unknown },
    generationBreakdown: genMap,
    litterGroups,
    statusDistribution: statusMap,
    breedingCandidateCount: breedingCount,
  };
}

/**
 * Detects missing data in the cohort and returns alerts sorted by severity.
 */
export function detectMissingData(individuals: readonly Individual[]): MissingDataAlert[] {
  const total = individuals.length;
  if (total === 0) return [];

  const checks: { field: string; missing: number }[] = [
    {
      field: 'sex',
      missing: individuals.filter((i) => !i.sex || i.sex.trim() === '').length,
    },
    {
      field: 'generation',
      missing: individuals.filter((i) => !i.generation || i.generation.trim() === '').length,
    },
    {
      field: 'birth_date',
      missing: individuals.filter((i) => !i.birthDate || i.birthDate.trim() === '').length,
    },
    {
      field: 'group',
      missing: individuals.filter((i) => !i.group || i.group.trim() === '').length,
    },
    {
      field: 'CD163',
      missing: individuals.filter((i) => {
        const g = resolveGenotype(i);
        return !g.cd163;
      }).length,
    },
    {
      field: 'genotype',
      missing: individuals.filter((i) => {
        const g = resolveGenotype(i);
        return !g.genotype;
      }).length,
    },
  ];

  return checks
    .filter((c) => c.missing > 0)
    .map((c) => ({
      field: c.field,
      missingCount: c.missing,
      totalCount: total,
      rate: c.missing / total,
      severity: (c.missing / total > 0.5
        ? 'high'
        : c.missing / total > 0.2
          ? 'medium'
          : 'low') as 'low' | 'medium' | 'high',
    }))
    .sort((a, b) => b.rate - a.rate);
}
