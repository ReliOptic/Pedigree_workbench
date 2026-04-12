import type { PedigreePlugin, PluginAnalysisResult, PluginRenderRequest, PluginSlot } from './plugin-api';
import type { Individual } from '../types/pedigree.types';

class PluginRegistry {
  private plugins: Map<string, PedigreePlugin> = new Map();
  private listeners: Set<() => void> = new Set();

  /** Register a plugin */
  register(plugin: PedigreePlugin): void {
    if (this.plugins.has(plugin.id)) {
      console.warn(`Plugin "${plugin.id}" is already registered. Replacing.`);
      this.unregister(plugin.id);
    }

    this.plugins.set(plugin.id, plugin);

    // Register loci with genotype-resolver
    // NOTE: We import dynamically to avoid circular deps
    if (plugin.loci) {
      import('../services/genotype-resolver').then(({ registerLocusPattern }) => {
        for (const locus of plugin.loci!) {
          registerLocusPattern(locus.name, locus.fieldKeys);
        }
      });
    }

    plugin.onRegister?.();
    this.notifyListeners();
  }

  /** Unregister a plugin */
  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    // Unregister loci
    if (plugin.loci) {
      import('../services/genotype-resolver').then(({ unregisterLocusPattern }) => {
        for (const locus of plugin.loci!) {
          unregisterLocusPattern(locus.name);
        }
      });
    }

    plugin.onUnregister?.();
    this.plugins.delete(pluginId);
    this.notifyListeners();
  }

  /** Get a plugin by ID */
  get(pluginId: string): PedigreePlugin | undefined {
    return this.plugins.get(pluginId);
  }

  /** List all registered plugins */
  list(): PedigreePlugin[] {
    return Array.from(this.plugins.values());
  }

  /** Run analysis from all plugins for a given individual */
  analyze(individual: Individual, allIndividuals: readonly Individual[]): PluginAnalysisResult[] {
    const results: PluginAnalysisResult[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.analyze) {
        results.push(...plugin.analyze(individual, allIndividuals));
      }
    }
    return results;
  }

  /** Get all render requests for a specific slot */
  getRenderRequests(slot: PluginSlot): PluginRenderRequest[] {
    const requests: PluginRenderRequest[] = [];
    for (const plugin of this.plugins.values()) {
      if (plugin.renderRequests) {
        requests.push(
          ...plugin.renderRequests().filter(r => r.slot === slot)
        );
      }
    }
    return requests.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  /** Subscribe to registry changes */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

/** Singleton plugin registry */
export const pluginRegistry = new PluginRegistry();

/** React hook helper — use in components to react to plugin changes */
export function getPluginRegistry(): PluginRegistry {
  return pluginRegistry;
}
