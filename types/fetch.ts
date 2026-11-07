/**
 * Types for safe fetch utilities (utils/safe-fetch.ts)
 */

export interface SafeFetchOptions extends RequestInit {
  /** Timeout in milliseconds (default: 5000) */
  timeout?: number;
  /** Parse the body as JSON (default: true). False: any 2xx succeeds, body ignored. */
  expectJson?: boolean;
  /** Context for error logging */
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  };
}

export interface SafeFetchResult<T> {
  data: T | null;
  error: Error | null;
  status: number | null;
}
