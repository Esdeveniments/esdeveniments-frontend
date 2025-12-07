import React from "react";
import type { RetryOptions } from "types/utils";

const defaultOptions: Required<Omit<RetryOptions, "onError">> = {
  retries: 3,
  retryDelayMs: 200,
  backoffMultiplier: 2,
};

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export async function retryDynamicImport<T>(
  importer: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const merged = { ...defaultOptions, ...options };
  const maxAttempts = Math.max(1, merged.retries);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await importer();
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts;

      if (isLastAttempt) {
        throw error;
      }

      const backoffMs =
        merged.retryDelayMs * Math.pow(merged.backoffMultiplier, attempt - 1);
      if (merged.onError) {
        merged.onError(attempt, error);
      }
      await wait(backoffMs);
    }
  }

  throw new Error("retryDynamicImport exhausted unexpectedly");
}

export function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  options?: RetryOptions
): React.LazyExoticComponent<T> {
  return React.lazy(() => retryDynamicImport(importer, options));
}

