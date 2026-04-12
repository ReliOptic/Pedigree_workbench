import { useCallback, useEffect, useState } from 'react';

import {
  bulkImport,
  deleteProject as storeDeleteProject,
  getProject,
  listAll,
  listProjects,
  saveProject,
} from '../services/pedigree-store';
import {
  getActiveProjectId,
  setActiveProjectId,
} from '../services/settings-store';
import { logger } from '../services/logger';
import type { Individual, Project } from '../types/pedigree.types';

interface UseProjectsResult {
  readonly projects: readonly Project[];
  readonly activeProjectId: string | null;
  readonly isLoading: boolean;
  /** Switch to a different project. Saves the current workspace first. */
  readonly switchProject: (id: string) => Promise<void>;
  /** Create a new project from imported individuals and switch to it. */
  readonly createProject: (name: string, individuals: readonly Individual[]) => Promise<string>;
  /** Delete a project. If it was active, switches to another or clears workspace. */
  readonly removeProject: (id: string) => Promise<void>;
  /** Rename a project. */
  readonly renameProject: (id: string, name: string) => Promise<void>;
  /** Save the current workspace state into the active project. */
  readonly saveCurrentProject: () => Promise<void>;
  /** Reload the project list from the store. */
  readonly refreshProjects: () => Promise<void>;
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
        const [projectList, individuals] = await Promise.all([
          listProjects(),
          listAll(),
        ]);

        if (projectList.length === 0 && individuals.length > 0) {
          // Migrate: create a default project from existing data.
          const id = generateId();
          const project: Project = {
            id,
            name: 'Default Project',
            createdAt: new Date().toISOString(),
            data: individuals,
          };
          await saveProject(project);
          setActiveProjectId(id);
          if (!cancelled) {
            setActiveState(id);
            setProjects([project]);
          }
        } else {
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
                  await bulkImport(proj.data);
                  await onWorkspaceChanged();
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
    const individuals = await listAll();
    await saveProject({ ...current, data: individuals });
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
      await bulkImport(target.data);
      setActiveProjectId(id);
      setActiveState(id);
      await onWorkspaceChanged();
      logger.info('use-projects.switch', { from: activeProjectId, to: id });
    },
    [activeProjectId, saveCurrentProject, onWorkspaceChanged],
  );

  const createProject = useCallback(
    async (name: string, individuals: readonly Individual[]): Promise<string> => {
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
      };
      await saveProject(project);
      // Load the new project's data into workspace.
      await bulkImport(individuals);
      setActiveProjectId(id);
      setActiveState(id);
      await refreshProjects();
      await onWorkspaceChanged();
      logger.info('use-projects.create', { id, name, count: individuals.length });
      return id;
    },
    [activeProjectId, saveCurrentProject, refreshProjects, onWorkspaceChanged],
  );

  const removeProject = useCallback(
    async (id: string): Promise<void> => {
      await storeDeleteProject(id);
      const remaining = (await listProjects());
      setProjects(remaining);

      if (activeProjectId === id) {
        if (remaining.length > 0) {
          const next = remaining[0]!;
          await bulkImport(next.data);
          setActiveProjectId(next.id);
          setActiveState(next.id);
        } else {
          await bulkImport([]);
          setActiveProjectId(null);
          setActiveState(null);
        }
        await onWorkspaceChanged();
      }
      logger.info('use-projects.delete', { id });
    },
    [activeProjectId, onWorkspaceChanged],
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
  };
}
