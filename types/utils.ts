export interface RetryOptions {
  retries?: number;
  retryDelayMs?: number;
  backoffMultiplier?: number;
  onError?: (attempt: number, error: unknown) => void;
}

export type HeadersFn = () => Headers | Promise<Headers>;
