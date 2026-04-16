import type { Individual, Mating } from '../types/pedigree.types';

export interface PedigreeProjectFile {
  version: string;
  exportedAt: string;
  project: {
    name: string;
    species?: string;
    individuals: Individual[];
    matings: Mating[];
    nodePositions: Record<string, { x: number; y: number }>;
  };
}

/**
 * Export a project to a portable JSON format.
 */
export function exportProject(
  name: string,
  individuals: readonly Individual[],
  matings: readonly Mating[],
  nodePositions: Record<string, { x: number; y: number }>,
  species?: string,
): string {
  const data: PedigreeProjectFile = {
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    project: {
      name,
      species,
      individuals: [...individuals],
      matings: [...matings],
      nodePositions: { ...nodePositions },
    },
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Parse and validate an imported project file.
 */
export function parseProjectFile(json: string): PedigreeProjectFile {
  const data = JSON.parse(json) as PedigreeProjectFile;

  if (!data.version || !data.project) {
    throw new Error('This file does not appear to be a valid Pedigree Workbench project. Make sure you are opening a .pwb file exported from this app.');
  }
  if (!Array.isArray(data.project.individuals)) {
    throw new Error('The project file is missing the individuals list. The file may be incomplete or corrupted. Try exporting the project again from the source.');
  }

  return data;
}
