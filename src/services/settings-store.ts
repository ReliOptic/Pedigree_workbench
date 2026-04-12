import type { Language } from '../types/translation.types';
import { logger } from './logger';

/**
 * localStorage-backed key/value store for non-critical UI preferences.
 *
 * All accessors are synchronous and degrade silently to defaults when
 * `localStorage` is unavailable (e.g. private browsing or first paint in
 * SSR-style harnesses). The reason for soft-failing is that losing a UI
 * preference is acceptable, but throwing during the initial render is not.
 */

const KEY_LANGUAGE = 'pdw.language';
const KEY_LAST_SELECTED = 'pdw.lastSelectedId';
const KEY_ACTIVE_NAV = 'pdw.activeNav';
const KEY_THEME = 'pdw.theme';
const KEY_ACTIVE_PROJECT = 'pdw.activeProjectId';
const KEY_NODE_SIZE = 'pdw.nodeSize';
const KEY_SHOW_STATUS_BADGES = 'pdw.showStatusBadges';
const KEY_SHOW_GENERATION_LABELS = 'pdw.showGenerationLabels';
const KEY_AUTO_FIT_ON_IMPORT = 'pdw.autoFitOnImport';
const KEY_DEFAULT_GESTATION_DAYS = 'pdw.defaultGestationDays';
const KEY_AUTO_BACKUP_INTERVAL = 'pdw.autoBackupInterval';
const KEY_SHOW_NOTES_ON_HOVER = 'pdw.showNotesOnHover';
const KEY_CONNECTOR_LINE_STYLE = 'pdw.connectorLineStyle';

const DEFAULT_LANGUAGE: Language = 'en';

function safeGet(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch (cause) {
    logger.warn('settings-store.get-failed', { key, cause: String(cause) });
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  } catch (cause) {
    logger.warn('settings-store.set-failed', { key, cause: String(cause) });
  }
}

/** Returns the persisted UI language, or `'en'` if none/invalid. */
export function getLanguage(): Language {
  const raw = safeGet(KEY_LANGUAGE);
  return raw === 'en' || raw === 'ko' ? raw : DEFAULT_LANGUAGE;
}

export function setLanguage(language: Language): void {
  safeSet(KEY_LANGUAGE, language);
}

/** Returns the id of the most recently selected node, or `null`. */
export function getLastSelectedId(): string | null {
  return safeGet(KEY_LAST_SELECTED);
}

export function setLastSelectedId(id: string | null): void {
  if (id === null) {
    try {
      localStorage?.removeItem(KEY_LAST_SELECTED);
    } catch (cause) {
      logger.warn('settings-store.remove-failed', { key: KEY_LAST_SELECTED, cause: String(cause) });
    }
    return;
  }
  safeSet(KEY_LAST_SELECTED, id);
}

/** Returns the persisted active navigation tab, or `'workbench'`. */
export function getActiveNav(): string {
  return safeGet(KEY_ACTIVE_NAV) ?? 'workbench';
}

export function setActiveNav(value: string): void {
  safeSet(KEY_ACTIVE_NAV, value);
}

export type Theme = 'light' | 'dark' | 'system';

/** Returns the persisted theme preference, or `'system'`. */
export function getTheme(): Theme {
  const raw = safeGet(KEY_THEME);
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
}

export function setTheme(theme: Theme): void {
  safeSet(KEY_THEME, theme);
}

/** Returns the persisted active project id, or `null`. */
export function getActiveProjectId(): string | null {
  return safeGet(KEY_ACTIVE_PROJECT);
}

export function setActiveProjectId(id: string | null): void {
  if (id === null) {
    try {
      localStorage?.removeItem(KEY_ACTIVE_PROJECT);
    } catch (cause) {
      logger.warn('settings-store.remove-failed', { key: KEY_ACTIVE_PROJECT, cause: String(cause) });
    }
    return;
  }
  safeSet(KEY_ACTIVE_PROJECT, id);
}

export type NodeSize = 'small' | 'medium' | 'large';
export type AutoBackupInterval = 'off' | '5min' | '15min' | '30min';
export type ConnectorLineStyle = 'straight' | 'curved';
export type GenerationFormat = 'F' | 'Gen' | 'Roman' | 'Custom';
export type Species = 'pig' | 'dog' | 'cattle' | 'horse' | 'sheep' | 'goat' | 'cat' | 'rabbit' | 'custom';

/** Returns the persisted node size, or `'medium'`. */
export function getNodeSize(): NodeSize {
  const raw = safeGet(KEY_NODE_SIZE);
  return raw === 'small' || raw === 'medium' || raw === 'large' ? raw : 'medium';
}

export function setNodeSize(value: NodeSize): void {
  safeSet(KEY_NODE_SIZE, value);
}

/** Returns the persisted showStatusBadges setting, or `true`. */
export function getShowStatusBadges(): boolean {
  const raw = safeGet(KEY_SHOW_STATUS_BADGES);
  return raw === null ? true : raw === 'true';
}

export function setShowStatusBadges(value: boolean): void {
  safeSet(KEY_SHOW_STATUS_BADGES, String(value));
}

/** Returns the persisted showGenerationLabels setting, or `true`. */
export function getShowGenerationLabels(): boolean {
  const raw = safeGet(KEY_SHOW_GENERATION_LABELS);
  return raw === null ? true : raw === 'true';
}

export function setShowGenerationLabels(value: boolean): void {
  safeSet(KEY_SHOW_GENERATION_LABELS, String(value));
}

/** Returns the persisted autoFitOnImport setting, or `true`. */
export function getAutoFitOnImport(): boolean {
  const raw = safeGet(KEY_AUTO_FIT_ON_IMPORT);
  return raw === null ? true : raw === 'true';
}

export function setAutoFitOnImport(value: boolean): void {
  safeSet(KEY_AUTO_FIT_ON_IMPORT, String(value));
}

/** Returns the persisted default gestation days, or `114`. */
export function getDefaultGestationDays(): number {
  const raw = safeGet(KEY_DEFAULT_GESTATION_DAYS);
  if (raw === null) return 114;
  const n = Number.parseInt(raw, 10);
  return Number.isNaN(n) || n <= 0 ? 114 : n;
}

export function setDefaultGestationDays(value: number): void {
  safeSet(KEY_DEFAULT_GESTATION_DAYS, String(value));
}

/** Returns the persisted auto-backup interval, or `'off'`. */
export function getAutoBackupInterval(): AutoBackupInterval {
  const raw = safeGet(KEY_AUTO_BACKUP_INTERVAL);
  return raw === '5min' || raw === '15min' || raw === '30min' ? raw : 'off';
}

export function setAutoBackupInterval(value: AutoBackupInterval): void {
  safeSet(KEY_AUTO_BACKUP_INTERVAL, value);
}

/** Returns the persisted showNotesOnHover setting, or `true`. */
export function getShowNotesOnHover(): boolean {
  const raw = safeGet(KEY_SHOW_NOTES_ON_HOVER);
  return raw === null ? true : raw === 'true';
}

export function setShowNotesOnHover(value: boolean): void {
  safeSet(KEY_SHOW_NOTES_ON_HOVER, String(value));
}

/** Returns the persisted connector line style, or `'straight'`. */
export function getConnectorLineStyle(): ConnectorLineStyle {
  const raw = safeGet(KEY_CONNECTOR_LINE_STYLE);
  return raw === 'curved' ? 'curved' : 'straight';
}

export function setConnectorLineStyle(value: ConnectorLineStyle): void {
  safeSet(KEY_CONNECTOR_LINE_STYLE, value);
}

const KEY_GENERATION_FORMAT = 'pdw.generationFormat';
const KEY_SPECIES = 'pdw.species';

const SPECIES_GESTATION: Record<Species, number> = {
  pig: 114,
  dog: 63,
  cattle: 283,
  horse: 340,
  sheep: 150,
  goat: 150,
  cat: 65,
  rabbit: 31,
  custom: 114,
};

/** Returns the persisted generation format, or `'F'`. */
export function getGenerationFormat(): GenerationFormat {
  const raw = safeGet(KEY_GENERATION_FORMAT);
  return raw === 'F' || raw === 'Gen' || raw === 'Roman' || raw === 'Custom' ? raw : 'F';
}

export function setGenerationFormat(value: GenerationFormat): void {
  safeSet(KEY_GENERATION_FORMAT, value);
}

/** Returns the persisted species, or `'pig'`. */
export function getSpecies(): Species {
  const raw = safeGet(KEY_SPECIES);
  const valid: Species[] = ['pig', 'dog', 'cattle', 'horse', 'sheep', 'goat', 'cat', 'rabbit', 'custom'];
  return valid.includes(raw as Species) ? (raw as Species) : 'pig';
}

export function setSpecies(value: Species): void {
  safeSet(KEY_SPECIES, value);
}

export function getSpeciesGestation(s: Species): number {
  return SPECIES_GESTATION[s];
}

const KEY_NODE_POSITIONS_PREFIX = 'pdw.nodePos.';

/** Returns the persisted manual node position overrides for a project, or `{}`. */
export function getNodePositions(projectId: string): Record<string, { x: number; y: number }> {
  const raw = safeGet(`${KEY_NODE_POSITIONS_PREFIX}${projectId}`);
  if (raw === null) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, { x: number; y: number }>;
    }
    return {};
  } catch {
    return {};
  }
}

/** Persists manual node position overrides for a project. */
export function setNodePositions(projectId: string, pos: Record<string, { x: number; y: number }>): void {
  if (Object.keys(pos).length === 0) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(`${KEY_NODE_POSITIONS_PREFIX}${projectId}`);
      }
    } catch (cause) {
      logger.warn('settings-store.remove-failed', { key: `${KEY_NODE_POSITIONS_PREFIX}${projectId}`, cause: String(cause) });
    }
    return;
  }
  safeSet(`${KEY_NODE_POSITIONS_PREFIX}${projectId}`, JSON.stringify(pos));
}
