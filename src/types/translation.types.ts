/**
 * Translation contract.
 *
 * Strongly types the dictionaries in `src/translations.ts` so consumers
 * cannot read undeclared keys (eliminates the `t: any` escape hatch).
 */

export type Language = 'en' | 'ko';

export interface Translation {
  readonly appName: string;
  readonly workbench: string;
  readonly upload: string;
  readonly totalIndividuals: string;
  readonly generations: string;
  readonly liveCanvasSync: string;
  readonly nodeInspector: string;
  readonly individualId: string;
  readonly importGeneticData: string;
  readonly importDescription: string;
  readonly cancel: string;
  readonly importData: string;
  readonly generation: string;
  readonly addNode: string;
  readonly addParent: string;
  readonly edit: string;
  readonly save: string;
  readonly delete: string;
  readonly confirmDelete: string;
  readonly sequence: string;
  readonly sequenceSource: string;
  readonly sequenceLength: string;
  readonly copy: string;
  readonly copied: string;
  readonly viewInAlphafold: string;
  readonly alphafoldComingSoon: string;
  readonly predictStructure: string;
  readonly translatingDna: string;
  readonly foldingProtein: string;
  readonly proteinLength: string;
  readonly readingFrame: string;
  readonly downloadPdb: string;
  readonly structureError: string;
  readonly retryFold: string;
  readonly noSequence: string;
  readonly residues: string;
  readonly none: string;
  readonly csvImport: string;
  readonly dropFileHere: string;
  readonly browseFile: string;
  readonly orPasteJson: string;
  readonly mapColumns: string;
  readonly ignoreColumn: string;
  readonly freeField: string;
  readonly preview: string;
  readonly back: string;
  readonly rowsDetected: string;
  readonly downloadSampleCsv: string;
  readonly exportCsv: string;
  readonly searchGenotypes: string;
  readonly matches: string;
  readonly paperView: string;
  readonly downloadSvg: string;
  readonly downloadPng: string;
  readonly copyMermaidSource: string;
  readonly copySvg: string;
  readonly settings: string;
  readonly theme: string;
  readonly themeLight: string;
  readonly themeDark: string;
  readonly themeSystem: string;
  readonly language: string;
}

export type TranslationDictionary = Readonly<Record<Language, Translation>>;
