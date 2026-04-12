import type { Individual } from '../types/pedigree.types';

/** Where a plugin can render UI */
export type PluginSlot =
  | 'inspector-panel'      // Additional panel in NodeInspector
  | 'dashboard-widget'     // Widget in Dashboard
  | 'canvas-overlay'       // Overlay on canvas
  | 'toolbar-button'       // Button in TopBar
  | 'context-menu-item';   // Item in context menu

/** Plugin-provided analysis result */
export interface PluginAnalysisResult {
  pluginId: string;
  locus?: string;
  label: string;
  value: string | number;
  severity?: 'info' | 'warning' | 'error';
  details?: Record<string, unknown>;
}

/** Plugin render request — describes what UI a plugin wants to show */
export interface PluginRenderRequest {
  slot: PluginSlot;
  component: string;       // Component identifier within the plugin
  props?: Record<string, unknown>;
  priority?: number;        // Higher = rendered first (default 0)
}

/** Locus registration — tells the system about a new genetic locus */
export interface LocusRegistration {
  name: string;             // e.g., 'CD163', 'ANPEP', 'coat_color'
  fieldKeys: string[];      // CSV/JSON field names to look for
  description?: string;
  parser?: (raw: string) => Record<string, unknown>;  // Optional: parse raw value
}

/** The main plugin interface — all plugins must implement this */
export interface PedigreePlugin {
  /** Unique plugin identifier */
  id: string;

  /** Human-readable name */
  name: string;

  /** Plugin version (semver) */
  version: string;

  /** Short description */
  description?: string;

  /** Loci this plugin knows about */
  loci?: LocusRegistration[];

  /** Called when plugin is registered */
  onRegister?: () => void;

  /** Called when plugin is unregistered */
  onUnregister?: () => void;

  /** Analyze an individual — returns plugin-specific insights */
  analyze?: (individual: Individual, allIndividuals: readonly Individual[]) => PluginAnalysisResult[];

  /** UI render requests — what slots this plugin wants to occupy */
  renderRequests?: () => PluginRenderRequest[];
}
