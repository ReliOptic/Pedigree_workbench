import { APP_CONFIG } from '../config';

/**
 * Structured logger.
 *
 * Browser environments lack a true syslog, so we emit single-line JSON via the
 * `console` API. Each entry includes a timestamp, level, and arbitrary
 * structured context, making the logs easy to grep and pipe into a DevTools
 * filter.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

interface LogContext {
  readonly [key: string]: unknown;
}

interface LogEntry {
  readonly ts: string;
  readonly level: LogLevel;
  readonly msg: string;
  readonly ctx?: LogContext;
}

function shouldEmit(level: LogLevel): boolean {
  return LEVEL_RANK[level] >= LEVEL_RANK[APP_CONFIG.logLevel];
}

function emit(level: LogLevel, msg: string, ctx?: LogContext): void {
  if (!shouldEmit(level)) return;
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    msg,
    ...(ctx !== undefined ? { ctx } : {}),
  };
  const serialized = JSON.stringify(entry);
  switch (level) {
    case 'debug':
    case 'info':
      // eslint-disable-next-line no-console
      console.log(serialized);
      return;
    case 'warn':
      // eslint-disable-next-line no-console
      console.warn(serialized);
      return;
    case 'error':
      // eslint-disable-next-line no-console
      console.error(serialized);
      return;
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext): void => emit('debug', msg, ctx),
  info: (msg: string, ctx?: LogContext): void => emit('info', msg, ctx),
  warn: (msg: string, ctx?: LogContext): void => emit('warn', msg, ctx),
  error: (msg: string, ctx?: LogContext): void => emit('error', msg, ctx),
} as const;
