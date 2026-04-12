import { create } from 'zustand';

interface NodePosition {
  x: number;
  y: number;
}

export interface CanvasStore {
  // View state
  zoom: number;
  panX: number;
  panY: number;

  // Node positions (user overrides from drag)
  nodePositions: Record<string, NodePosition>;

  // Selection
  selectedId: string | null;
  hoveredId: string | null;

  // Search
  searchQuery: string;
  searchVisible: boolean;

  // Drag state
  draggingId: string | null;

  // Actions
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setNodePositions: (positions: Record<string, NodePosition>) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  setSelectedId: (id: string | null) => void;
  setHoveredId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchVisible: (visible: boolean) => void;
  setDraggingId: (id: string | null) => void;
  resetView: () => void;
}

const DEFAULT_ZOOM = 1;
const DEFAULT_PAN_X = 0;
const DEFAULT_PAN_Y = 0;

export const useCanvasStore = create<CanvasStore>((set) => ({
  // View state
  zoom: DEFAULT_ZOOM,
  panX: DEFAULT_PAN_X,
  panY: DEFAULT_PAN_Y,

  // Node positions
  nodePositions: {},

  // Selection
  selectedId: null,
  hoveredId: null,

  // Search
  searchQuery: '',
  searchVisible: false,

  // Drag state
  draggingId: null,

  // Actions
  setZoom: (zoom) => set({ zoom }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  setNodePositions: (positions) => set({ nodePositions: positions }),
  updateNodePosition: (id, x, y) =>
    set((state) => ({
      nodePositions: { ...state.nodePositions, [id]: { x, y } },
    })),
  setSelectedId: (id) => set({ selectedId: id }),
  setHoveredId: (id) => set({ hoveredId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchVisible: (visible) => set({ searchVisible: visible }),
  setDraggingId: (id) => set({ draggingId: id }),
  resetView: () =>
    set({ zoom: DEFAULT_ZOOM, panX: DEFAULT_PAN_X, panY: DEFAULT_PAN_Y }),
}));

/** Reset store to initial state — for tests only */
export function __resetCanvasStore(): void {
  useCanvasStore.setState({
    zoom: DEFAULT_ZOOM,
    panX: DEFAULT_PAN_X,
    panY: DEFAULT_PAN_Y,
    nodePositions: {},
    selectedId: null,
    hoveredId: null,
    searchQuery: '',
    searchVisible: false,
    draggingId: null,
  });
}
