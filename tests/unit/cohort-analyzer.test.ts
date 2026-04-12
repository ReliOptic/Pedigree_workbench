import { describe, expect, it } from 'vitest';

import { hasF1Data, computeCohortStats, detectMissingData } from '../../src/services/cohort-analyzer';
import type { Individual } from '../../src/types/pedigree.types';

function makeInd(overrides: Partial<Individual> & { id: string }): Individual {
  return {
    fields: {},
    ...overrides,
  };
}

describe('hasF1Data', () => {
  it('returns false when no individuals have sire/dam referencing others', () => {
    const inds = [
      makeInd({ id: 'A' }),
      makeInd({ id: 'B' }),
      makeInd({ id: 'C', sire: 'EXTERNAL', dam: 'EXTERNAL2' }),
    ];
    expect(hasF1Data(inds)).toBe(false);
  });

  it('returns true when sire references an existing individual', () => {
    const inds = [
      makeInd({ id: 'A' }),
      makeInd({ id: 'B', sire: 'A' }),
    ];
    expect(hasF1Data(inds)).toBe(true);
  });

  it('returns true when dam references an existing individual', () => {
    const inds = [
      makeInd({ id: 'A' }),
      makeInd({ id: 'B', dam: 'A' }),
    ];
    expect(hasF1Data(inds)).toBe(true);
  });

  it('returns false for empty array', () => {
    expect(hasF1Data([])).toBe(false);
  });

  it('returns false when sire/dam are empty strings', () => {
    const inds = [
      makeInd({ id: 'A', sire: '', dam: '' }),
    ];
    expect(hasF1Data(inds)).toBe(false);
  });
});

describe('computeCohortStats', () => {
  it('returns zero counts for empty input', () => {
    const stats = computeCohortStats([]);
    expect(stats.totalCount).toBe(0);
    expect(stats.sexDistribution).toEqual({ male: 0, female: 0, unknown: 0 });
    expect(stats.litterGroups).toEqual([]);
    expect(stats.breedingCandidateCount).toBe(0);
  });

  it('counts sex correctly including Korean values', () => {
    const inds = [
      makeInd({ id: 'A', sex: '수컷' }),
      makeInd({ id: 'B', sex: '암컷' }),
      makeInd({ id: 'C', sex: 'M' }),
      makeInd({ id: 'D', sex: 'F' }),
      makeInd({ id: 'E', sex: 'male' }),
      makeInd({ id: 'F', sex: 'female' }),
      makeInd({ id: 'G' }),
    ];
    const stats = computeCohortStats(inds);
    expect(stats.sexDistribution.male).toBe(3);
    expect(stats.sexDistribution.female).toBe(3);
    expect(stats.sexDistribution.unknown).toBe(1);
  });

  it('groups individuals by group field', () => {
    const inds = [
      makeInd({ id: 'A', group: 'litter-1' }),
      makeInd({ id: 'B', group: 'litter-1' }),
      makeInd({ id: 'C', group: 'litter-2' }),
    ];
    const stats = computeCohortStats(inds);
    expect(stats.litterGroups).toHaveLength(2);
    const g1 = stats.litterGroups.find((lg) => lg.groupId === 'litter-1');
    expect(g1?.individuals).toHaveLength(2);
  });

  it('counts breeding candidates by Korean status', () => {
    const inds = [
      makeInd({ id: 'A', status: '교배예정돈' }),
      makeInd({ id: 'B', status: '폐사' }),
    ];
    const stats = computeCohortStats(inds);
    expect(stats.breedingCandidateCount).toBe(1);
  });

  it('counts breeding candidates by English status containing "breeding"', () => {
    const inds = [
      makeInd({ id: 'A', status: 'breeding candidate' }),
      makeInd({ id: 'B', status: 'deceased' }),
    ];
    const stats = computeCohortStats(inds);
    expect(stats.breedingCandidateCount).toBe(1);
  });

  it('builds generationBreakdown map', () => {
    const inds = [
      makeInd({ id: 'A', generation: 'F0' }),
      makeInd({ id: 'B', generation: 'F0' }),
      makeInd({ id: 'C', generation: 'F1' }),
    ];
    const stats = computeCohortStats(inds);
    expect(stats.generationBreakdown.get('F0')).toBe(2);
    expect(stats.generationBreakdown.get('F1')).toBe(1);
  });

  it('captures surrogate from group members', () => {
    const inds = [
      makeInd({ id: 'A', group: 'g1', surrogate: 'SG-01' }),
      makeInd({ id: 'B', group: 'g1' }),
    ];
    const stats = computeCohortStats(inds);
    expect(stats.litterGroups[0]?.surrogate).toBe('SG-01');
  });
});

describe('detectMissingData', () => {
  it('returns empty array for empty input', () => {
    expect(detectMissingData([])).toEqual([]);
  });

  it('detects missing sex', () => {
    const inds = [
      makeInd({ id: 'A' }),
      makeInd({ id: 'B', sex: 'M' }),
    ];
    const alerts = detectMissingData(inds);
    const sexAlert = alerts.find((a) => a.field === 'sex');
    expect(sexAlert).toBeDefined();
    expect(sexAlert?.missingCount).toBe(1);
    expect(sexAlert?.rate).toBe(0.5);
  });

  it('assigns high severity when rate > 50%', () => {
    const inds = [
      makeInd({ id: 'A' }),
      makeInd({ id: 'B' }),
      makeInd({ id: 'C', sex: 'M' }),
    ];
    const alerts = detectMissingData(inds);
    const sexAlert = alerts.find((a) => a.field === 'sex');
    expect(sexAlert?.severity).toBe('high');
  });

  it('assigns medium severity when rate between 20% and 50%', () => {
    // 4 missing out of 10 = 40% -> medium (> 0.2, <= 0.5)
    const inds = Array.from({ length: 10 }, (_, i) =>
      makeInd({ id: `X${i}`, sex: i < 6 ? 'M' : undefined }),
    );
    const alerts = detectMissingData(inds);
    const sexAlert = alerts.find((a) => a.field === 'sex');
    expect(sexAlert?.severity).toBe('medium');
  });

  it('assigns low severity when rate <= 20%', () => {
    const inds = Array.from({ length: 10 }, (_, i) =>
      makeInd({ id: `X${i}`, sex: i < 9 ? 'M' : undefined }),
    );
    const alerts = detectMissingData(inds);
    const sexAlert = alerts.find((a) => a.field === 'sex');
    expect(sexAlert?.severity).toBe('low');
  });

  it('detects missing CD163 via fields', () => {
    const inds = [
      makeInd({ id: 'A', fields: { CD163: '0.8' } }),
      makeInd({ id: 'B', fields: {} }),
    ];
    const alerts = detectMissingData(inds);
    const cd163Alert = alerts.find((a) => a.field === 'CD163');
    expect(cd163Alert?.missingCount).toBe(1);
  });

  it('sorts alerts by descending rate', () => {
    const inds = [
      makeInd({ id: 'A', sex: 'M' }),  // sex present
      makeInd({ id: 'B' }),              // sex missing
      makeInd({ id: 'C' }),              // sex missing
    ];
    const alerts = detectMissingData(inds);
    for (let i = 1; i < alerts.length; i++) {
      expect(alerts[i - 1]!.rate).toBeGreaterThanOrEqual(alerts[i]!.rate);
    }
  });

  it('returns no alert for a field that is fully populated', () => {
    const inds = [
      makeInd({ id: 'A', sex: 'M' }),
      makeInd({ id: 'B', sex: 'F' }),
    ];
    const alerts = detectMissingData(inds);
    expect(alerts.find((a) => a.field === 'sex')).toBeUndefined();
  });
});
