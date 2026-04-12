import { describe, expect, it } from 'vitest';

import { computeLayout, summarize } from '../../src/services/pedigree-layout';
import type { Individual } from '../../src/types/pedigree.types';

const dataset: readonly Individual[] = [
  { id: 'S', sex: 'M', generation: 'F0', fields: {} },
  { id: 'D', sex: 'F', generation: 'F0', fields: {} },
  { id: 'C', sex: 'M', generation: 'F1', sire: 'S', dam: 'D', fields: {} },
];

describe('computeLayout', () => {
  it('places all nodes', () => {
    const layout = computeLayout(dataset);
    expect(layout.nodes).toHaveLength(3);
    const s = layout.nodes.find((n) => n.id === 'S');
    const d = layout.nodes.find((n) => n.id === 'D');
    const c = layout.nodes.find((n) => n.id === 'C');
    expect(s).toBeDefined();
    expect(d).toBeDefined();
    expect(c).toBeDefined();
  });

  it('places parents (F0) above children (F1)', () => {
    const layout = computeLayout(dataset);
    const s = layout.nodes.find((n) => n.id === 'S')!;
    const d = layout.nodes.find((n) => n.id === 'D')!;
    const c = layout.nodes.find((n) => n.id === 'C')!;
    // F0 parents should be above F1 child (lower y = higher on screen)
    expect(s.y).toBeLessThan(c.y);
    expect(d.y).toBeLessThan(c.y);
    // Parents should be on the same row
    expect(s.y).toBe(d.y);
  });

  it('places mating pair horizontally adjacent', () => {
    const layout = computeLayout(dataset);
    const s = layout.nodes.find((n) => n.id === 'S')!;
    const d = layout.nodes.find((n) => n.id === 'D')!;
    // Sire and dam should be on the same y (same generation row)
    expect(s.y).toBe(d.y);
    // They should be near each other horizontally
    expect(Math.abs(s.x - d.x)).toBeGreaterThan(0);
    expect(Math.abs(s.x - d.x)).toBeLessThan(500);
  });

  it('emits generationLabels for each generation', () => {
    const layout = computeLayout(dataset);
    expect(layout.generationLabels.length).toBeGreaterThanOrEqual(2);
    const f0 = layout.generationLabels.find((l) => l.label === 'F0');
    const f1 = layout.generationLabels.find((l) => l.label === 'F1');
    expect(f0).toBeDefined();
    expect(f1).toBeDefined();
    // F0 label should be above F1 label
    expect(f0!.y).toBeLessThan(f1!.y);
  });

  it('emits a connector for each child whose sire AND dam resolve', () => {
    const layout = computeLayout(dataset);
    expect(layout.connectors.length).toBeGreaterThanOrEqual(1);
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

  it('respects nodePositions overrides', () => {
    const layout = computeLayout(dataset, {}, [], { S: { x: 999, y: 888 } });
    const s = layout.nodes.find((n) => n.id === 'S')!;
    expect(s.x).toBe(999);
    expect(s.y).toBe(888);
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
