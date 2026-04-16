import type { Individual } from '../types/pedigree.types';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  type: 'cycle' | 'self-reference' | 'duplicate-id';
  ids: string[];
  message: string;
}

export interface ValidationWarning {
  type: 'orphan-parent' | 'missing-sex' | 'missing-generation';
  ids: string[];
  message: string;
}

/**
 * Detect circular references in pedigree data.
 * Returns list of individual IDs involved in cycles.
 */
export function detectCycles(individuals: readonly Individual[]): string[][] {
  const parentMap = new Map<string, string[]>();
  for (const ind of individuals) {
    const parents: string[] = [];
    if (ind.sire) parents.push(ind.sire);
    if (ind.dam) parents.push(ind.dam);
    parentMap.set(ind.id, parents);
  }

  const cycles: string[][] = [];
  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(id: string, path: string[]): void {
    if (inStack.has(id)) {
      // Found a cycle — extract the cycle portion
      const cycleStart = path.indexOf(id);
      if (cycleStart >= 0) {
        cycles.push(path.slice(cycleStart));
      }
      return;
    }
    if (visited.has(id)) return;

    visited.add(id);
    inStack.add(id);
    path.push(id);

    for (const parent of parentMap.get(id) ?? []) {
      if (parentMap.has(parent)) {
        dfs(parent, [...path]);
      }
    }

    inStack.delete(id);
  }

  for (const ind of individuals) {
    if (!visited.has(ind.id)) {
      dfs(ind.id, []);
    }
  }

  return cycles;
}

/**
 * Full validation of pedigree data.
 */
export function validatePedigree(individuals: readonly Individual[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check for duplicate IDs
  const idCounts = new Map<string, number>();
  for (const ind of individuals) {
    idCounts.set(ind.id, (idCounts.get(ind.id) ?? 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) {
      errors.push({
        type: 'duplicate-id',
        ids: [id],
        message: `ID "${id}" appears ${count} times in the dataset. Each individual must have a unique ID. Remove or rename the duplicates and re-import.`,
      });
    }
  }

  // Check for self-references
  for (const ind of individuals) {
    if (ind.sire === ind.id || ind.dam === ind.id) {
      errors.push({
        type: 'self-reference',
        ids: [ind.id],
        message: `"${ind.id}" is listed as its own parent. Remove the self-referencing sire or dam value to fix this.`,
      });
    }
  }

  // Check for cycles
  const cycles = detectCycles(individuals);
  for (const cycle of cycles) {
    errors.push({
      type: 'cycle',
      ids: cycle,
      message: `Circular pedigree: ${cycle.join(' → ')} → ${cycle[0]}. ` +
        `${cycle[0]} is set as an ancestor of ${cycle[cycle.length - 1]}, which is itself an ancestor of ${cycle[0]}. ` +
        `Remove one of the links in the chain to resolve this.`,
    });
  }

  // Warnings: orphan parents
  const idSet = new Set(individuals.map(i => i.id));
  for (const ind of individuals) {
    if (ind.sire && !idSet.has(ind.sire)) {
      warnings.push({
        type: 'orphan-parent',
        ids: [ind.id, ind.sire],
        message: `Sire "${ind.sire}" referenced by "${ind.id}" is not in the dataset. This may be an externally sourced sire. You can add them as a new individual or leave the reference as-is.`,
      });
    }
    if (ind.dam && !idSet.has(ind.dam)) {
      warnings.push({
        type: 'orphan-parent',
        ids: [ind.id, ind.dam],
        message: `Dam "${ind.dam}" referenced by "${ind.id}" is not in the dataset. This may be an externally sourced dam. You can add them as a new individual or leave the reference as-is.`,
      });
    }
  }

  // Warnings: missing sex/generation
  const missingSex = individuals.filter(i => !i.sex).map(i => i.id);
  if (missingSex.length > 0) {
    warnings.push({
      type: 'missing-sex',
      ids: missingSex,
      message: `${missingSex.length} individual${missingSex.length === 1 ? '' : 's'} ha${missingSex.length === 1 ? 's' : 've'} no sex recorded. Sex is used for pedigree symbol rendering (square/circle/diamond) and parent role assignment. Edit each individual to set it.`,
    });
  }

  const missingGen = individuals.filter(i => !i.generation).map(i => i.id);
  if (missingGen.length > 0) {
    warnings.push({
      type: 'missing-generation',
      ids: missingGen,
      message: `${missingGen.length} individual${missingGen.length === 1 ? '' : 's'} ha${missingGen.length === 1 ? 's' : 've'} no generation assigned. Generation is used for layout banding. Map the generation column during import, or set it manually in the inspector.`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
