"use client";

import { useMemo, type ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { createMockAdapter } from "./mock-adapter";
import { createApiAdapter } from "./api-adapter";

const isDev = process.env.NODE_ENV === "development";
const isE2E = process.env.NEXT_PUBLIC_E2E_TEST_MODE === "1";

export function DevAuthProvider({ children }: { children: ReactNode }) {
  const adapter = useMemo(
    () =>
      // E2E tests use the real API adapter so Playwright can intercept
      // HTTP requests to /api/auth/* and test the full proxy chain.
      isDev && !isE2E
        ? createMockAdapter({
          delay: 200,
          preloadUsers: [
            {
              email: "dev@test.com",
              password: "dev",
              displayName: "Razzmatazz",
              profileSlug: "razzmatazz",
            },
          ],
        })
        : createApiAdapter(),
    []
  );

  return <AuthProvider adapter={adapter}>{children}</AuthProvider>;
}
