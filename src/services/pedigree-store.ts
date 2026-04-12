import { type IDBPDatabase, openDB } from 'idb';

import { PedigreeStoreError } from '../types/error.types';
import type { Individual, Mating, Project } from '../types/pedigree.types';
import { logger } from './logger';

/**
 * IndexedDB-backed data access layer for pedigree individuals, projects, and matings.
 *
 * v1: single `individuals` object store.
 * v2: added `projects` object store for multi-project support.
 * v3: added `matings` object store for breeding records.
 */

const DB_NAME = 'pedigree-workbench';
const DB_VERSION = 3;
const STORE_INDIVIDUALS = 'individuals';
const STORE_PROJECTS = 'projects';
const STORE_MATINGS = 'matings';

let dbPromise: Promise<IDBPDatabase> | null = null;
let openedDb: IDBPDatabase | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === 'undefined') {
    throw new PedigreeStoreError(
      'storage-unavailable',
      'IndexedDB is not available in the current environment.',
    );
  }
  if (dbPromise === null) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore(STORE_INDIVIDUALS, { keyPath: 'id' });
        }
        if (oldVersion < 2) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        }
        if (oldVersion < 3) {
          db.createObjectStore(STORE_MATINGS, { keyPath: 'id' });
        }
      },
    })
      .then((db) => {
        openedDb = db;
        return db;
      })
      .catch((cause) => {
        dbPromise = null;
        logger.error('pedigree-store.open-failed', { cause: String(cause) });
        throw new PedigreeStoreError('db-open-failed', 'Failed to open IndexedDB.', cause);
      });
  }
  return dbPromise;
}

// ---------------------------------------------------------------------------
// Individuals
// ---------------------------------------------------------------------------

/**
 * Returns every individual currently persisted, ordered by `id` ascending.
 */
export async function listAll(): Promise<Individual[]> {
  try {
    const db = await getDb();
    const rows = (await db.getAll(STORE_INDIVIDUALS)) as Individual[];
    return rows.slice().sort((a, b) => a.id.localeCompare(b.id));
  } catch (cause) {
    if (cause instanceof PedigreeStoreError) throw cause;
    logger.error('pedigree-store.list-failed', { cause: String(cause) });
    throw new PedigreeStoreError('db-read-failed', 'Failed to list individuals.', cause);
  }
}

/**
 * Inserts or replaces a single individual. Idempotent: calling with the same
 * id overwrites the previous record.
 */
export async function upsert(individual: Individual): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE_INDIVIDUALS, individual);
    logger.debug('pedigree-store.upsert', { id: individual.id });
  } catch (cause) {
    logger.error('pedigree-store.upsert-failed', { id: individual.id, cause: String(cause) });
    throw new PedigreeStoreError('db-write-failed', `Failed to upsert ${individual.id}.`, cause);
  }
}

/** Removes one individual by id. Missing ids are a no-op. */
export async function remove(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_INDIVIDUALS, id);
    logger.debug('pedigree-store.remove', { id });
  } catch (cause) {
    logger.error('pedigree-store.remove-failed', { id, cause: String(cause) });
    throw new PedigreeStoreError('db-write-failed', `Failed to remove ${id}.`, cause);
  }
}

/**
 * Replaces all rows with the provided dataset inside a single transaction.
 * Used by the import flow so partial writes never leave the canvas in a
 * mixed state.
 */
export async function bulkImport(individuals: readonly Individual[]): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_INDIVIDUALS, 'readwrite');
    await tx.store.clear();
    for (const individual of individuals) {
      await tx.store.put(individual);
    }
    await tx.done;
    logger.info('pedigree-store.bulk-import', { count: individuals.length });
  } catch (cause) {
    logger.error('pedigree-store.bulk-import-failed', {
      count: individuals.length,
      cause: String(cause),
    });
    throw new PedigreeStoreError('db-write-failed', 'Failed to bulk-import individuals.', cause);
  }
}

/** Drops every individual. Primarily for tests and the "Reset" UI. */
export async function clear(): Promise<void> {
  try {
    const db = await getDb();
    await db.clear(STORE_INDIVIDUALS);
    logger.info('pedigree-store.clear');
  } catch (cause) {
    logger.error('pedigree-store.clear-failed', { cause: String(cause) });
    throw new PedigreeStoreError('db-write-failed', 'Failed to clear individuals.', cause);
  }
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

/** Returns all projects, ordered by creation date descending (newest first). */
export async function listProjects(): Promise<Project[]> {
  try {
    const db = await getDb();
    const rows = (await db.getAll(STORE_PROJECTS)) as Project[];
    return rows.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (cause) {
    if (cause instanceof PedigreeStoreError) throw cause;
    logger.error('pedigree-store.list-projects-failed', { cause: String(cause) });
    throw new PedigreeStoreError('db-read-failed', 'Failed to list projects.', cause);
  }
}

/** Returns a single project by id, or `undefined` if not found. */
export async function getProject(id: string): Promise<Project | undefined> {
  try {
    const db = await getDb();
    return (await db.get(STORE_PROJECTS, id)) as Project | undefined;
  } catch (cause) {
    logger.error('pedigree-store.get-project-failed', { id, cause: String(cause) });
    throw new PedigreeStoreError('db-read-failed', `Failed to get project ${id}.`, cause);
  }
}

/** Inserts or replaces a project record. */
export async function saveProject(project: Project): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE_PROJECTS, project);
    logger.info('pedigree-store.save-project', { id: project.id, name: project.name });
  } catch (cause) {
    logger.error('pedigree-store.save-project-failed', { id: project.id, cause: String(cause) });
    throw new PedigreeStoreError('db-write-failed', `Failed to save project ${project.id}.`, cause);
  }
}

/** Removes a project by id. */
export async function deleteProject(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_PROJECTS, id);
    logger.info('pedigree-store.delete-project', { id });
  } catch (cause) {
    logger.error('pedigree-store.delete-project-failed', { id, cause: String(cause) });
    throw new PedigreeStoreError('db-write-failed', `Failed to delete project ${id}.`, cause);
  }
}

// ---------------------------------------------------------------------------
// Matings
// ---------------------------------------------------------------------------

/** Returns all mating records. */
export async function listMatings(): Promise<Mating[]> {
  try {
    const db = await getDb();
    return (await db.getAll(STORE_MATINGS)) as Mating[];
  } catch (cause) {
    if (cause instanceof PedigreeStoreError) throw cause;
    logger.error('pedigree-store.list-matings-failed', { cause: String(cause) });
    throw new PedigreeStoreError('db-read-failed', 'Failed to list matings.', cause);
  }
}

/** Inserts or replaces a mating record. */
export async function upsertMating(mating: Mating): Promise<void> {
  try {
    const db = await getDb();
    await db.put(STORE_MATINGS, mating);
    logger.debug('pedigree-store.upsert-mating', { id: mating.id });
  } catch (cause) {
    logger.error('pedigree-store.upsert-mating-failed', { id: mating.id, cause: String(cause) });
    throw new PedigreeStoreError('db-write-failed', `Failed to upsert mating ${mating.id}.`, cause);
  }
}

/** Removes a mating record by id. */
export async function removeMating(id: string): Promise<void> {
  try {
    const db = await getDb();
    await db.delete(STORE_MATINGS, id);
    logger.debug('pedigree-store.remove-mating', { id });
  } catch (cause) {
    logger.error('pedigree-store.remove-mating-failed', { id, cause: String(cause) });
    throw new PedigreeStoreError('db-write-failed', `Failed to remove mating ${id}.`, cause);
  }
}

/** Replaces all matings (used when switching projects). */
export async function bulkImportMatings(matings: readonly Mating[]): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction(STORE_MATINGS, 'readwrite');
    await tx.store.clear();
    for (const mating of matings) {
      await tx.store.put(mating);
    }
    await tx.done;
    logger.info('pedigree-store.bulk-import-matings', { count: matings.length });
  } catch (cause) {
    logger.error('pedigree-store.bulk-import-matings-failed', { count: matings.length, cause: String(cause) });
    throw new PedigreeStoreError('db-write-failed', 'Failed to bulk-import matings.', cause);
  }
}

/** Test-only: close and reset the cached connection so each test gets a fresh DB. */
export function __resetForTests(): void {
  if (openedDb !== null) {
    openedDb.close();
    openedDb = null;
  }
  dbPromise = null;
}
