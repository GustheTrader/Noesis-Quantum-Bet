import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, ShieldAlert, ChevronDown, ChevronUp, Terminal } from 'lucide-react';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  compact?: boolean;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  customFallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    showDetails: false,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[QuantumBets ErrorBoundary Caught Anomaly]:', error, errorInfo);
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (e) {
        console.error('Error in ErrorBoundary onError callback:', e);
      }
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, showDetails: false });
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (e) {
        console.error('Error in ErrorBoundary onReset callback:', e);
      }
    }
  };

  toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    const { hasError, error, showDetails } = this.state;
    const {
      children,
      fallbackTitle = 'Component Render Anomaly',
      fallbackMessage,
      compact = false,
      customFallback,
    } = this.props;

    if (!hasError) {
      return children;
    }

    if (customFallback) {
      if (typeof customFallback === 'function') {
        return customFallback(error || new Error('Unknown anomaly'), this.handleReset);
      }
      return customFallback;
    }

    const errorMessage = error?.message || 'An unexpected runtime state dislocation occurred.';

    // Compact mode for individual widgets, charts, navbars, or side panels
    if (compact) {
      return (
        <div className="relative overflow-hidden rounded-xl border border-red-500/30 bg-slate-900/80 backdrop-blur-md p-4 text-slate-200 shadow-lg shadow-black/40">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/40 bg-red-500/10 text-red-400">
              <AlertTriangle className="h-4 w-4 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-red-400">
                  {fallbackTitle}
                </h4>
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] font-medium text-cyan-300 transition-all hover:bg-cyan-500/20 hover:border-cyan-400"
                >
                  <RotateCcw className="h-3 w-3" />
                  Retry
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-400 line-clamp-2">
                {fallbackMessage || errorMessage}
              </p>

              {error && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={this.toggleDetails}
                    className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <Terminal className="h-2.5 w-2.5" />
                    {showDetails ? 'Hide Diagnostics' : 'Inspect Stack'}
                    {showDetails ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                  </button>
                  {showDetails && (
                    <pre className="mt-2 max-h-32 overflow-auto rounded bg-black/60 p-2 font-mono text-[10px] text-red-300/80 border border-red-950">
                      {error.stack || error.message}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Full section / page mode
    return (
      <div className="mx-auto my-8 max-w-2xl px-4">
        <div className="relative overflow-hidden rounded-2xl border border-red-500/40 bg-gradient-to-b from-slate-900/95 via-slate-950/90 to-black/95 p-6 md:p-8 backdrop-blur-xl shadow-2xl shadow-red-950/30">
          {/* Cyber ambient glow */}
          <div className="pointer-events-none absolute -top-20 -right-20 h-48 w-48 rounded-full bg-red-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="relative flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/50 bg-red-500/10 text-red-400 shadow-inner">
              <ShieldAlert className="h-7 w-7 animate-pulse" />
            </div>

            <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-widest text-red-400">
              Isolated Execution Fault
            </span>

            <h3 className="mt-3 text-lg md:text-xl font-bold uppercase tracking-wider text-white">
              {fallbackTitle}
            </h3>

            <p className="mt-2 max-w-md text-sm text-slate-300">
              {fallbackMessage ||
                'This module encountered a rendering exception. The rest of QuantumBets continues to operate normally.'}
            </p>

            <div className="mt-4 w-full rounded-xl border border-slate-800 bg-black/50 p-3 text-left font-mono text-xs text-red-300/90">
              <div className="flex items-center gap-2 text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">
                <Terminal className="h-3 w-3" /> Error Details
              </div>
              <div className="break-words select-all">{errorMessage}</div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/50 bg-cyan-500/20 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-cyan-300 shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-500/30 hover:border-cyan-400 active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Re-initialize Module
              </button>
              
              <button
                type="button"
                onClick={this.toggleDetails}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-all hover:bg-slate-700/60 hover:text-white"
              >
                {showDetails ? 'Hide Stack' : 'Diagnostics'}
                {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>

            {showDetails && error?.stack && (
              <div className="mt-4 w-full max-h-48 overflow-auto rounded-lg border border-slate-800/80 bg-black/80 p-3 text-left font-mono text-[10px] text-slate-400">
                <pre>{error.stack}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
