import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  __resetForTests,
  bulkImport,
  clear,
  listAll,
  listProjects,
  saveProject,
  getProject,
  deleteProject,
  remove,
  upsert,
} from '../../src/services/pedigree-store';
import type { Individual, Project } from '../../src/types/pedigree.types';

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
});

describe('project-store', () => {
  it('starts with no projects', async () => {
    const projects = await listProjects();
    expect(projects).toEqual([]);
  });

  it('saveProject + getProject round-trips', async () => {
    const proj: Project = {
      id: 'p1',
      name: 'Test Project',
      createdAt: '2026-01-01T00:00:00Z',
      data: [fixture],
    };
    await saveProject(proj);
    const loaded = await getProject('p1');
    expect(loaded).toBeDefined();
    expect(loaded!.name).toBe('Test Project');
    expect(loaded!.data).toHaveLength(1);
  });

  it('deleteProject removes the project', async () => {
    const proj: Project = {
      id: 'p1',
      name: 'Test',
      createdAt: '2026-01-01T00:00:00Z',
      data: [],
    };
    await saveProject(proj);
    await deleteProject('p1');
    expect(await getProject('p1')).toBeUndefined();
  });

  it('listProjects returns newest first', async () => {
    await saveProject({ id: 'a', name: 'Old', createdAt: '2026-01-01T00:00:00Z', data: [] });
    await saveProject({ id: 'b', name: 'New', createdAt: '2026-06-01T00:00:00Z', data: [] });
    const list = await listProjects();
    expect(list[0]!.id).toBe('b');
    expect(list[1]!.id).toBe('a');
  });
});
