/**
 * Discriminated error types for the data-access and import layers.
 *
 * Throwing `PedigreeStoreError` instead of raw `Error` lets callers branch
 * on `kind` instead of fragile string matching.
 */

export type PedigreeStoreErrorKind =
  | 'db-open-failed'
  | 'db-read-failed'
  | 'db-write-failed'
  | 'not-found'
  | 'storage-unavailable';

export class PedigreeStoreError extends Error {
  public readonly kind: PedigreeStoreErrorKind;
  public override readonly cause?: unknown;

  constructor(kind: PedigreeStoreErrorKind, message: string, cause?: unknown) {
    super(message);
    this.name = 'PedigreeStoreError';
    this.kind = kind;
    if (cause !== undefined) {
      this.cause = cause;
    }
  }
}

export type ImportErrorKind =
  | 'invalid-json'
  | 'schema-violation'
  | 'too-large'
  | 'empty-payload';

export class PedigreeImportError extends Error {
  public readonly kind: ImportErrorKind;
  public readonly issues?: readonly string[];

  constructor(kind: ImportErrorKind, message: string, issues?: readonly string[]) {
    super(message);
    this.name = 'PedigreeImportError';
    this.kind = kind;
    if (issues !== undefined) {
      this.issues = issues;
    }
  }
}
