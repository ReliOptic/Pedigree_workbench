/**
 * Build-time configuration.
 *
 * Reads only `import.meta.env` values that Vite freezes at build time. The
 * desktop bundle is fully offline, so no runtime secrets are loaded.
 */

interface AppConfig {
  readonly appName: string;
  readonly version: string;
  readonly isProduction: boolean;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly maxImportBytes: number;
}

const env = import.meta.env;

export const APP_CONFIG: AppConfig = {
  appName: 'Pedigree Workbench',
  version: typeof env.VITE_APP_VERSION === 'string' ? env.VITE_APP_VERSION : '1.0.0',
  isProduction: env.MODE === 'production',
  logLevel: env.MODE === 'production' ? 'warn' : 'debug',
  /** 5 MB hard cap on imported JSON to prevent UI freezes from pathological inputs. */
  maxImportBytes: 5 * 1024 * 1024,
} as const;
