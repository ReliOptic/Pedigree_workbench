import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import {
  resolveGenotype,
  registerLocusPattern,
  unregisterLocusPattern,
  getRegisteredLoci,
} from '../../src/services/genotype-resolver';
import type { Individual } from '../../src/types/pedigree.types';

function makeInd(fields: Record<string, string>): Individual {
  return { id: 'test', fields };
}

describe('resolveGenotype', () => {
  it('returns empty loci when fields bag is empty', () => {
    const result = resolveGenotype(makeInd({}));
    expect(result.loci['CD163']).toBeUndefined();
    expect(result.loci['genotype']).toBeUndefined();
  });

  it('resolves CD163 from uppercase key', () => {
    const result = resolveGenotype(makeInd({ CD163: '0.85' }));
    expect(result.loci['CD163']).toBe('0.85');
  });

  it('resolves CD163 from lowercase key', () => {
    const result = resolveGenotype(makeInd({ cd163: '0.70' }));
    expect(result.loci['CD163']).toBe('0.70');
  });

  it('resolves CD163 from CD163_KO key', () => {
    const result = resolveGenotype(makeInd({ CD163_KO: '0.90' }));
    expect(result.loci['CD163']).toBe('0.90');
  });

  it('resolves CD163 from cd163_ko key', () => {
    const result = resolveGenotype(makeInd({ cd163_ko: '0.60' }));
    expect(result.loci['CD163']).toBe('0.60');
  });

  it('resolves genotype from lowercase key', () => {
    const result = resolveGenotype(makeInd({ genotype: '3bp del (5/15)' }));
    expect(result.loci['genotype']).toBe('3bp del (5/15)');
  });

  it('resolves genotype from capitalized key', () => {
    const result = resolveGenotype(makeInd({ Genotype: '1bp ins/3bp del' }));
    expect(result.loci['genotype']).toBe('1bp ins/3bp del');
  });

  it('resolves genotype from uppercase key', () => {
    const result = resolveGenotype(makeInd({ GENOTYPE: 'homozygous KO' }));
    expect(result.loci['genotype']).toBe('homozygous KO');
  });

  it('returns undefined for empty string values', () => {
    const result = resolveGenotype(makeInd({ CD163: '', genotype: '' }));
    expect(result.loci['CD163']).toBeUndefined();
    expect(result.loci['genotype']).toBeUndefined();
  });

  it('resolves both CD163 and genotype independently', () => {
    const result = resolveGenotype(makeInd({ CD163: '0.75', genotype: '3bp del' }));
    expect(result.loci['CD163']).toBe('0.75');
    expect(result.loci['genotype']).toBe('3bp del');
  });

  it('CD163 and genotype are distinct columns — CD163 does not bleed into genotype', () => {
    const result = resolveGenotype(makeInd({ CD163: '0.80' }));
    expect(result.loci['CD163']).toBe('0.80');
    expect(result.loci['genotype']).toBeUndefined();
  });

  it('prefers CD163 over cd163 when both present', () => {
    const result = resolveGenotype(makeInd({ CD163: 'first', cd163: 'second' }));
    expect(result.loci['CD163']).toBe('first');
  });

  it('returns primaryLocus and primaryValue for the first detected locus', () => {
    const result = resolveGenotype(makeInd({ CD163: '0.85' }));
    expect(result.primaryLocus).toBe('CD163');
    expect(result.primaryValue).toBe('0.85');
  });

  it('returns undefined primaryLocus when no loci found', () => {
    const result = resolveGenotype(makeInd({}));
    expect(result.primaryLocus).toBeUndefined();
    expect(result.primaryValue).toBeUndefined();
  });
});

describe('registerLocusPattern / unregisterLocusPattern / getRegisteredLoci', () => {
  const testLocus = 'TEST_LOCUS_XYZ';

  afterEach(() => {
    // Clean up any registered test loci
    unregisterLocusPattern(testLocus);
  });

  it('getRegisteredLoci returns CD163 and genotype by default', () => {
    const loci = getRegisteredLoci();
    expect(loci).toContain('CD163');
    expect(loci).toContain('genotype');
  });

  it('registerLocusPattern adds a new locus', () => {
    registerLocusPattern(testLocus, ['test_locus', 'TEST_LOCUS']);
    expect(getRegisteredLoci()).toContain(testLocus);
  });

  it('registered locus can be resolved from individual fields', () => {
    registerLocusPattern(testLocus, ['test_locus', 'TEST_LOCUS']);
    const result = resolveGenotype(makeInd({ test_locus: 'custom_value' }));
    expect(result.loci[testLocus]).toBe('custom_value');
  });

  it('registered locus resolves using first matching key', () => {
    registerLocusPattern(testLocus, ['test_locus', 'TEST_LOCUS']);
    const result = resolveGenotype(makeInd({ TEST_LOCUS: 'uppercase_value' }));
    expect(result.loci[testLocus]).toBe('uppercase_value');
  });

  it('unregisterLocusPattern removes the locus', () => {
    registerLocusPattern(testLocus, ['test_locus']);
    unregisterLocusPattern(testLocus);
    expect(getRegisteredLoci()).not.toContain(testLocus);
  });

  it('unregistered locus no longer resolves from fields', () => {
    registerLocusPattern(testLocus, ['test_locus']);
    unregisterLocusPattern(testLocus);
    const result = resolveGenotype(makeInd({ test_locus: 'value' }));
    expect(result.loci[testLocus]).toBeUndefined();
  });

  it('registerLocusPattern appends keys to existing locus', () => {
    registerLocusPattern('CD163', ['CD163_EXTRA']);
    const result = resolveGenotype(makeInd({ CD163_EXTRA: 'extra_val' }));
    expect(result.loci['CD163']).toBe('extra_val');
    // Clean up: re-register without the extra key is not possible, but unregistering and
    // the test environment isolates via beforeEach/afterEach on testLocus only.
    // CD163 extra key will persist but won't break other tests.
  });
});
