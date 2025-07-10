import { useState, useCallback, useRef, useEffect } from "react";

/**
 * Hook for handling image loading retry logic
 * Provides state management and handlers for image loading with retry functionality
 */
export function useImageRetry(maxRetries: number = 2) {
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle image load error with exponential backoff retry
   * Delays: 1s, 2s, 4s, 8s, etc. (2^retryCount * 1000ms)
   */
  const handleError = useCallback(() => {
    if (retryCount < maxRetries) {
      // Clear any existing timeout to prevent race conditions
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Use exponential backoff and delay the actual retry attempt
      const delay = 1000 * 2 ** retryCount;
      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount((prev) => prev + 1);
        setIsLoading(true);
      }, delay);
    } else {
      setHasError(true);
      setIsLoading(false);
    }
  }, [retryCount, maxRetries]);

  /**
   * Handle successful image load
   */
  const handleLoad = useCallback(() => {
    // Clear any pending retry timeout on successful load
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setIsLoading(false);
    setHasError(false);
  }, []);

  /**
   * Reset retry state (useful for new image sources)
   */
  const reset = useCallback(() => {
    // Clear any pending timeout when resetting
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    setRetryCount(0);
    setHasError(false);
    setIsLoading(true);
  }, []);

  /**
   * Generate unique key for image retry (forces re-render)
   */
  const getImageKey = useCallback(
    (baseSrc: string) => {
      return `${baseSrc}-${retryCount}`;
    },
    [retryCount]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    retryCount,
    hasError,
    isLoading,
    handleError,
    handleLoad,
    reset,
    getImageKey,
  };
}
