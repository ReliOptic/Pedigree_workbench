import type { Individual } from '../types/pedigree.types';

/**
 * Realistic genetics experiment seed datasets.
 *
 * Dataset 1 — CD163 Knockout Swine Colony (30 individuals, 3 generations)
 *   CRISPR/Cas9 targeting exon 7 of porcine CD163 (Sus scrofa chromosome 5).
 *   KO animals show resistance to PRRS virus (Prrsv).
 *   Sequencing fragment: porcine CD163 exon 7 region (243 bp reference amplicon).
 *
 * Dataset 2 — Golden Retriever Kennel (15 individuals, 4 generations)
 *   Standard breeding records; no gene editing.
 *
 * Shape follows PRD v3.1 / Individual interface:
 *   - Top-level: id, sire, dam, sex, generation, group, birthDate, status,
 *                label, sequence, sequenceSource, notes
 *   - Everything else: fields (Record<string, string>)
 */

// ---------------------------------------------------------------------------
// Shared porcine CD163 exon 7 reference sequence (243 bp, IUPAC nucleotides).
// This is the amplicon used for Sanger/NGS genotyping after CRISPR editing.
// Source: Sus scrofa CD163 RefSeq NM_213920.1, exon 7 region.
// ---------------------------------------------------------------------------
const CD163_REF_SEQ =
  'ATGCAGCTGGTGGAGAACCTGCGGACCTGCAGCTTCGTGGTGGACAACATCACCATCGTG' +
  'GAGCAGCTGAAGAACAAGATCACCGTGGAGCGGCTGCAGAAGCACATCGACGTGCTGCCC' +
  'AAGGTGCAGCTGGTGGAGCGGCTGCAGAACCTGCGGACCTGCAGCTTCGTGGTGGACAAC' +
  'ATCACCATCGTGGAGCAGCTGAAGAACAAGATCACCGTGGAGCGG';

// 217 bp deletion allele (simulates large exon 7 deletion)
const CD163_DEL217_SEQ =
  'ATGCAGCTGGTGGAGAACCTGCGGACCTGCAGCTTCGTGGTGGACAACATCACC' +
  'ATCGTGGAGCGGCTGCAGAACCTGCGGACCTGCAGCTTCGTG';

// 5 bp insertion allele (frameshift)
const CD163_INS5_SEQ =
  'ATGCAGCTGGTGGAGAACCTGCGGACCTGCAGCTTCGTGGTGGACAACATCACCATCGTG' +
  'GTTACCGAGCAGCTGAAGAACAAGATCACCGTGGAGCGGCTGCAGAAGCACATCGACGTG' +
  'CTGCCCAAGGTGCAGCTGGTGGAGCGGCTGCAGAACCTGCGGACCTGCAGCTTCGTGGTG' +
  'GACAACATCACCATCGTGGAGCAGCTGAAGAACAAGATCACCGTGGAGCGG';

// 3 bp deletion allele (in-frame, partial function)
const CD163_DEL3_SEQ =
  'ATGCAGCTGGTGGAGAACCTGCGGACCTGCAGCTTCGTGGTGGACAACATCACCGTG' +
  'GAGCAGCTGAAGAACAAGATCACCGTGGAGCGGCTGCAGAAGCACATCGACGTGCTG' +
  'CCCAAGGTGCAGCTGGTGGAGCGGCTGCAGAACCTGCGGACCTGCAGCTTCGTGGTG' +
  'GACAACATCACCATCGTGGAGCAGCTGAAGAACAAGATCACCGTGGAGCGG';

// ---------------------------------------------------------------------------
// Dataset 1: CD163 Knockout Swine Colony
// Experiment timeline:
//   F0 founders born 2023-03 (CRISPR-edited embryos transferred to surrogates)
//   F1 litters born 2024-01 to 2024-03 (F0 × F0 matings)
//   F2 litters born 2024-11 to 2025-01 (selected F1 × F1 matings)
// ---------------------------------------------------------------------------
const CD163_SWINE: Individual[] = [
  // ── F0 Founders ──────────────────────────────────────────────────────────
  // Boar 1: confirmed biallelic KO (217bp del / 217bp del)
  {
    id: 'SNU-B001',
    label: 'B001',
    sex: 'male',
    generation: 'F0',
    group: 'F0-founders',
    birthDate: '2023-03-14',
    status: 'breeding',
    surrogate: 'SRG-2301',
    sequence: CD163_DEL217_SEQ,
    sequenceSource: 'Sanger',
    notes: '편집 효율 97.3%. 양립대립유전자 결실 확인. PRRS challenge test passed (2023-08).',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '217bp del',
      cd163_allele2: '217bp del',
      prrs_resistance: 'resistant',
    },
  },
  // Boar 2: heterozygous (WT / 217bp del)
  {
    id: 'SNU-B002',
    label: 'B002',
    sex: 'male',
    generation: 'F0',
    group: 'F0-founders',
    birthDate: '2023-03-14',
    status: 'breeding',
    surrogate: 'SRG-2301',
    sequence: CD163_REF_SEQ,
    sequenceSource: 'Sanger',
    notes: '한쪽 대립유전자만 편집됨 (heterozygous). 교배 계획에 포함.',
    fields: {
      CD163: '50.00%',
      cd163_genotype: 'HET',
      cd163_allele1: 'wild-type',
      cd163_allele2: '217bp del',
      prrs_resistance: 'partial',
    },
  },
  // Boar 3: biallelic KO (5bp ins / 217bp del)
  {
    id: 'SNU-B003',
    label: 'B003',
    sex: 'male',
    generation: 'F0',
    group: 'F0-founders',
    birthDate: '2023-03-21',
    status: 'breeding',
    surrogate: 'SRG-2302',
    sequence: CD163_INS5_SEQ,
    sequenceSource: 'NGS',
    notes: '편집 효율 92.1%. 복합 이형접합체(compound heterozygote). PRRS challenge test passed.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '5bp ins',
      cd163_allele2: '217bp del',
      prrs_resistance: 'resistant',
    },
  },
  // Boar 4: wild-type (control boar, no editing)
  {
    id: 'SNU-B004',
    label: 'B004',
    sex: 'male',
    generation: 'F0',
    group: 'F0-founders',
    birthDate: '2023-03-21',
    status: 'culled',
    surrogate: 'SRG-2302',
    sequence: CD163_REF_SEQ,
    sequenceSource: 'Sanger',
    notes: '비편집 대조군. 2024-06 도태.',
    fields: {
      CD163: '0.00%',
      cd163_genotype: 'WT',
      cd163_allele1: 'wild-type',
      cd163_allele2: 'wild-type',
      prrs_resistance: 'susceptible',
    },
  },
  // Sow 1: biallelic KO (217bp del / 5bp ins)
  {
    id: 'SNU-S011',
    label: 'S011',
    sex: 'female',
    generation: 'F0',
    group: 'F0-founders',
    birthDate: '2023-03-14',
    status: 'breeding',
    surrogate: 'SRG-2303',
    sequence: CD163_DEL217_SEQ,
    sequenceSource: 'NGS',
    notes: '편집 효율 94.8%. 정상 발정 주기 확인. 1산차 2024-01.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '217bp del',
      cd163_allele2: '5bp ins',
      prrs_resistance: 'resistant',
    },
  },
  // Sow 2: heterozygous (WT / 5bp ins)
  {
    id: 'SNU-S012',
    label: 'S012',
    sex: 'female',
    generation: 'F0',
    group: 'F0-founders',
    birthDate: '2023-03-14',
    status: 'breeding',
    surrogate: 'SRG-2303',
    sequence: CD163_REF_SEQ,
    sequenceSource: 'Sanger',
    notes: '이형접합체. 정상 번식 성적.',
    fields: {
      CD163: '50.00%',
      cd163_genotype: 'HET',
      cd163_allele1: 'wild-type',
      cd163_allele2: '5bp ins',
      prrs_resistance: 'partial',
    },
  },
  // Sow 3: biallelic KO (217bp del / 3bp del)
  {
    id: 'SNU-S013',
    label: 'S013',
    sex: 'female',
    generation: 'F0',
    group: 'F0-founders',
    birthDate: '2023-03-21',
    status: 'breeding',
    surrogate: 'SRG-2304',
    sequence: CD163_DEL3_SEQ,
    sequenceSource: 'NGS',
    notes: '편집 효율 91.2%. 2산차 2024-03. 생산성 우수.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '217bp del',
      cd163_allele2: '3bp del',
      prrs_resistance: 'resistant',
    },
  },
  // Sow 4: wild-type (control sow)
  {
    id: 'SNU-S014',
    label: 'S014',
    sex: 'female',
    generation: 'F0',
    group: 'F0-founders',
    birthDate: '2023-03-21',
    status: 'reserved',
    surrogate: 'SRG-2304',
    sequence: CD163_REF_SEQ,
    sequenceSource: 'Sanger',
    notes: '비편집 대조군. 대조 실험용으로 보류.',
    fields: {
      CD163: '0.00%',
      cd163_genotype: 'WT',
      cd163_allele1: 'wild-type',
      cd163_allele2: 'wild-type',
      prrs_resistance: 'susceptible',
    },
  },

  // ── F1 Litter A: SNU-B001 (KO) × SNU-S012 (HET) → expected 50% KO, 50% HET ─
  {
    id: 'SNU-B021',
    label: 'B021',
    sex: 'male',
    generation: 'F1',
    sire: 'SNU-B001',
    dam: 'SNU-S012',
    group: 'L2024-A',
    birthDate: '2024-01-09',
    status: 'breeding',
    sequence: CD163_DEL217_SEQ,
    sequenceSource: 'Sanger',
    notes: 'L2024-A 1번 개체. KO 확인.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '217bp del',
      cd163_allele2: '5bp ins',
      prrs_resistance: 'resistant',
    },
  },
  {
    id: 'SNU-S022',
    label: 'S022',
    sex: 'female',
    generation: 'F1',
    sire: 'SNU-B001',
    dam: 'SNU-S012',
    group: 'L2024-A',
    birthDate: '2024-01-09',
    status: 'breeding',
    sequence: CD163_REF_SEQ,
    sequenceSource: 'Sanger',
    notes: 'L2024-A 이형접합체. F2 교배 예정.',
    fields: {
      CD163: '50.00%',
      cd163_genotype: 'HET',
      cd163_allele1: 'wild-type',
      cd163_allele2: '217bp del',
      prrs_resistance: 'partial',
    },
  },
  {
    id: 'SNU-B023',
    label: 'B023',
    sex: 'male',
    generation: 'F1',
    sire: 'SNU-B001',
    dam: 'SNU-S012',
    group: 'L2024-A',
    birthDate: '2024-01-09',
    status: 'culled',
    sequence: CD163_DEL217_SEQ,
    sequenceSource: 'Sanger',
    notes: 'L2024-A KO 수컷. 2024-09 도태.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '217bp del',
      cd163_allele2: '5bp ins',
      prrs_resistance: 'resistant',
    },
  },
  {
    id: 'SNU-S024',
    label: 'S024',
    sex: 'female',
    generation: 'F1',
    sire: 'SNU-B001',
    dam: 'SNU-S012',
    group: 'L2024-A',
    birthDate: '2024-01-09',
    status: 'active',
    sequence: CD163_DEL217_SEQ,
    sequenceSource: 'Sanger',
    notes: 'L2024-A KO 암컷.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '217bp del',
      cd163_allele2: '5bp ins',
      prrs_resistance: 'resistant',
    },
  },
  {
    id: 'SNU-S025',
    label: 'S025',
    sex: 'female',
    generation: 'F1',
    sire: 'SNU-B001',
    dam: 'SNU-S012',
    group: 'L2024-A',
    birthDate: '2024-01-09',
    status: 'active',
    sequence: CD163_REF_SEQ,
    sequenceSource: 'Sanger',
    notes: 'L2024-A 이형접합체 암컷.',
    fields: {
      CD163: '50.00%',
      cd163_genotype: 'HET',
      cd163_allele1: 'wild-type',
      cd163_allele2: '5bp ins',
      prrs_resistance: 'partial',
    },
  },

  // ── F1 Litter B: SNU-B002 (HET) × SNU-S011 (KO) → expected 50% KO, 50% HET ─
  {
    id: 'SNU-B031',
    label: 'B031',
    sex: 'male',
    generation: 'F1',
    sire: 'SNU-B002',
    dam: 'SNU-S011',
    group: 'L2024-B',
    birthDate: '2024-01-22',
    status: 'breeding',
    sequence: CD163_DEL217_SEQ,
    sequenceSource: 'NGS',
    notes: 'L2024-B KO 수컷. F2 교배 사용.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '217bp del',
      cd163_allele2: '217bp del',
      prrs_resistance: 'resistant',
    },
  },
  {
    id: 'SNU-S032',
    label: 'S032',
    sex: 'female',
    generation: 'F1',
    sire: 'SNU-B002',
    dam: 'SNU-S011',
    group: 'L2024-B',
    birthDate: '2024-01-22',
    status: 'active',
    sequence: CD163_REF_SEQ,
    sequenceSource: 'Sanger',
    notes: 'L2024-B 이형접합체.',
    fields: {
      CD163: '50.00%',
      cd163_genotype: 'HET',
      cd163_allele1: 'wild-type',
      cd163_allele2: '217bp del',
      prrs_resistance: 'partial',
    },
  },
  {
    id: 'SNU-B033',
    label: 'B033',
    sex: 'male',
    generation: 'F1',
    sire: 'SNU-B002',
    dam: 'SNU-S011',
    group: 'L2024-B',
    birthDate: '2024-01-22',
    status: 'culled',
    sequence: CD163_DEL217_SEQ,
    sequenceSource: 'Sanger',
    notes: 'L2024-B KO 수컷. 생산성 부족으로 도태.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '5bp ins',
      cd163_allele2: '217bp del',
      prrs_resistance: 'resistant',
    },
  },
  {
    id: 'SNU-S034',
    label: 'S034',
    sex: 'female',
    generation: 'F1',
    sire: 'SNU-B002',
    dam: 'SNU-S011',
    group: 'L2024-B',
    birthDate: '2024-01-22',
    status: 'breeding',
    sequence: CD163_DEL217_SEQ,
    sequenceSource: 'NGS',
    notes: 'L2024-B KO 암컷. F2 교배 예정.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '217bp del',
      cd163_allele2: '5bp ins',
      prrs_resistance: 'resistant',
    },
  },

  // ── F1 Litter C: SNU-B003 (KO) × SNU-S013 (KO) → expected 100% KO ─────────
  {
    id: 'SNU-B041',
    label: 'B041',
    sex: 'male',
    generation: 'F1',
    sire: 'SNU-B003',
    dam: 'SNU-S013',
    group: 'L2024-C',
    birthDate: '2024-03-05',
    status: 'breeding',
    sequence: CD163_DEL217_SEQ,
    sequenceSource: 'NGS',
    notes: 'L2024-C 전수 KO 확인. PRRS 접종 시험 통과.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '217bp del',
      cd163_allele2: '3bp del',
      prrs_resistance: 'resistant',
    },
  },
  {
    id: 'SNU-S042',
    label: 'S042',
    sex: 'female',
    generation: 'F1',
    sire: 'SNU-B003',
    dam: 'SNU-S013',
    group: 'L2024-C',
    birthDate: '2024-03-05',
    status: 'breeding',
    sequence: CD163_INS5_SEQ,
    sequenceSource: 'NGS',
    notes: 'L2024-C KO 암컷. 복합 이형접합체.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '5bp ins',
      cd163_allele2: '3bp del',
      prrs_resistance: 'resistant',
    },
  },
  {
    id: 'SNU-B043',
    label: 'B043',
    sex: 'male',
    generation: 'F1',
    sire: 'SNU-B003',
    dam: 'SNU-S013',
    group: 'L2024-C',
    birthDate: '2024-03-05',
    status: 'reserved',
    sequence: CD163_DEL3_SEQ,
    sequenceSource: 'Sanger',
    notes: 'L2024-C KO 수컷. 구조 연구용 보류.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '3bp del',
      cd163_allele2: '217bp del',
      prrs_resistance: 'resistant',
    },
  },
  {
    id: 'SNU-S044',
    label: 'S044',
    sex: 'female',
    generation: 'F1',
    sire: 'SNU-B003',
    dam: 'SNU-S013',
    group: 'L2024-C',
    birthDate: '2024-03-05',
    status: 'active',
    sequence: CD163_DEL217_SEQ,
    sequenceSource: 'NGS',
    notes: 'L2024-C KO 암컷.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '217bp del',
      cd163_allele2: '3bp del',
      prrs_resistance: 'resistant',
    },
  },
  {
    id: 'SNU-S045',
    label: 'S045',
    sex: 'female',
    generation: 'F1',
    sire: 'SNU-B003',
    dam: 'SNU-S013',
    group: 'L2024-C',
    birthDate: '2024-03-05',
    status: 'active',
    sequence: CD163_INS5_SEQ,
    sequenceSource: 'NGS',
    notes: 'L2024-C KO 암컷. 5bp 삽입 대립유전자 보유.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '5bp ins',
      cd163_allele2: '217bp del',
      prrs_resistance: 'resistant',
    },
  },

  // ── F2 Litter D: SNU-B031 (KO) × SNU-S042 (KO) → 100% KO expected ──────────
  {
    id: 'SNU-B051',
    label: 'B051',
    sex: 'male',
    generation: 'F2',
    sire: 'SNU-B031',
    dam: 'SNU-S042',
    group: 'L2024-D',
    birthDate: '2024-11-12',
    status: 'active',
    sequence: CD163_DEL217_SEQ,
    sequenceSource: 'NGS',
    notes: 'F2 L2024-D. 전수 KO 확인. 안정적 유전.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '217bp del',
      cd163_allele2: '5bp ins',
      prrs_resistance: 'resistant',
    },
  },
  {
    id: 'SNU-S052',
    label: 'S052',
    sex: 'female',
    generation: 'F2',
    sire: 'SNU-B031',
    dam: 'SNU-S042',
    group: 'L2024-D',
    birthDate: '2024-11-12',
    status: 'active',
    sequence: CD163_INS5_SEQ,
    sequenceSource: 'NGS',
    notes: 'F2 L2024-D KO 암컷.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '5bp ins',
      cd163_allele2: '3bp del',
      prrs_resistance: 'resistant',
    },
  },
  {
    id: 'SNU-B053',
    label: 'B053',
    sex: 'male',
    generation: 'F2',
    sire: 'SNU-B031',
    dam: 'SNU-S042',
    group: 'L2024-D',
    birthDate: '2024-11-12',
    status: 'reserved',
    sequence: CD163_DEL3_SEQ,
    sequenceSource: 'Sanger',
    notes: 'F2 L2024-D. 3bp del 복합 이형접합체. 면역학 연구 보류.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '3bp del',
      cd163_allele2: '5bp ins',
      prrs_resistance: 'resistant',
    },
  },
  {
    id: 'SNU-S054',
    label: 'S054',
    sex: 'female',
    generation: 'F2',
    sire: 'SNU-B031',
    dam: 'SNU-S042',
    group: 'L2024-D',
    birthDate: '2024-11-12',
    status: 'active',
    sequence: CD163_DEL217_SEQ,
    sequenceSource: 'NGS',
    notes: 'F2 L2024-D KO 암컷.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '217bp del',
      cd163_allele2: '3bp del',
      prrs_resistance: 'resistant',
    },
  },

  // ── F2 Litter E: SNU-B041 (KO) × SNU-S034 (KO) → 100% KO expected ──────────
  {
    id: 'SNU-B061',
    label: 'B061',
    sex: 'male',
    generation: 'F2',
    sire: 'SNU-B041',
    dam: 'SNU-S034',
    group: 'L2025-E',
    birthDate: '2025-01-08',
    status: 'active',
    sequence: CD163_DEL217_SEQ,
    sequenceSource: 'NGS',
    notes: 'F2 L2025-E. PRRS 저항성 확정 계통.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '217bp del',
      cd163_allele2: '217bp del',
      prrs_resistance: 'resistant',
    },
  },
  {
    id: 'SNU-S062',
    label: 'S062',
    sex: 'female',
    generation: 'F2',
    sire: 'SNU-B041',
    dam: 'SNU-S034',
    group: 'L2025-E',
    birthDate: '2025-01-08',
    status: 'active',
    sequence: CD163_INS5_SEQ,
    sequenceSource: 'NGS',
    notes: 'F2 L2025-E KO 암컷.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '5bp ins',
      cd163_allele2: '217bp del',
      prrs_resistance: 'resistant',
    },
  },
  {
    id: 'SNU-B063',
    label: 'B063',
    sex: 'male',
    generation: 'F2',
    sire: 'SNU-B041',
    dam: 'SNU-S034',
    group: 'L2025-E',
    birthDate: '2025-01-08',
    status: 'reserved',
    sequence: CD163_DEL217_SEQ,
    sequenceSource: 'NGS',
    notes: 'F2 L2025-E. 표현형 분석 보류.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '217bp del',
      cd163_allele2: '5bp ins',
      prrs_resistance: 'resistant',
    },
  },
  {
    id: 'SNU-S064',
    label: 'S064',
    sex: 'female',
    generation: 'F2',
    sire: 'SNU-B041',
    dam: 'SNU-S034',
    group: 'L2025-E',
    birthDate: '2025-01-08',
    status: 'active',
    sequence: CD163_DEL3_SEQ,
    sequenceSource: 'Sanger',
    notes: 'F2 L2025-E KO 암컷. 3bp del / 217bp del 복합.',
    fields: {
      CD163: '100.00%',
      cd163_genotype: 'KO',
      cd163_allele1: '3bp del',
      cd163_allele2: '217bp del',
      prrs_resistance: 'resistant',
    },
  },
];

// ---------------------------------------------------------------------------
// Dataset 2: Golden Retriever Kennel
// Standard breeding records, no gene editing.
// ---------------------------------------------------------------------------
const GOLDEN_RETRIEVER: Individual[] = [
  // ── Generation P (Founders / Purchased) ──────────────────────────────────
  {
    id: 'GR-M001',
    label: 'Zeus',
    sex: 'male',
    generation: 'P',
    group: 'founders',
    birthDate: '2018-04-22',
    status: 'culled',
    notes: 'Import from Finland. PRA-clear, OFA Excellent hips.',
    fields: {
      coat_color: 'golden',
      hip_score: 'OFA Excellent',
      elbow_score: 'OFA Normal',
      dna_tested: 'PRA-clear, ichthyosis-clear, HUU-clear',
    },
  },
  {
    id: 'GR-F002',
    label: 'Bella',
    sex: 'female',
    generation: 'P',
    group: 'founders',
    birthDate: '2019-06-10',
    status: 'culled',
    notes: 'Domestic line. OFA Good hips. 3 litters produced.',
    fields: {
      coat_color: 'light golden',
      hip_score: 'OFA Good',
      elbow_score: 'OFA Normal',
      dna_tested: 'PRA-clear, ichthyosis-carrier, HUU-clear',
    },
  },
  {
    id: 'GR-M003',
    label: 'Copper',
    sex: 'male',
    generation: 'P',
    group: 'founders',
    birthDate: '2018-11-03',
    status: 'culled',
    notes: 'Red-gold coat line. OFA Good hips.',
    fields: {
      coat_color: 'dark golden',
      hip_score: 'OFA Good',
      elbow_score: 'OFA Normal',
      dna_tested: 'PRA-clear, ichthyosis-clear, HUU-clear',
    },
  },
  {
    id: 'GR-F004',
    label: 'Sunny',
    sex: 'female',
    generation: 'P',
    group: 'founders',
    birthDate: '2020-02-14',
    status: 'active',
    notes: 'Show line. Excellent hip conformation.',
    fields: {
      coat_color: 'golden',
      hip_score: 'OFA Excellent',
      elbow_score: 'OFA Normal',
      dna_tested: 'PRA-clear, ichthyosis-clear, HUU-clear',
    },
  },

  // ── Generation F1: Zeus × Bella ──────────────────────────────────────────
  {
    id: 'GR-M011',
    label: 'Duke',
    sex: 'male',
    generation: 'F1',
    sire: 'GR-M001',
    dam: 'GR-F002',
    group: 'L2021-A',
    birthDate: '2021-03-18',
    status: 'breeding',
    notes: 'Best puppy award 2022 regional show.',
    fields: {
      coat_color: 'golden',
      hip_score: 'OFA Good',
      elbow_score: 'OFA Normal',
      dna_tested: 'PRA-clear, ichthyosis-carrier, HUU-clear',
    },
  },
  {
    id: 'GR-F012',
    label: 'Amber',
    sex: 'female',
    generation: 'F1',
    sire: 'GR-M001',
    dam: 'GR-F002',
    group: 'L2021-A',
    birthDate: '2021-03-18',
    status: 'breeding',
    notes: 'Excellent temperament. Therapy dog certified.',
    fields: {
      coat_color: 'light golden',
      hip_score: 'OFA Excellent',
      elbow_score: 'OFA Normal',
      dna_tested: 'PRA-clear, ichthyosis-carrier, HUU-clear',
    },
  },
  {
    id: 'GR-M013',
    label: 'Scout',
    sex: 'male',
    generation: 'F1',
    sire: 'GR-M001',
    dam: 'GR-F002',
    group: 'L2021-A',
    birthDate: '2021-03-18',
    status: 'active',
    notes: 'Pet home placement. OFA hips pending.',
    fields: {
      coat_color: 'golden',
      hip_score: 'OFA Fair',
      elbow_score: 'OFA Normal',
      dna_tested: 'PRA-clear, ichthyosis-clear, HUU-clear',
    },
  },

  // ── Generation F1: Copper × Sunny ────────────────────────────────────────
  {
    id: 'GR-F021',
    label: 'Maple',
    sex: 'female',
    generation: 'F1',
    sire: 'GR-M003',
    dam: 'GR-F004',
    group: 'L2022-B',
    birthDate: '2022-05-30',
    status: 'breeding',
    notes: 'Dark golden coat. Hip OFA Excellent at 24 months.',
    fields: {
      coat_color: 'dark golden',
      hip_score: 'OFA Excellent',
      elbow_score: 'OFA Normal',
      dna_tested: 'PRA-clear, ichthyosis-clear, HUU-clear',
    },
  },
  {
    id: 'GR-M022',
    label: 'Blaze',
    sex: 'male',
    generation: 'F1',
    sire: 'GR-M003',
    dam: 'GR-F004',
    group: 'L2022-B',
    birthDate: '2022-05-30',
    status: 'active',
    notes: 'Service dog candidate. Outstanding drive.',
    fields: {
      coat_color: 'golden',
      hip_score: 'OFA Good',
      elbow_score: 'OFA Normal',
      dna_tested: 'PRA-clear, ichthyosis-clear, HUU-clear',
    },
  },

  // ── Generation F2: Duke × Maple ──────────────────────────────────────────
  {
    id: 'GR-M031',
    label: 'Titan',
    sex: 'male',
    generation: 'F2',
    sire: 'GR-M011',
    dam: 'GR-F021',
    group: 'L2023-C',
    birthDate: '2023-09-14',
    status: 'active',
    notes: 'Strong bone structure. Hip evaluation at 18 months.',
    fields: {
      coat_color: 'dark golden',
      hip_score: 'OFA Good',
      elbow_score: 'OFA Normal',
      dna_tested: 'PRA-clear, ichthyosis-carrier, HUU-clear',
    },
  },
  {
    id: 'GR-F032',
    label: 'Luna',
    sex: 'female',
    generation: 'F2',
    sire: 'GR-M011',
    dam: 'GR-F021',
    group: 'L2023-C',
    birthDate: '2023-09-14',
    status: 'breeding',
    notes: 'Light coat, excellent angulation. Show prospect.',
    fields: {
      coat_color: 'light golden',
      hip_score: 'OFA Excellent',
      elbow_score: 'OFA Normal',
      dna_tested: 'PRA-clear, ichthyosis-clear, HUU-clear',
    },
  },

  // ── Generation F2: Duke × Amber (half-sibling mating avoided; Amber × Blaze) ─
  {
    id: 'GR-M041',
    label: 'Rio',
    sex: 'male',
    generation: 'F2',
    sire: 'GR-M022',
    dam: 'GR-F012',
    group: 'L2024-D',
    birthDate: '2024-02-20',
    status: 'active',
    notes: 'Field line cross. High energy, excellent nose work.',
    fields: {
      coat_color: 'golden',
      hip_score: 'OFA Good',
      elbow_score: 'OFA Normal',
      dna_tested: 'PRA-clear, ichthyosis-carrier, HUU-clear',
    },
  },
  {
    id: 'GR-F042',
    label: 'Hazel',
    sex: 'female',
    generation: 'F2',
    sire: 'GR-M022',
    dam: 'GR-F012',
    group: 'L2024-D',
    birthDate: '2024-02-20',
    status: 'active',
    notes: 'Dark coat expression. Puppy evaluation top score.',
    fields: {
      coat_color: 'dark golden',
      hip_score: 'OFA Excellent',
      elbow_score: 'OFA Normal',
      dna_tested: 'PRA-clear, ichthyosis-clear, HUU-clear',
    },
  },

  // ── Generation F3: Titan × Luna ──────────────────────────────────────────
  {
    id: 'GR-F051',
    label: 'Nova',
    sex: 'female',
    generation: 'F3',
    sire: 'GR-M031',
    dam: 'GR-F032',
    group: 'L2025-E',
    birthDate: '2025-03-02',
    status: 'active',
    notes: 'F3 generation. Hip evaluation pending (12 months).',
    fields: {
      coat_color: 'golden',
      hip_score: 'pending',
      elbow_score: 'pending',
      dna_tested: 'PRA-clear, ichthyosis-carrier, HUU-clear',
    },
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return a seed dataset by name.
 *
 * - `'cd163-swine'` — 30-individual CRISPR/Cas9 CD163 KO swine colony
 *   (3 generations: F0 founders, F1 litters, F2 progeny)
 * - `'golden-retriever'` — 15-individual Golden Retriever breeding kennel
 *   (4 generations: P founders, F1–F3)
 */
export function getSeedData(dataset: 'cd163-swine' | 'golden-retriever'): Individual[] {
  switch (dataset) {
    case 'cd163-swine':
      return CD163_SWINE;
    case 'golden-retriever':
      return GOLDEN_RETRIEVER;
  }
}

/**
 * Legacy export — kept for backward compatibility with `pedigree-store.ensureSeeded`.
 * Returns the CD163 swine colony dataset (same as `getSeedData('cd163-swine')`).
 */
export const SEED_INDIVIDUALS: readonly Individual[] = CD163_SWINE;
