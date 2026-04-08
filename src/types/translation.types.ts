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
  readonly cohortAnalysis: string;
  readonly reporting: string;
  readonly searchGenotypes: string;
  readonly addNode: string;
  readonly upload: string;
  readonly totalIndividuals: string;
  readonly generations: string;
  readonly filtered: string;
  readonly none: string;
  readonly liveCanvasSync: string;
  readonly canvasZoom: string;
  readonly resetView: string;
  readonly exportCsv: string;
  readonly nodeInspector: string;
  readonly individualId: string;
  readonly details: string;
  readonly clinical: string;
  readonly genetics: string;
  readonly history: string;
  readonly male: string;
  readonly female: string;
  readonly unknown: string;
  readonly proband: string;
  readonly individual: string;
  readonly birthDate: string;
  readonly karyotype: string;
  readonly phenotype: string;
  readonly consanguinity: string;
  readonly investigatorNotes: string;
  readonly hpoAnnotations: string;
  readonly editPedigreeNode: string;
  readonly importGeneticData: string;
  readonly importDescription: string;
  readonly rowsDetected: string;
  readonly fileColumn: string;
  readonly mapToField: string;
  readonly previewRow1: string;
  readonly cancel: string;
  readonly importData: string;
  readonly true: string;
  readonly false: string;
  readonly generation: string;
}

export type TranslationDictionary = Readonly<Record<Language, Translation>>;
