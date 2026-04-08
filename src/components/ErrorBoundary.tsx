"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Catches client-side render errors so a single broken component doesn't
 * blank the whole page. Logs to console + a future Sentry hook.
 *
 * Wrap major modules in <ErrorBoundary> from the layout level. The fallback
 * shows a "Something went wrong" card with a Retry button that resets the
 * boundary state.
 */
interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  label?: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    // Future: ship to Sentry / Vercel observability
    console.error("[ErrorBoundary]", this.props.label || "", error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
              Something went wrong
            </h2>
            <p className="text-[12px] text-[var(--foreground-dim)] mt-1 mb-4">
              {this.props.label
                ? `The "${this.props.label}" view crashed.`
                : "This section couldn't render."}{" "}
              The rest of the app is still working.
            </p>
            <button
              onClick={this.reset}
              className="btn-primary text-[12px] gap-1.5 mx-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try again
            </button>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-[10px] text-[var(--foreground-dim)] cursor-pointer">
                  Error details
                </summary>
                <pre className="mt-2 text-[10px] text-[var(--foreground-dim)] bg-[var(--background)] p-3 rounded-lg overflow-x-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
