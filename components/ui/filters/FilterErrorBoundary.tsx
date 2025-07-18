/**
 * Modern Error boundary for filter system components following React 18+ patterns
 * Provides graceful degradation when filter operations fail
 */
"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type FilterErrorBoundaryProps = {
  children: ReactNode;
  fallbackMessage?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
};

type FilterErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
};

export default class FilterErrorBoundary extends Component<
  FilterErrorBoundaryProps,
  FilterErrorBoundaryState
> {
  constructor(props: FilterErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): FilterErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error("Filter system error:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorBoundary: "FilterErrorBoundary",
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Optional: Send to monitoring service
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "production"
    ) {
      // Example: Sentry, LogRocket, or custom analytics
      // window.analytics?.track('filter_error', {
      //   error: error.message,
      //   stack: error.stack,
      //   componentStack: errorInfo.componentStack
      // });
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full p-3 text-center bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex flex-col items-center gap-2">
            <span className="text-sm text-amber-800">
              {this.props.fallbackMessage || "Filters temporarily unavailable"}
            </span>
            <button
              onClick={this.handleRetry}
              className="px-3 py-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 rounded transition-colors"
              type="button"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
