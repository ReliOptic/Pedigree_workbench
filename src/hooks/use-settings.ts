import { useCallback, useState } from 'react';

import {
  getActiveNav,
  getAutoBackupInterval,
  getAutoFitOnImport,
  getConnectorLineStyle,
  getDefaultGestationDays,
  getGenerationFormat,
  getLanguage,
  getLastSelectedId,
  getNodeSize,
  getShowGenerationLabels,
  getShowNotesOnHover,
  getShowStatusBadges,
  getSpecies,
  getTheme,
  setActiveNav as persistActiveNav,
  setAutoBackupInterval as persistAutoBackupInterval,
  setAutoFitOnImport as persistAutoFitOnImport,
  setConnectorLineStyle as persistConnectorLineStyle,
  setDefaultGestationDays as persistDefaultGestationDays,
  setGenerationFormat as persistGenerationFormat,
  setLanguage as persistLanguage,
  setLastSelectedId as persistLastSelectedId,
  setNodeSize as persistNodeSize,
  setShowGenerationLabels as persistShowGenerationLabels,
  setShowNotesOnHover as persistShowNotesOnHover,
  setShowStatusBadges as persistShowStatusBadges,
  setSpecies as persistSpecies,
  setTheme as persistTheme,
} from '../services/settings-store';
import type { AutoBackupInterval, ConnectorLineStyle, GenerationFormat, NodeSize, Species, Theme } from '../services/settings-store';
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
  readonly nodeSize: NodeSize;
  readonly setNodeSize: (next: NodeSize) => void;
  readonly showStatusBadges: boolean;
  readonly setShowStatusBadges: (next: boolean) => void;
  readonly showGenerationLabels: boolean;
  readonly setShowGenerationLabels: (next: boolean) => void;
  readonly autoFitOnImport: boolean;
  readonly setAutoFitOnImport: (next: boolean) => void;
  readonly defaultGestationDays: number;
  readonly setDefaultGestationDays: (next: number) => void;
  readonly autoBackupInterval: AutoBackupInterval;
  readonly setAutoBackupInterval: (next: AutoBackupInterval) => void;
  readonly showNotesOnHover: boolean;
  readonly setShowNotesOnHover: (next: boolean) => void;
  readonly connectorLineStyle: ConnectorLineStyle;
  readonly setConnectorLineStyle: (next: ConnectorLineStyle) => void;
  readonly generationFormat: GenerationFormat;
  readonly setGenerationFormat: (next: GenerationFormat) => void;
  readonly species: Species;
  readonly setSpecies: (next: Species) => void;
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
  const [nodeSize, setNodeSizeState] = useState<NodeSize>(() => getNodeSize());
  const [showStatusBadges, setShowStatusBadgesState] = useState<boolean>(() => getShowStatusBadges());
  const [showGenerationLabels, setShowGenerationLabelsState] = useState<boolean>(() => getShowGenerationLabels());
  const [autoFitOnImport, setAutoFitOnImportState] = useState<boolean>(() => getAutoFitOnImport());
  const [defaultGestationDays, setDefaultGestationDaysState] = useState<number>(() => getDefaultGestationDays());
  const [autoBackupInterval, setAutoBackupIntervalState] = useState<AutoBackupInterval>(() => getAutoBackupInterval());
  const [showNotesOnHover, setShowNotesOnHoverState] = useState<boolean>(() => getShowNotesOnHover());
  const [connectorLineStyle, setConnectorLineStyleState] = useState<ConnectorLineStyle>(() => getConnectorLineStyle());
  const [generationFormat, setGenerationFormatState] = useState<GenerationFormat>(() => getGenerationFormat());
  const [species, setSpeciesState] = useState<Species>(() => getSpecies());

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

  const setNodeSize = useCallback((next: NodeSize): void => {
    setNodeSizeState(next);
    persistNodeSize(next);
  }, []);

  const setShowStatusBadges = useCallback((next: boolean): void => {
    setShowStatusBadgesState(next);
    persistShowStatusBadges(next);
  }, []);

  const setShowGenerationLabels = useCallback((next: boolean): void => {
    setShowGenerationLabelsState(next);
    persistShowGenerationLabels(next);
  }, []);

  const setAutoFitOnImport = useCallback((next: boolean): void => {
    setAutoFitOnImportState(next);
    persistAutoFitOnImport(next);
  }, []);

  const setDefaultGestationDays = useCallback((next: number): void => {
    setDefaultGestationDaysState(next);
    persistDefaultGestationDays(next);
  }, []);

  const setAutoBackupInterval = useCallback((next: AutoBackupInterval): void => {
    setAutoBackupIntervalState(next);
    persistAutoBackupInterval(next);
  }, []);

  const setShowNotesOnHover = useCallback((next: boolean): void => {
    setShowNotesOnHoverState(next);
    persistShowNotesOnHover(next);
  }, []);

  const setConnectorLineStyle = useCallback((next: ConnectorLineStyle): void => {
    setConnectorLineStyleState(next);
    persistConnectorLineStyle(next);
  }, []);

  const setGenerationFormat = useCallback((next: GenerationFormat): void => {
    setGenerationFormatState(next);
    persistGenerationFormat(next);
  }, []);

  const setSpecies = useCallback((next: Species): void => {
    setSpeciesState(next);
    persistSpecies(next);
  }, []);

  return {
    language, setLanguage,
    activeNav, setActiveNav,
    selectedId, setSelectedId,
    theme, setTheme,
    nodeSize, setNodeSize,
    showStatusBadges, setShowStatusBadges,
    showGenerationLabels, setShowGenerationLabels,
    autoFitOnImport, setAutoFitOnImport,
    defaultGestationDays, setDefaultGestationDays,
    autoBackupInterval, setAutoBackupInterval,
    showNotesOnHover, setShowNotesOnHover,
    connectorLineStyle, setConnectorLineStyle,
    generationFormat, setGenerationFormat,
    species, setSpecies,
  };
}
