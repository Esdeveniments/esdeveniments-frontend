"use client";

import { useMemo, type ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { createMockAdapter } from "./mock-adapter";
import { createApiAdapter } from "./api-adapter";

const isDev = process.env.NODE_ENV === "development";

export function DevAuthProvider({ children }: { children: ReactNode }) {
  const adapter = useMemo(
    () =>
      isDev
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
