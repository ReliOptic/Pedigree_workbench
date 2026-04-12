import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Language } from '../types/translation.types';

export type Theme = 'light' | 'dark' | 'system';
export type ConnectorLineStyle = 'straight' | 'curved' | 'orthogonal';

export interface SettingsStore {
  language: Language;
  theme: Theme;
  nodeSize: number;
  showStatusBadges: boolean;
  showGenerationLabels: boolean;
  autoFitOnImport: boolean;
  connectorLineStyle: ConnectorLineStyle;
  generationFormat: string;
  species: string;
  defaultGestationDays: number;
  autoBackupInterval: number;
  showNotesOnHover: boolean;

  // Actions
  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setNodeSize: (size: number) => void;
  setShowStatusBadges: (show: boolean) => void;
  setShowGenerationLabels: (show: boolean) => void;
  setAutoFitOnImport: (auto: boolean) => void;
  setConnectorLineStyle: (style: ConnectorLineStyle) => void;
  setGenerationFormat: (format: string) => void;
  setSpecies: (species: string) => void;
  setDefaultGestationDays: (days: number) => void;
  setAutoBackupInterval: (interval: number) => void;
  setShowNotesOnHover: (show: boolean) => void;
}

export const useSettingsStoreZ = create<SettingsStore>()(
  persist(
    (set) => ({
      language: 'en',
      theme: 'system',
      nodeSize: 1,
      showStatusBadges: true,
      showGenerationLabels: true,
      autoFitOnImport: true,
      connectorLineStyle: 'straight',
      generationFormat: 'F',
      species: 'pig',
      defaultGestationDays: 114,
      autoBackupInterval: 0,
      showNotesOnHover: true,

      // Actions
      setLanguage: (lang) => set({ language: lang }),
      setTheme: (theme) => set({ theme }),
      setNodeSize: (size) => set({ nodeSize: size }),
      setShowStatusBadges: (show) => set({ showStatusBadges: show }),
      setShowGenerationLabels: (show) => set({ showGenerationLabels: show }),
      setAutoFitOnImport: (auto) => set({ autoFitOnImport: auto }),
      setConnectorLineStyle: (style) => set({ connectorLineStyle: style }),
      setGenerationFormat: (format) => set({ generationFormat: format }),
      setSpecies: (species) => set({ species }),
      setDefaultGestationDays: (days) => set({ defaultGestationDays: days }),
      setAutoBackupInterval: (interval) => set({ autoBackupInterval: interval }),
      setShowNotesOnHover: (show) => set({ showNotesOnHover: show }),
    }),
    {
      name: 'pedigree-workbench-settings',
    }
  )
);
