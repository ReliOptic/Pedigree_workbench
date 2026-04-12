import React from 'react';

import { logger } from '../services/logger';

interface ErrorBoundaryProps {
  readonly children: React.ReactNode;
  readonly fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly message: string | null;
}

/**
 * Top-level React error boundary.
 *
 * Catches render-time exceptions, logs them through the structured logger,
 * and renders a non-blocking fallback so the desktop window never goes
 * white. Network/runtime errors outside React are captured separately by
 * the global handlers in `main.tsx`.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = { hasError: false, message: null };

  public static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : 'Unknown rendering error',
    };
  }

  public override componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    logger.error('react.error-boundary', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      componentStack: info.componentStack,
    });
  }

  public override render(): React.ReactNode {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback !== undefined) return this.props.fallback;
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 p-8 text-slate-700">
        <div className="max-w-md space-y-3 rounded border border-border bg-white p-6 shadow-lg">
          <h1 className="text-base font-bold text-brand">Pedigree Workbench encountered an error.</h1>
          <p className="font-mono text-xs text-slate-500">{this.state.message}</p>
          <p className="text-xs text-slate-400">
            Reload the application to recover. If the problem persists, export your dataset and
            file a bug report.
          </p>
        </div>
      </div>
    );
  }
}
