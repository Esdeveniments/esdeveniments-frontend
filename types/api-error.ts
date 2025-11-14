export interface ApiErrorOptions {
  status?: number;
  errorMessage?: string;
  fallbackData?: unknown;
  sentryContext?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  };
}
