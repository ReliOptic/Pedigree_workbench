import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  __resetForTests,
  bulkImport,
  clear,
  ensureSeeded,
  listAll,
  remove,
  upsert,
} from '../../src/services/pedigree-store';
import { SEED_INDIVIDUALS } from '../../src/services/seed-data';
import type { Individual } from '../../src/types/pedigree.types';

const fixture: Individual = {
  id: 'TEST-001',
  sex: 'M',
  generation: 'F0',
  label: '01',
  fields: {},
};

beforeEach(async () => {
  __resetForTests();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('pedigree-workbench');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
});

afterEach(() => {
  __resetForTests();
});

describe('pedigree-store', () => {
  it('starts empty', async () => {
    const all = await listAll();
    expect(all).toEqual([]);
  });

  it('upsert is idempotent and round-trips', async () => {
    await upsert(fixture);
    await upsert(fixture);
    const all = await listAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.id).toBe('TEST-001');
  });

  it('remove deletes by id and missing id is a no-op', async () => {
    await upsert(fixture);
    await remove('TEST-001');
    await remove('does-not-exist');
    expect(await listAll()).toEqual([]);
  });

  it('bulkImport replaces all rows in a single transaction', async () => {
    await upsert(fixture);
    await bulkImport([
      { id: 'A', sex: 'F', generation: 'F0', fields: {} },
      { id: 'B', sex: 'M', generation: 'F1', fields: {} },
    ]);
    const all = await listAll();
    expect(all.map((i) => i.id)).toEqual(['A', 'B']);
  });

  it('clear empties the store', async () => {
    await upsert(fixture);
    await clear();
    expect(await listAll()).toEqual([]);
  });

  it('ensureSeeded seeds once and is idempotent', async () => {
    const firstRun = await ensureSeeded();
    const secondRun = await ensureSeeded();
    expect(firstRun).toBe(true);
    expect(secondRun).toBe(false);
    const all = await listAll();
    expect(all).toHaveLength(SEED_INDIVIDUALS.length);
  });
});
