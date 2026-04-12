import { describe, expect, it } from 'vitest';

import {
  cleanDna,
  translateDna,
  findLongestOrf,
} from '../../src/services/sequence-utils';

describe('cleanDna', () => {
  it('uppercases and strips whitespace', () => {
    expect(cleanDna('atg cgt\tacg\n')).toBe('ATGCGTACG');
  });

  it('converts U to T (RNA → DNA)', () => {
    expect(cleanDna('AUGCGU')).toBe('ATGCGT');
  });

  it('strips digits and dashes', () => {
    expect(cleanDna('123-ATG-456-CGT-')).toBe('ATGCGT');
  });

  it('handles mixed mess', () => {
    expect(cleanDna('  aug--cgu\t123 ')).toBe('ATGCGT');
  });
});

describe('translateDna', () => {
  it('translates known codons from frame 0', () => {
    // ATG=M, CGT=R, ACG=T → "MRT"
    expect(translateDna('ATGCGTACG')).toBe('MRT');
  });

  it('stops at stop codon', () => {
    // ATG=M, TAA=* → only "M"
    expect(translateDna('ATGTAA')).toBe('M');
  });

  it('translates from frame 1', () => {
    // skip first base: ATG=M, CGT=R, ACG=T
    expect(translateDna('AATGCGTACGA', 1)).toBe('MRT');
  });

  it('translates from frame 2', () => {
    // skip first 2 bases: GCG=A, TAC=Y
    expect(translateDna('AAGCGTAC', 2)).toBe('AY');
  });

  it('returns empty string for too-short sequence', () => {
    expect(translateDna('AT')).toBe('');
  });

  it('stops at TAG stop codon', () => {
    expect(translateDna('ATGTAG')).toBe('M');
  });

  it('stops at TGA stop codon', () => {
    expect(translateDna('ATGTGA')).toBe('M');
  });
});

describe('findLongestOrf', () => {
  it('finds an ATG-to-stop ORF in frame 0', () => {
    // ATG GCG TAA → M A (stop)
    const result = findLongestOrf('ATGGCGTAA');
    expect(result).not.toBeNull();
    expect(result!.protein).toBe('MA');
    expect(result!.frame).toBe(0);
    expect(result!.start).toBe(0);
  });

  it('finds the longest ORF across frames', () => {
    // Frame 0: no ATG early; Frame 1 has a longer ORF
    // Construct: X ATG GCG GCG TAA (frame 1 ORF = MAA, 3 AA)
    //            plus ATG TAA at frame 0 (only M, 1 AA)
    const dna = 'ATGTAAAATGGCGGCGTAA';
    // Frame 0: ATG TAA → M (len 1)
    // Frame 1: starts at 1, codons: TGT, AAA, TGG, CGG, CGT, AA → no ATG start
    // Frame 2: starts at 2, codons: GTA, AAA, TGG, CGG, CGT, A → no ATG start
    // Actually let me reconsider. ATG at pos 0 stops at pos 3 (TAA) → "M"
    // ATG at pos 9: GCG GCG TAA → "MAGG" wait no...
    // pos 9: ATG, pos 12: GCG, pos 15: GCG (wait only to 19)
    // ATGTAAAATGGCGGCGTAA
    // 0: ATG TAA → M (1)
    // 0: ATG at pos 9: ATGGCGGCGTAA → ATG GCG GCG TAA → MAAA wait
    // ATG=M, GCG=A, GCG=A, TAA=* → "MAA" (3 AA)
    const result = findLongestOrf(dna);
    expect(result).not.toBeNull();
    expect(result!.protein).toBe('MAA');
    // Frame 1 finds ATG at position 7 (A[7]T[8]G[9]), then GCG GCG TAA → "MAA"
    expect(result!.frame).toBe(1);
    expect(result!.start).toBe(7);
  });

  it('falls back to frame 0 when no ATG found', () => {
    // No ATG anywhere: GCG GCG GCG → AAA
    const result = findLongestOrf('GCGGCGGCG');
    expect(result).not.toBeNull();
    expect(result!.protein).toBe('AAA');
    expect(result!.frame).toBe(0);
    expect(result!.start).toBe(0);
  });

  it('returns null for empty sequence', () => {
    expect(findLongestOrf('')).toBeNull();
  });

  it('returns null for sequence shorter than 3 nt', () => {
    expect(findLongestOrf('AT')).toBeNull();
  });

  it('finds ORF starting in frame 1', () => {
    // Frame 1: A ATG GCG TAA
    const result = findLongestOrf('AATGGCGTAA');
    expect(result).not.toBeNull();
    expect(result!.protein).toBe('MA');
    expect(result!.frame).toBe(1);
    expect(result!.start).toBe(1);
  });

  it('finds ORF starting in frame 2', () => {
    // Frame 2: AA ATG GCG TAA
    const result = findLongestOrf('AAATGGCGTAA');
    expect(result).not.toBeNull();
    expect(result!.protein).toBe('MA');
    expect(result!.frame).toBe(2);
    expect(result!.start).toBe(2);
  });
});
