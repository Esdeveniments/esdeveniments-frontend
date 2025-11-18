import type {
  NavigationFeedbackEvent,
  NavigationFeedbackListener,
  PlainMouseEvent,
} from "types/ui";

const listeners = new Set<NavigationFeedbackListener>();
let pendingCount = 0;

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
  pendingCount += 1;
  if (pendingCount === 1) {
    emit("start");
  }
}

export function completeNavigationFeedback(): void {
  if (pendingCount === 0) return;
  pendingCount -= 1;
  if (pendingCount === 0) {
    emit("complete");
  }
}

export function resetNavigationFeedback(): void {
  pendingCount = 0;
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
