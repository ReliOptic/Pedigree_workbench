import { useCallback, useState } from 'react';

import {
  getActiveNav,
  getLanguage,
  getLastSelectedId,
  getTheme,
  setActiveNav as persistActiveNav,
  setLanguage as persistLanguage,
  setLastSelectedId as persistLastSelectedId,
  setTheme as persistTheme,
} from '../services/settings-store';
import type { Theme } from '../services/settings-store';
import type { Language } from '../types/translation.types';

interface UseSettingsResult {
  readonly language: Language;
  readonly setLanguage: (next: Language) => void;
  readonly activeNav: string;
  readonly setActiveNav: (next: string) => void;
  readonly selectedId: string | null;
  readonly setSelectedId: (next: string | null) => void;
  readonly theme: Theme;
  readonly setTheme: (next: Theme) => void;
}

/**
 * UI preferences hook backed by `settings-store`. State is hydrated lazily
 * via `useState` initializers so first paint already reflects persisted
 * values without an extra render.
 */
export function useSettings(): UseSettingsResult {
  const [language, setLanguageState] = useState<Language>(() => getLanguage());
  const [activeNav, setActiveNavState] = useState<string>(() => getActiveNav());
  const [selectedId, setSelectedIdState] = useState<string | null>(() => getLastSelectedId());
  const [theme, setThemeState] = useState<Theme>(() => getTheme());

  const setLanguage = useCallback((next: Language): void => {
    setLanguageState(next);
    persistLanguage(next);
  }, []);

  const setActiveNav = useCallback((next: string): void => {
    setActiveNavState(next);
    persistActiveNav(next);
  }, []);

  const setSelectedId = useCallback((next: string | null): void => {
    setSelectedIdState(next);
    persistLastSelectedId(next);
  }, []);

  const setTheme = useCallback((next: Theme): void => {
    setThemeState(next);
    persistTheme(next);
  }, []);

  return { language, setLanguage, activeNav, setActiveNav, selectedId, setSelectedId, theme, setTheme };
}
