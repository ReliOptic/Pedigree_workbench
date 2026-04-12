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
  readonly undo: string;
  readonly redo: string;
  readonly keyboardShortcuts: string;
  readonly shortcutCanvas: string;
  readonly shortcutSearch: string;
  readonly shortcutEdit: string;
  readonly shortcutContextMenu: string;
  readonly shortcutGeneral: string;
  readonly pressQuestionForHelp: string;
  readonly projects: string;
  readonly newProject: string;
  readonly untitledProject: string;
  readonly deleteProject: string;
  readonly renameProject: string;
  readonly saved: string;
  readonly saving: string;
  readonly allChangesSaved: string;
  readonly noProjects: string;
  readonly notes: string;
  readonly addNote: string;
  readonly noNotes: string;
  readonly backupProject: string;
  readonly restoreBackup: string;
  readonly mating: string;
  readonly addMate: string;
  readonly matingDate: string;
  readonly dueDate: string;
  readonly gestationDays: string;
  readonly matingStatus: string;
  readonly planned: string;
  readonly mated: string;
  readonly pregnant: string;
  readonly delivered: string;
  readonly failed: string;
  readonly selectMate: string;
  readonly noMatings: string;
  readonly matings: string;
}

export type TranslationDictionary = Readonly<Record<Language, Translation>>;
