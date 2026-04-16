import { useCallback, useEffect, useState } from 'react';

import {
  bulkImport,
  bulkImportMatings,
  deleteProject as storeDeleteProject,
  getProject,
  listAll,
  listMatings,
  listProjects,
  saveProject,
} from '../services/pedigree-store';
import {
  getActiveProjectId,
  setActiveProjectId,
} from '../services/settings-store';
import { logger } from '../services/logger';
import type { Individual, Mating, Project } from '../types/pedigree.types';

interface UseProjectsResult {
  readonly projects: readonly Project[];
  readonly activeProjectId: string | null;
  readonly isLoading: boolean;
  /** Switch to a different project. Saves the current workspace first. */
  readonly switchProject: (id: string) => Promise<void>;
  /** Create a new project from imported individuals and switch to it. */
  readonly createProject: (name: string, individuals: readonly Individual[], matings?: readonly Mating[], species?: string) => Promise<string>;
  /** Delete a project. If it was active, switches to another or clears workspace. */
  readonly removeProject: (id: string) => Promise<void>;
  /** Rename a project. */
  readonly renameProject: (id: string, name: string) => Promise<void>;
  /** Save the current workspace state into the active project. */
  readonly saveCurrentProject: () => Promise<void>;
  /** Reload the project list from the store. */
  readonly refreshProjects: () => Promise<void>;
  /** Update the species stored on the active project. */
  readonly saveProjectSpecies: (species: string) => Promise<void>;
}

function generateId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Manages multiple projects. Each project archives a snapshot of individuals.
 * The active project's data lives in the `individuals` store (the workspace).
 * Switching projects saves the current workspace back and loads the target.
 *
 * On first load after DB upgrade from v1, if there are existing individuals
 * but no projects, a default project is created to adopt them.
 */
export function useProjects(
  onWorkspaceChanged: () => Promise<void>,
  onMatingsChanged?: (matings: readonly Mating[]) => Promise<void>,
  onSpeciesChanged?: (species: string | undefined) => void,
): UseProjectsResult {
  const [projects, setProjects] = useState<readonly Project[]>([]);
  const [activeProjectId, setActiveState] = useState<string | null>(
    () => getActiveProjectId(),
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProjects = useCallback(async (): Promise<void> => {
    const list = await listProjects();
    setProjects(list);
  }, []);

  // Bootstrap: handle migration from v1 (individuals exist but no projects).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        let projectList = await listProjects();

        if (projectList.length === 0) {
          const individuals = await listAll();
          if (individuals.length > 0) {
            // Re-check after reading individuals so a concurrent import/project
            // creation cannot race this migration path and create a duplicate
            // default project.
            projectList = await listProjects();
            if (projectList.length === 0) {
              const id = generateId();
              const project: Project = {
                id,
                name: 'Default Project',
                createdAt: new Date().toISOString(),
                data: individuals,
              };
              await saveProject(project);
              projectList = [project];
              setActiveProjectId(id);
              if (!cancelled) {
                setActiveState(id);
              }
            }
          }
        }

        if (!cancelled) {
          setProjects(projectList);
          // Validate active project still exists.
          const storedId = getActiveProjectId();
          if (storedId !== null && !projectList.some((p) => p.id === storedId)) {
            // Active project was deleted; fall back.
            const fallback = projectList[0]?.id ?? null;
            setActiveProjectId(fallback);
            setActiveState(fallback);
            if (fallback !== null) {
              const proj = await getProject(fallback);
              if (proj !== undefined) {
                const fallbackMatings = proj.matings ?? [];
                await Promise.all([
                  bulkImport(proj.data),
                  bulkImportMatings(fallbackMatings),
                ]);
                await onWorkspaceChanged();
                if (onMatingsChanged !== undefined) {
                  await onMatingsChanged(fallbackMatings);
                }
                if (onSpeciesChanged !== undefined) {
                  onSpeciesChanged(proj.species);
                }
              }
            }
          }
        }
      } catch (cause) {
        logger.error('use-projects.bootstrap-failed', { cause: String(cause) });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onWorkspaceChanged, refreshProjects]);

  const saveCurrentProject = useCallback(async (): Promise<void> => {
    if (activeProjectId === null) return;
    const current = await getProject(activeProjectId);
    if (current === undefined) return;
    const [individuals, matings] = await Promise.all([listAll(), listMatings()]);
    await saveProject({ ...current, data: individuals, matings });
  }, [activeProjectId]);

  const switchProject = useCallback(
    async (id: string): Promise<void> => {
      // Save current workspace into the active project first.
      if (activeProjectId !== null) {
        await saveCurrentProject();
      }
      // Load target project data.
      const target = await getProject(id);
      if (target === undefined) return;
      const targetMatings = target.matings ?? [];
      await Promise.all([
        bulkImport(target.data),
        bulkImportMatings(targetMatings),
      ]);
      setActiveProjectId(id);
      setActiveState(id);
      await onWorkspaceChanged();
      if (onMatingsChanged !== undefined) {
        await onMatingsChanged(targetMatings);
      }
      if (onSpeciesChanged !== undefined) {
        onSpeciesChanged(target.species);
      }
      logger.info('use-projects.switch', { from: activeProjectId, to: id });
    },
    [activeProjectId, saveCurrentProject, onWorkspaceChanged, onMatingsChanged, onSpeciesChanged],
  );

  const createProject = useCallback(
    async (name: string, individuals: readonly Individual[], matings: readonly Mating[] = [], species?: string): Promise<string> => {
      // Save current workspace before switching.
      if (activeProjectId !== null) {
        await saveCurrentProject();
      }
      const id = generateId();
      const project: Project = {
        id,
        name,
        createdAt: new Date().toISOString(),
        data: individuals,
        matings,
        ...(species !== undefined ? { species } : {}),
      };
      await saveProject(project);
      // Load the new project's data into workspace.
      await Promise.all([bulkImport(individuals), bulkImportMatings(matings)]);
      setActiveProjectId(id);
      setActiveState(id);
      await refreshProjects();
      await onWorkspaceChanged();
      if (onMatingsChanged !== undefined) {
        await onMatingsChanged(matings);
      }
      if (onSpeciesChanged !== undefined) {
        onSpeciesChanged(species);
      }
      logger.info('use-projects.create', { id, name, count: individuals.length });
      return id;
    },
    [activeProjectId, saveCurrentProject, refreshProjects, onWorkspaceChanged, onMatingsChanged, onSpeciesChanged],
  );

  const removeProject = useCallback(
    async (id: string): Promise<void> => {
      await storeDeleteProject(id);
      const remaining = (await listProjects());
      setProjects(remaining);

      if (activeProjectId === id) {
        if (remaining.length > 0) {
          const next = remaining[0]!;
          const nextMatings = next.matings ?? [];
          await Promise.all([bulkImport(next.data), bulkImportMatings(nextMatings)]);
          setActiveProjectId(next.id);
          setActiveState(next.id);
          if (onMatingsChanged !== undefined) {
            await onMatingsChanged(nextMatings);
          }
          if (onSpeciesChanged !== undefined) {
            onSpeciesChanged(next.species);
          }
        } else {
          await Promise.all([bulkImport([]), bulkImportMatings([])]);
          setActiveProjectId(null);
          setActiveState(null);
          if (onMatingsChanged !== undefined) {
            await onMatingsChanged([]);
          }
        }
        await onWorkspaceChanged();
      }
      logger.info('use-projects.delete', { id });
    },
    [activeProjectId, onWorkspaceChanged, onMatingsChanged, onSpeciesChanged],
  );

  const renameProject = useCallback(
    async (id: string, name: string): Promise<void> => {
      const project = await getProject(id);
      if (project === undefined) return;
      await saveProject({ ...project, name });
      await refreshProjects();
    },
    [refreshProjects],
  );

  const saveProjectSpecies = useCallback(
    async (species: string): Promise<void> => {
      if (activeProjectId === null) return;
      const current = await getProject(activeProjectId);
      if (current === undefined) return;
      await saveProject({ ...current, species });
    },
    [activeProjectId],
  );

  return {
    projects,
    activeProjectId,
    isLoading,
    switchProject,
    createProject,
    removeProject,
    renameProject,
    saveCurrentProject,
    refreshProjects,
    saveProjectSpecies,
  };
}
