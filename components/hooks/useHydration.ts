import { useEffect, useState } from "react";

/**
 * Hook to detect when React hydration is complete.
 * Prevents hydration mismatches by ensuring server and client render the same initially.
 * Uses immediate setState in useEffect to avoid requestAnimationFrame delay.
 */
export function useHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Set immediately instead of waiting for next frame to reduce delay
    setHydrated(true);
  }, []);

  return hydrated;
}
