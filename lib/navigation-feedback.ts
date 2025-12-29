import type {
  NavigationFeedbackEvent,
  NavigationFeedbackListener,
  PlainMouseEvent,
} from "types/ui";

const listeners = new Set<NavigationFeedbackListener>();
let isPending = false;
let failsafeTimeoutId: ReturnType<typeof setTimeout> | null = null;

const FAILSAFE_TIMEOUT_MS = 20_000;

export function subscribeNavigationFeedback(
  listener: NavigationFeedbackListener
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const emit = (event: NavigationFeedbackEvent) => {
  listeners.forEach((listener) => listener(event));
};

export function startNavigationFeedback(): void {
  if (failsafeTimeoutId) {
    clearTimeout(failsafeTimeoutId);
    failsafeTimeoutId = null;
  }

  failsafeTimeoutId = setTimeout(() => {
    resetNavigationFeedback();
  }, FAILSAFE_TIMEOUT_MS);

  if (isPending) return;
  isPending = true;
  emit("start");
}

export function completeNavigationFeedback(): void {
  if (!isPending) return;

  if (failsafeTimeoutId) {
    clearTimeout(failsafeTimeoutId);
    failsafeTimeoutId = null;
  }

  isPending = false;
  emit("complete");
}

export function resetNavigationFeedback(): void {
  if (failsafeTimeoutId) {
    clearTimeout(failsafeTimeoutId);
    failsafeTimeoutId = null;
  }

  isPending = false;
  emit("complete");
}

export function isPlainLeftClick(event: PlainMouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}
