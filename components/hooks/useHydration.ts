import { useEffect, useState } from "react";

/**
 * Hook to detect when React hydration is complete.
 * Prevents hydration mismatches by ensuring server and client render the same initially.
 */
export function useHydration() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setHydrated(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return hydrated;
}
