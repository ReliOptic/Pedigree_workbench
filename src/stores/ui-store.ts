import { create } from 'zustand';
import type { ActiveView } from '../types/breeding.types';
import type { Individual } from '../types/pedigree.types';

export interface ContextMenuState {
  x: number;
  y: number;
  targetId: string | null;
}

export interface UIStore {
  // Active view
  activeNav: ActiveView;

  // Modals
  showAddModal: boolean;
  showImportModal: boolean;
  showSettingsModal: boolean;
  showMateModal: boolean;
  showShortcutOverlay: boolean;

  // Modal prefill data (co-located to ensure atomic updates)
  addNodePrefill: Partial<Individual> | undefined;
  addParentTarget: string | null;
  mateModalPrefillSireId: string | undefined;
  mateModalPrefillDamId: string | undefined;

  // Context menu
  contextMenu: ContextMenuState | null;

  // Inspector
  inspectorOpen: boolean;

  // Actions
  setActiveNav: (nav: ActiveView) => void;
  openAddModal: (prefill?: Partial<Individual>, parentTarget?: string | null) => void;
  closeAddModal: () => void;
  openImportModal: () => void;
  closeImportModal: () => void;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  openMateModal: (sireId?: string, damId?: string) => void;
  closeMateModal: () => void;
  toggleShortcutOverlay: () => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  setInspectorOpen: (open: boolean) => void;
  closeAllModals: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  // Active view
  activeNav: 'workbench',

  // Modals
  showAddModal: false,
  showImportModal: false,
  showSettingsModal: false,
  showMateModal: false,
  showShortcutOverlay: false,

  // Modal prefill data
  addNodePrefill: undefined,
  addParentTarget: null,
  mateModalPrefillSireId: undefined,
  mateModalPrefillDamId: undefined,

  // Context menu
  contextMenu: null,

  // Inspector
  inspectorOpen: false,

  // Actions
  setActiveNav: (nav) => set({ activeNav: nav }),
  openAddModal: (prefill, parentTarget) =>
    set({ showAddModal: true, addNodePrefill: prefill, addParentTarget: parentTarget ?? null }),
  closeAddModal: () =>
    set({ showAddModal: false, addNodePrefill: undefined, addParentTarget: null }),
  openImportModal: () => set({ showImportModal: true }),
  closeImportModal: () => set({ showImportModal: false }),
  openSettingsModal: () => set({ showSettingsModal: true }),
  closeSettingsModal: () => set({ showSettingsModal: false }),
  openMateModal: (sireId, damId) =>
    set({ showMateModal: true, mateModalPrefillSireId: sireId, mateModalPrefillDamId: damId }),
  closeMateModal: () =>
    set({ showMateModal: false, mateModalPrefillSireId: undefined, mateModalPrefillDamId: undefined }),
  toggleShortcutOverlay: () =>
    set((state) => ({ showShortcutOverlay: !state.showShortcutOverlay })),
  setContextMenu: (menu) => set({ contextMenu: menu }),
  setInspectorOpen: (open) => set({ inspectorOpen: open }),
  closeAllModals: () =>
    set({
      showAddModal: false,
      showImportModal: false,
      showSettingsModal: false,
      showMateModal: false,
      showShortcutOverlay: false,
      contextMenu: null,
      addNodePrefill: undefined,
      addParentTarget: null,
      mateModalPrefillSireId: undefined,
      mateModalPrefillDamId: undefined,
    }),
}));

/** Reset store to initial state — for tests only */
export function __resetUIStore(): void {
  useUIStore.setState({
    activeNav: 'workbench',
    showAddModal: false,
    showImportModal: false,
    showSettingsModal: false,
    showMateModal: false,
    showShortcutOverlay: false,
    addNodePrefill: undefined,
    addParentTarget: null,
    mateModalPrefillSireId: undefined,
    mateModalPrefillDamId: undefined,
    contextMenu: null,
    inspectorOpen: false,
  });
}
