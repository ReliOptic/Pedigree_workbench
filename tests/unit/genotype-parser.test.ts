import { describe, expect, it } from 'vitest';

import {
  parseEditingGenotype as parseCD163Genotype,
  classifyKOStatus,
  resolveAndParseLocus,
} from '../../src/services/genotype-parser';
import type { Individual } from '../../src/types/pedigree.types';

function makeInd(overrides: Partial<Individual> & { id: string }): Individual {
  return { fields: {}, ...overrides };
}

describe('parseCD163Genotype', () => {
  it('returns empty result for empty string', () => {
    const result = parseCD163Genotype('');
    expect(result.alleles).toHaveLength(0);
    expect(result.koEfficiency).toBeNull();
    expect(result.isHomozygous).toBe(false);
  });

  it('parses single deletion allele', () => {
    const result = parseCD163Genotype('3bp del');
    expect(result.alleles).toHaveLength(1);
    expect(result.alleles[0]!.type).toBe('del');
    expect(result.alleles[0]!.bp).toBe(3);
    expect(result.koEfficiency).toBe(1);
  });

  it('parses single insertion allele', () => {
    const result = parseCD163Genotype('1bp ins');
    expect(result.alleles).toHaveLength(1);
    expect(result.alleles[0]!.type).toBe('ins');
    expect(result.alleles[0]!.bp).toBe(1);
    expect(result.koEfficiency).toBe(1);
  });

  it('parses compound alleles separated by slash', () => {
    const result = parseCD163Genotype('1bp ins/3bp del');
    expect(result.alleles).toHaveLength(2);
    expect(result.koEfficiency).toBe(1);
  });

  it('handles wt/mutant compound — partial KO', () => {
    const result = parseCD163Genotype('wt/3bp del');
    expect(result.alleles).toHaveLength(2);
    // one wt, one del → 50% KO
    expect(result.koEfficiency).toBe(0.5);
  });

  it('identifies homozygous when both alleles are identical', () => {
    const result = parseCD163Genotype('3bp del/3bp del');
    expect(result.isHomozygous).toBe(true);
  });

  it('identifies heterozygous when alleles differ', () => {
    const result = parseCD163Genotype('1bp ins/3bp del');
    expect(result.isHomozygous).toBe(false);
  });

  it('preserves raw string', () => {
    const raw = '3bp del (5/15)';
    const result = parseCD163Genotype(raw);
    expect(result.raw).toBe(raw.trim());
  });

  it('handles extra whitespace around bp tokens', () => {
    const result = parseCD163Genotype('  5 bp del  ');
    expect(result.alleles).toHaveLength(1);
    expect(result.alleles[0]!.bp).toBe(5);
  });
});

describe('classifyKOStatus', () => {
  it('returns unknown for empty string parse result', () => {
    const result = parseCD163Genotype('');
    expect(classifyKOStatus(result)).toBe('unknown');
  });

  it('returns complete for full KO (koEfficiency=1)', () => {
    const result = parseCD163Genotype('3bp del');
    expect(classifyKOStatus(result)).toBe('complete');
  });

  it('returns partial for partial KO', () => {
    const result = parseCD163Genotype('wt/3bp del');
    expect(classifyKOStatus(result)).toBe('partial');
  });

  it('returns none for pure wt', () => {
    // Force all-wt by using a string with only wt
    const result = parseCD163Genotype('wt');
    expect(classifyKOStatus(result)).toBe('none');
  });
});

describe('resolveAndParseCD163', () => {
  it('uses genotype-resolver to access CD163 field (CD163 key)', () => {
    const ind = makeInd({ id: 'A', fields: { CD163: '3bp del' } });
    const result = resolveAndParseLocus(ind, 'CD163');
    expect(result.alleles).toHaveLength(1);
    expect(result.alleles[0]!.type).toBe('del');
  });

  it('uses genotype-resolver to access CD163 field (lowercase cd163 key)', () => {
    const ind = makeInd({ id: 'B', fields: { cd163: '1bp ins' } });
    const result = resolveAndParseLocus(ind, 'CD163');
    expect(result.alleles).toHaveLength(1);
    expect(result.alleles[0]!.type).toBe('ins');
  });

  it('returns empty result for individual without CD163 data', () => {
    const ind = makeInd({ id: 'C', fields: {} });
    const result = resolveAndParseLocus(ind, 'CD163');
    expect(result.koEfficiency).toBeNull();
    expect(result.alleles).toHaveLength(0);
  });
});

describe('resolveAndParseLocus', () => {
  it('resolves and parses a named locus (CD163)', () => {
    const ind = makeInd({ id: 'A', fields: { CD163: '3bp del' } });
    const result = resolveAndParseLocus(ind, 'CD163');
    expect(result.alleles).toHaveLength(1);
    expect(result.alleles[0]!.type).toBe('del');
    expect(result.alleles[0]!.bp).toBe(3);
  });

  it('resolves and parses a named locus (genotype)', () => {
    const ind = makeInd({ id: 'B', fields: { genotype: '1bp ins/3bp del' } });
    const result = resolveAndParseLocus(ind, 'genotype');
    expect(result.alleles).toHaveLength(2);
    expect(result.koEfficiency).toBe(1);
  });

  it('returns empty result when locus is not found', () => {
    const ind = makeInd({ id: 'C', fields: {} });
    const result = resolveAndParseLocus(ind, 'CD163');
    expect(result.alleles).toHaveLength(0);
    expect(result.koEfficiency).toBeNull();
  });

  it('returns empty result for unknown locus name', () => {
    const ind = makeInd({ id: 'D', fields: { CD163: '3bp del' } });
    const result = resolveAndParseLocus(ind, 'NONEXISTENT');
    expect(result.alleles).toHaveLength(0);
    expect(result.koEfficiency).toBeNull();
  });
});
