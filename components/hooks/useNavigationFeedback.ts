"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { useNavigationProgressStore } from "./useNavigationProgress";

/**
 * Hook for imperative navigation with progress feedback.
 * Use this for components that call router.push directly (search, filters, etc.)
 */
export function useNavigationFeedback() {
  const router = useRouter();
  const { start } = useNavigationProgressStore();

  const navigateWithFeedback = (url: string) => {
    start();
    startTransition(() => {
      router.push(url);
      // Note: In Next.js App Router, router.push doesn't return a promise.
      // We rely on pathname changes to reset the progress state.
      // The done() will be called by NavigationProgress when pathname changes.
    });
  };

  return { navigateWithFeedback };
}

