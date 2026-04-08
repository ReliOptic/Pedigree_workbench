import { describe, expect, it } from 'vitest';

import { computeLayout, summarize } from '../../src/services/pedigree-layout';
import type { Individual } from '../../src/types/pedigree.types';

const dataset: readonly Individual[] = [
  { id: 'S', label: '01', gender: 'male', generation: 1 },
  { id: 'D', label: '02', gender: 'female', generation: 1 },
  { id: 'C', label: '03', gender: 'male', generation: 2, sireId: 'S', damId: 'D' },
];

describe('computeLayout', () => {
  it('places nodes by index and generation', () => {
    const layout = computeLayout(dataset);
    expect(layout.nodes).toHaveLength(3);
    expect(layout.nodes[0]).toMatchObject({ id: 'S', x: 100, y: 100 });
    expect(layout.nodes[2]?.y).toBe(300);
  });

  it('emits a connector for each child whose parents resolve', () => {
    const layout = computeLayout(dataset);
    expect(layout.connectors).toHaveLength(1);
    expect(layout.connectors[0]?.childId).toBe('C');
  });

  it('skips children whose parents are missing', () => {
    const orphan: readonly Individual[] = [
      { id: 'X', label: 'x', gender: 'male', generation: 2, sireId: 'missing' },
    ];
    expect(computeLayout(orphan).connectors).toHaveLength(0);
  });

  it('returns sorted unique generations', () => {
    expect(computeLayout(dataset).generations).toEqual([1, 2]);
  });
});

describe('summarize', () => {
  it('counts individuals and distinct generations', () => {
    expect(summarize(dataset)).toEqual({ totalIndividuals: 3, generations: 2 });
  });
});
