import { type IDBPDatabase, openDB } from 'idb';

import { PedigreeStoreError } from '../types/error.types';
import type { Individual } from '../types/pedigree.types';
import { logger } from './logger';
import { SEED_INDIVIDUALS } from './seed-data';

/**
 * IndexedDB-backed data access layer for pedigree individuals.
 *
 * The store keeps a single object store keyed by `Individual.id`. All public
 * functions wrap raw `idb` calls with structured logging and translate
 * driver errors into {@link PedigreeStoreError} so callers branch on `kind`
 * rather than parsing message strings.
 */

const DB_NAME = 'pedigree-workbench';
const DB_VERSION = 1;
const STORE_INDIVIDUALS = 'individuals';

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
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_INDIVIDUALS)) {
          db.createObjectStore(STORE_INDIVIDUALS, { keyPath: 'id' });
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

/**
 * Returns every individual currently persisted, ordered by `id` ascending.
 * Empty result is a valid state — callers should check `length` before
 * calling {@link ensureSeeded}.
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

/**
 * Seeds the store from {@link SEED_INDIVIDUALS} if and only if it is empty.
 * Returns `true` when seeding actually ran.
 */
export async function ensureSeeded(): Promise<boolean> {
  const existing = await listAll();
  if (existing.length > 0) return false;
  await bulkImport(SEED_INDIVIDUALS);
  return true;
}

/** Test-only: close and reset the cached connection so each test gets a fresh DB. */
export function __resetForTests(): void {
  if (openedDb !== null) {
    openedDb.close();
    openedDb = null;
  }
  dbPromise = null;
}
