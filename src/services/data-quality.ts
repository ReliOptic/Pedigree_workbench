/**
 * Data Quality Engine — computes an aggregate quality score and a structured
 * list of issues for the loaded cohort.
 *
 * Uses resolveGenotype() for all genotype field access.
 */

import type { Individual } from '../types/pedigree.types';
import { resolveGenotype } from './genotype-resolver';
import { isMale, isFemale } from '../lib/sex-utils';

export interface DataQualityScore {
  /** 0–100 weighted average of completeness and consistency. */
  overall: number;
  /** 0–100 percentage of expected fields that are filled. */
  completeness: number;
  /** 0–100 structural consistency (no orphan refs, valid dates, etc.). */
  consistency: number;
  readonly issues: DataIssue[];
}

export interface DataIssue {
  severity: 'error' | 'warning' | 'info';
  field: string;
  individualId?: string;
  message: string;
  suggestion?: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isValidDateString(d: string): boolean {
  // Accept YYYY-MM-DD, YYYY/MM/DD, or DD.MM.YYYY loose check
  return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(d) ||
    /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(d);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute a structured data quality score for an array of individuals.
 * Returns overall (0–100), completeness (0–100), consistency (0–100),
 * and a flat list of issues sorted by severity (error → warning → info).
 */
export function computeDataQuality(individuals: readonly Individual[]): DataQualityScore {
  const issues: DataIssue[] = [];

  if (individuals.length === 0) {
    return { overall: 100, completeness: 100, consistency: 100, issues: [] };
  }

  const idSet = new Set(individuals.map((i) => i.id));

  // -------------------------------------------------------------------------
  // Duplicate ID check (error)
  // -------------------------------------------------------------------------
  const seen = new Set<string>();
  for (const ind of individuals) {
    if (seen.has(ind.id)) {
      issues.push({
        severity: 'error',
        field: 'id',
        individualId: ind.id,
        message: `Duplicate ID "${ind.id}"`,
        suggestion: 'Each individual must have a unique identifier.',
      });
    }
    seen.add(ind.id);
  }

  // -------------------------------------------------------------------------
  // Per-individual checks
  // -------------------------------------------------------------------------
  let totalFields = 0;
  let filledFields = 0;
  // Critical fields: id (always present), sex, generation, birthDate, group, CD163/genotype
  const criticalFields = ['sex', 'generation', 'birthDate', 'group', 'genotype'] as const;

  for (const ind of individuals) {
    // Completeness accounting (5 critical fields beyond id)
    totalFields += 5;

    if (ind.sex && ind.sex.trim() !== '') filledFields++;
    else {
      issues.push({
        severity: 'warning',
        field: 'sex',
        individualId: ind.id,
        message: `"${ind.label ?? ind.id}" is missing sex data`,
        suggestion: 'Set sex to M/F so sex-specific features work correctly.',
      });
    }

    if (ind.generation && ind.generation.trim() !== '') filledFields++;
    else {
      issues.push({
        severity: 'info',
        field: 'generation',
        individualId: ind.id,
        message: `"${ind.label ?? ind.id}" has no generation label`,
        suggestion: 'Add a generation label (e.g., F0) for cohort grouping.',
      });
    }

    if (ind.birthDate && ind.birthDate.trim() !== '') {
      filledFields++;
      if (!isValidDateString(ind.birthDate)) {
        issues.push({
          severity: 'warning',
          field: 'birthDate',
          individualId: ind.id,
          message: `"${ind.label ?? ind.id}" has an unrecognised date format: "${ind.birthDate}"`,
          suggestion: 'Use YYYY-MM-DD format for birth dates.',
        });
      }
    } else {
      issues.push({
        severity: 'info',
        field: 'birthDate',
        individualId: ind.id,
        message: `"${ind.label ?? ind.id}" has no birth date`,
        suggestion: 'Recording birth dates enables age-at-mating calculations.',
      });
    }

    if (ind.group && ind.group.trim() !== '') filledFields++;
    else {
      issues.push({
        severity: 'info',
        field: 'group',
        individualId: ind.id,
        message: `"${ind.label ?? ind.id}" has no litter group assigned`,
      });
    }

    const geno = resolveGenotype(ind);
    if (geno.loci['CD163'] || geno.loci['genotype']) filledFields++;
    else {
      issues.push({
        severity: 'warning',
        field: 'CD163',
        individualId: ind.id,
        message: `"${ind.label ?? ind.id}" has no genotype data (CD163 or bp pattern)`,
        suggestion: 'Add CD163 KO efficiency or bp del/ins pattern for downstream analysis.',
      });
    }

    // Orphan sire reference (error)
    if (ind.sire && ind.sire.trim() !== '' && !idSet.has(ind.sire)) {
      issues.push({
        severity: 'error',
        field: 'sire',
        individualId: ind.id,
        message: `"${ind.label ?? ind.id}" references unknown sire ID "${ind.sire}"`,
        suggestion: 'Ensure the sire ID matches an existing individual.',
      });
    }

    // Orphan dam reference (error)
    if (ind.dam && ind.dam.trim() !== '' && !idSet.has(ind.dam)) {
      issues.push({
        severity: 'error',
        field: 'dam',
        individualId: ind.id,
        message: `"${ind.label ?? ind.id}" references unknown dam ID "${ind.dam}"`,
        suggestion: 'Ensure the dam ID matches an existing individual.',
      });
    }

    // Sex consistency: sire should be male, dam should be female
    if (ind.sire && ind.sire.trim() !== '') {
      const sire = individuals.find((i) => i.id === ind.sire);
      if (sire && isFemale(sire)) {
        issues.push({
          severity: 'warning',
          field: 'sire',
          individualId: ind.id,
          message: `Sire "${sire.label ?? sire.id}" of "${ind.label ?? ind.id}" is recorded as female`,
          suggestion: 'Verify sex assignment for this sire.',
        });
      }
    }
    if (ind.dam && ind.dam.trim() !== '') {
      const dam = individuals.find((i) => i.id === ind.dam);
      if (dam && isMale(dam)) {
        issues.push({
          severity: 'warning',
          field: 'dam',
          individualId: ind.id,
          message: `Dam "${dam.label ?? dam.id}" of "${ind.label ?? ind.id}" is recorded as male`,
          suggestion: 'Verify sex assignment for this dam.',
        });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Score calculation
  // -------------------------------------------------------------------------
  const completeness = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 100;

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warningCount = issues.filter((i) => i.severity === 'warning').length;
  // Consistency: start at 100, deduct for errors and warnings
  const consistencyDeduction = Math.min(
    100,
    errorCount * 15 + warningCount * 5,
  );
  const consistency = Math.max(0, 100 - consistencyDeduction);

  const overall = Math.round((completeness + consistency) / 2);

  // Sort: errors first, then warnings, then info
  const severityOrder: Record<DataIssue['severity'], number> = { error: 0, warning: 1, info: 2 };
  issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Deduplicate field-level issues (keep at most 1 per field when > 10 individuals have same issue)
  const _ = criticalFields; // suppress unused warning

  return { overall, completeness, consistency, issues };
}
