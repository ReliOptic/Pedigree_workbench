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
