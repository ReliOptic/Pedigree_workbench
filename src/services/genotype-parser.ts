/**
 * Parses raw CD163 genotype strings (bp del/ins patterns) into structured results.
 * Always uses genotype-resolver.ts to obtain raw field values from individuals.
 */

import type { Individual } from '../types/pedigree.types';
import { resolveGenotype } from './genotype-resolver';

export interface Allele {
  readonly type: 'del' | 'ins' | 'wt';
  readonly bp: number | null;
  /** raw allele fragment, e.g. "3bp del (5/15)" */
  readonly raw: string;
}

export interface GenotypeResult {
  readonly raw: string;
  readonly alleles: readonly Allele[];
  /** 0 = no KO, 1 = full KO, null = cannot determine */
  readonly koEfficiency: number | null;
  readonly isHomozygous: boolean;
}

/** Classifies a parsed genotype result into a KO status tier. */
export type KOStatus = 'complete' | 'partial' | 'none' | 'unknown';

const ALLELE_PATTERN = /(\d+)\s*bp\s*(del|ins)/gi;
const WT_PATTERN = /\b(wt|wild.?type)\b/i;

function parseAlleles(raw: string): readonly Allele[] {
  const alleles: Allele[] = [];

  if (WT_PATTERN.test(raw)) {
    alleles.push({ type: 'wt', bp: null, raw: raw.trim() });
  }

  let match: RegExpExecArray | null;
  const pat = new RegExp(ALLELE_PATTERN.source, 'gi');
  while ((match = pat.exec(raw)) !== null) {
    const bp = parseInt(match[1]!, 10);
    const type = match[2]!.toLowerCase() as 'del' | 'ins';
    alleles.push({ type, bp, raw: match[0] });
  }

  return alleles;
}

/**
 * Parses a raw gene-editing genotype string (bp del/ins patterns) into a structured GenotypeResult.
 *
 * Input examples:
 *   "3bp del"
 *   "1bp ins/3bp del"
 *   "wt/3bp del"
 *   ""  (empty → unknown)
 */
export function parseEditingGenotype(raw: string): GenotypeResult {
  const trimmed = raw.trim();

  if (trimmed === '') {
    return { raw: trimmed, alleles: [], koEfficiency: null, isHomozygous: false };
  }

  // Split on "/" to get allele parts
  const parts = trimmed.split('/').map((p) => p.trim());
  const alleles: Allele[] = [];

  for (const part of parts) {
    const partAlleles = parseAlleles(part);
    if (partAlleles.length > 0) {
      alleles.push(...partAlleles);
    } else {
      // Unknown allele fragment
      alleles.push({ type: 'wt', bp: null, raw: part });
    }
  }

  // KO efficiency: fraction of alleles that are mutant (del or ins, not wt)
  const mutantCount = alleles.filter((a) => a.type === 'del' || a.type === 'ins').length;
  const koEfficiency = alleles.length > 0 ? mutantCount / alleles.length : null;

  // Homozygous: all alleles are the same mutation type and bp
  const isHomozygous =
    alleles.length >= 2 &&
    alleles.every(
      (a) => a.type === alleles[0]!.type && a.bp === alleles[0]!.bp,
    );

  return { raw: trimmed, alleles, koEfficiency, isHomozygous };
}

/**
 * Classifies a parsed genotype result into a KO status tier.
 */
export function classifyKOStatus(result: GenotypeResult): KOStatus {
  if (result.koEfficiency === null) return 'unknown';
  if (result.koEfficiency >= 1) return 'complete';
  if (result.koEfficiency > 0) return 'partial';
  return 'none';
}

/**
 * Resolves and parses a named locus genotype from an individual.
 * Uses genotype-resolver for field access (not direct ind.fields access).
 */
export function resolveAndParseLocus(ind: Individual, locusName: string): GenotypeResult {
  const val = resolveGenotype(ind).loci[locusName];
  return parseEditingGenotype(val ?? '');
}

