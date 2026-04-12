import { describe, expect, it } from 'vitest';

import { toMermaid } from '../../src/services/pedigree-mermaid';
import type { Individual } from '../../src/types/pedigree.types';

describe('toMermaid', () => {
  const sire: Individual = {
    id: 'S1',
    sex: 'M',
    generation: 'F0',
    label: 'Sire-1',
    fields: {},
  };

  const dam: Individual = {
    id: 'D1',
    sex: 'F',
    generation: 'F0',
    label: 'Dam-1',
    fields: {},
  };

  const child: Individual = {
    id: 'C1',
    sire: 'S1',
    dam: 'D1',
    sex: 'M',
    generation: 'F1',
    label: 'Child-1',
    fields: {},
  };

  const trio: readonly Individual[] = [sire, dam, child];

  it('starts with flowchart TD', () => {
    const result = toMermaid(trio);
    expect(result).toMatch(/^flowchart TD/);
  });

  it('produces sanitized node IDs with correct shapes', () => {
    const result = toMermaid(trio);
    // Male -> square brackets
    expect(result).toContain('n_S1["Sire-1<br/>');
    // Female -> round brackets
    expect(result).toContain('n_D1("Dam-1<br/>');
    // Child is male -> square brackets
    expect(result).toContain('n_C1["Child-1<br/>');
  });

  it('generates combined edge for sire & dam', () => {
    const result = toMermaid(trio);
    expect(result).toContain('n_S1 & n_D1 --> n_C1');
  });

  it('contains classDef lines for male, female, and unknown', () => {
    const result = toMermaid(trio);
    expect(result).toContain('classDef male fill:#dbeafe,stroke:#1d4ed8,stroke-width:2px');
    expect(result).toContain('classDef female fill:#fce7f3,stroke:#be185d,stroke-width:2px');
    expect(result).toContain('classDef unknown fill:#f1f5f9,stroke:#475569,stroke-width:2px');
  });

  it('applies class annotations to nodes', () => {
    const result = toMermaid(trio);
    expect(result).toContain(':::male');
    expect(result).toContain(':::female');
  });

  it('handles single-parent edges (sire only)', () => {
    const sireOnly: Individual = { id: 'X', sire: 'S1', sex: 'M', fields: {} };
    const result = toMermaid([sire, sireOnly]);
    expect(result).toContain('n_S1 --> n_X');
    expect(result).not.toContain('&');
  });

  it('handles single-parent edges (dam only)', () => {
    const damOnly: Individual = { id: 'Y', dam: 'D1', sex: 'F', fields: {} };
    const result = toMermaid([dam, damOnly]);
    expect(result).toContain('n_D1 --> n_Y');
  });

  it('renders unknown sex with diamond braces', () => {
    const unknown: Individual = { id: 'U1', sex: 'X', fields: {} };
    const result = toMermaid([unknown]);
    expect(result).toContain('n_U1{"U1<br/>?"}:::unknown');
  });

  it('sanitizes special characters in IDs', () => {
    const special: Individual = { id: 'SNUDB #1-1', sex: 'M', fields: {} };
    const result = toMermaid([special]);
    expect(result).toContain('n_SNUDB__1_1');
  });

  it('includes status in label when present', () => {
    const withStatus: Individual = { id: 'A', sex: 'M', status: 'alive', fields: {} };
    const result = toMermaid([withStatus]);
    expect(result).toContain('alive');
  });

  it('returns minimal output for empty array', () => {
    const result = toMermaid([]);
    expect(result).toMatch(/^flowchart TD/);
    expect(result).toContain('classDef male');
  });
});
