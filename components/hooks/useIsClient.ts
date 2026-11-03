import { useSyncExternalStore } from "react";

const subscribeNoop = () => () => {};

/**
 * False on the server and during hydration, true after. Lets a component
 * render client-only output without a hydration mismatch, and without the
 * extra render of a mount flag set in an effect.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
}
