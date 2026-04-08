import { describe, expect, it } from 'vitest';

import { computeLayout, summarize } from '../../src/services/pedigree-layout';
import type { Individual } from '../../src/types/pedigree.types';

const dataset: readonly Individual[] = [
  { id: 'S', sex: 'M', generation: 'F0', fields: {} },
  { id: 'D', sex: 'F', generation: 'F0', fields: {} },
  { id: 'C', sex: 'M', generation: 'F1', sire: 'S', dam: 'D', fields: {} },
];

describe('computeLayout', () => {
  it('places nodes by generation row and input order within a row', () => {
    const layout = computeLayout(dataset);
    expect(layout.nodes).toHaveLength(3);
    const s = layout.nodes.find((n) => n.id === 'S');
    const d = layout.nodes.find((n) => n.id === 'D');
    const c = layout.nodes.find((n) => n.id === 'C');
    expect(s?.y).toBe(100);
    expect(d?.y).toBe(100);
    expect(c?.y).toBe(300);
    expect(s?.x).toBe(100);
    expect(d?.x).toBe(220);
  });

  it('emits a connector for each child whose sire AND dam resolve', () => {
    const layout = computeLayout(dataset);
    expect(layout.connectors).toHaveLength(1);
    expect(layout.connectors[0]?.childId).toBe('C');
  });

  it('skips children whose parents are missing from the dataset', () => {
    const orphan: readonly Individual[] = [
      { id: 'X', sex: 'M', generation: 'F1', sire: 'missing', dam: 'missing2', fields: {} },
    ];
    expect(computeLayout(orphan).connectors).toHaveLength(0);
  });

  it('returns generations in numeric order parsed from the label', () => {
    const mixed: readonly Individual[] = [
      { id: 'A', generation: 'F2', fields: {} },
      { id: 'B', generation: 'F0', fields: {} },
      { id: 'C', generation: 'F1', fields: {} },
    ];
    expect(computeLayout(mixed).generations).toEqual(['F0', 'F1', 'F2']);
  });
});

describe('summarize', () => {
  it('counts individuals and distinct generations and groups', () => {
    const data: readonly Individual[] = [
      { id: 'A', generation: 'F0', group: 'G1', fields: {} },
      { id: 'B', generation: 'F0', group: 'G1', fields: {} },
      { id: 'C', generation: 'F1', group: 'G2', fields: {} },
    ];
    expect(summarize(data)).toEqual({ totalIndividuals: 3, generations: 2, groups: 2 });
  });
});
