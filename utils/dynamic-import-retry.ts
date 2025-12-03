import React from "react";

/**
 * Retry mechanism for dynamic imports to handle chunk loading failures
 * Common in production when new deployments happen or when there are network issues
 * 
 * @param importFn - The dynamic import function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param delay - Delay in milliseconds between retries (default: 1000ms)
 * @returns Promise that resolves to the imported module
 */
export async function retryDynamicImport<T>(
  importFn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await importFn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (attempt < maxRetries) {
        // Log the retry attempt (will be captured by Sentry if needed)
        console.warn(
          `Failed to load chunk (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay * (attempt + 1)}ms...`,
          error
        );
        
        // Wait before retrying with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, delay * (attempt + 1)));
      }
    }
  }

  // If all retries failed, throw the last error
  throw lastError || new Error("Failed to load chunk after retries");
}

/**
 * Wrapper for React.lazy that adds retry logic
 * 
 * @param importFn - The dynamic import function
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param delay - Delay in milliseconds between retries (default: 1000ms)
 * @returns A lazy-loaded component with retry logic
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  maxRetries = 3,
  delay = 1000
) {
  return React.lazy(() => retryDynamicImport(importFn, maxRetries, delay));
}