import { useState, useCallback, useRef, useEffect } from "react";
import type { UseImageRetryReturn } from "types/props";

// Delay before showing loading skeleton (ms)
// Prevents skeleton flash for cached/fast images
const LOADING_DELAY_MS = 150;

/**
 * Hook for handling image loading retry logic
 * Provides state management and handlers for image loading with retry functionality
 * @param maxRetries - Maximum retry attempts (default: 2)
 */
export function useImageRetry(maxRetries: number = 2): UseImageRetryReturn {
  const [retryCount, setRetryCount] = useState(0);
  const [hasError, setHasError] = useState(false);
  // Track if image has successfully loaded (for opacity control)
  // Uses retryCount in key to auto-reset when retry happens
  const [imageLoaded, setImageLoaded] = useState(false);
  // Track which retryCount the imageLoaded state corresponds to
  const [loadedForRetry, setLoadedForRetry] = useState(-1);
  // Skeleton shows after delay if image hasn't loaded yet
  const [showSkeleton, setShowSkeleton] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const loadingDelayRef = useRef<NodeJS.Timeout | null>(null);
  const imageLoadedRef = useRef(false);

  // Derive actual loaded state - only true if loaded for current retry
  const isImageLoaded = imageLoaded && loadedForRetry === retryCount;

  // Start a delayed skeleton timer when component mounts or retryCount changes
  useEffect(() => {
    imageLoadedRef.current = false;
    // Note: imageLoaded state is derived via loadedForRetry comparison
    loadingDelayRef.current = setTimeout(() => {
      // Only show skeleton if image hasn't loaded yet
      if (!imageLoadedRef.current) {
        setShowSkeleton(true);
      }
    }, LOADING_DELAY_MS);

    return () => {
      if (loadingDelayRef.current) {
        clearTimeout(loadingDelayRef.current);
      }
    };
  }, [retryCount]); // Re-run on retry

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
      }, delay);
    } else {
      setHasError(true);
    }
  }, [retryCount, maxRetries]);

  /**
   * Handle successful image load
   */
  const handleLoad = useCallback(() => {
    // Mark as loaded to prevent delayed skeleton from showing
    imageLoadedRef.current = true;
    // Clear any pending timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (loadingDelayRef.current) {
      clearTimeout(loadingDelayRef.current);
      loadingDelayRef.current = null;
    }
    setImageLoaded(true);
    setLoadedForRetry(retryCount);
    setShowSkeleton(false);
    setHasError(false);
  }, [retryCount]);

  /**
   * Reset retry state (useful for new image sources)
   */
  const reset = useCallback(() => {
    // Clear any pending timeouts when resetting
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (loadingDelayRef.current) {
      clearTimeout(loadingDelayRef.current);
      loadingDelayRef.current = null;
    }
    imageLoadedRef.current = false;
    setRetryCount(0);
    setHasError(false);
    setImageLoaded(false);
    setLoadedForRetry(-1);
    setShowSkeleton(false);
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

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (loadingDelayRef.current) {
        clearTimeout(loadingDelayRef.current);
      }
    };
  }, []);

  return {
    retryCount,
    hasError,
    imageLoaded: isImageLoaded,
    showSkeleton,
    handleError,
    handleLoad,
    reset,
    getImageKey,
  };
}
