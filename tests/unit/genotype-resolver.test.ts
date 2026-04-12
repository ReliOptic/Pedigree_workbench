import { describe, expect, it } from 'vitest';

import { resolveGenotype } from '../../src/services/genotype-resolver';
import type { Individual } from '../../src/types/pedigree.types';

function makeInd(fields: Record<string, string>): Individual {
  return { id: 'test', fields };
}

describe('resolveGenotype', () => {
  it('returns undefined for both fields when fields bag is empty', () => {
    const result = resolveGenotype(makeInd({}));
    expect(result.cd163).toBeUndefined();
    expect(result.genotype).toBeUndefined();
  });

  it('resolves CD163 from uppercase key', () => {
    const result = resolveGenotype(makeInd({ CD163: '0.85' }));
    expect(result.cd163).toBe('0.85');
  });

  it('resolves CD163 from lowercase key', () => {
    const result = resolveGenotype(makeInd({ cd163: '0.70' }));
    expect(result.cd163).toBe('0.70');
  });

  it('resolves CD163 from CD163_KO key', () => {
    const result = resolveGenotype(makeInd({ CD163_KO: '0.90' }));
    expect(result.cd163).toBe('0.90');
  });

  it('resolves CD163 from cd163_ko key', () => {
    const result = resolveGenotype(makeInd({ cd163_ko: '0.60' }));
    expect(result.cd163).toBe('0.60');
  });

  it('resolves genotype from lowercase key', () => {
    const result = resolveGenotype(makeInd({ genotype: '3bp del (5/15)' }));
    expect(result.genotype).toBe('3bp del (5/15)');
  });

  it('resolves genotype from capitalized key', () => {
    const result = resolveGenotype(makeInd({ Genotype: '1bp ins/3bp del' }));
    expect(result.genotype).toBe('1bp ins/3bp del');
  });

  it('resolves genotype from uppercase key', () => {
    const result = resolveGenotype(makeInd({ GENOTYPE: 'homozygous KO' }));
    expect(result.genotype).toBe('homozygous KO');
  });

  it('returns undefined for empty string values', () => {
    const result = resolveGenotype(makeInd({ CD163: '', genotype: '' }));
    expect(result.cd163).toBeUndefined();
    expect(result.genotype).toBeUndefined();
  });

  it('resolves both CD163 and genotype independently', () => {
    const result = resolveGenotype(makeInd({ CD163: '0.75', genotype: '3bp del' }));
    expect(result.cd163).toBe('0.75');
    expect(result.genotype).toBe('3bp del');
  });

  it('CD163 and genotype are distinct columns — CD163 does not bleed into genotype', () => {
    const result = resolveGenotype(makeInd({ CD163: '0.80' }));
    expect(result.cd163).toBe('0.80');
    expect(result.genotype).toBeUndefined();
  });

  it('prefers CD163 over cd163 when both present', () => {
    const result = resolveGenotype(makeInd({ CD163: 'first', cd163: 'second' }));
    expect(result.cd163).toBe('first');
  });
});
