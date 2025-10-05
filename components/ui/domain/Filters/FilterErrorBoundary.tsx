/**
 * Modern Error boundary for filter system components following React 18+ patterns
 * Provides graceful degradation when filter operations fail
 */
"use client";

import { Component, type ErrorInfo } from "react";
import { Text } from "@components/ui/primitives/Text";
import type {
  FilterErrorBoundaryProps,
  FilterErrorBoundaryState,
} from "types/filters";

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
        <div className="bg-amber-50 border-amber-200 w-full rounded-lg border p-component-sm text-center">
          <div className="flex flex-col items-center gap-component-xs">
            <Text variant="body-sm" className="text-amber-800">
              {this.props.fallbackMessage || "Filters temporarily unavailable"}
            </Text>
            <button
              onClick={this.handleRetry}
              className="bg-amber-100 hover:bg-amber-200 text-amber-800 rounded px-component-sm py-component-xs transition-colors"
              type="button"
            >
              <Text size="xs">Retry</Text>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
