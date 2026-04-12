import { pluginRegistry } from './plugin-registry';

export { pluginRegistry, getPluginRegistry } from './plugin-registry';
export type { PedigreePlugin, PluginAnalysisResult, PluginRenderRequest, PluginSlot, LocusRegistration } from './plugin-api';

// Built-in plugins
import { cd163Plugin } from './built-in/cd163-plugin';
import { esmfoldPlugin } from './built-in/esmfold-plugin';

/** Initialize all built-in plugins */
export function initBuiltInPlugins(): void {
  pluginRegistry.register(cd163Plugin);
  pluginRegistry.register(esmfoldPlugin);
}

/** List of built-in plugin instances for direct access */
export const builtInPlugins = {
  cd163: cd163Plugin,
  esmfold: esmfoldPlugin,
} as const;
