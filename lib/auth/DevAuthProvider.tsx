"use client";

import { useMemo, type ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { createMockAdapter } from "./mock-adapter";
import { noopAdapter } from "./adapter";

const isDev =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_MOCK_AUTH === "true";

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
                role: "organizer",
                profileSlug: "razzmatazz",
              },
              {
                email: "user@test.com",
                password: "user",
                displayName: "Maria",
                role: "user",
              },
            ],
          })
        : noopAdapter,
    []
  );

  return <AuthProvider adapter={adapter}>{children}</AuthProvider>;
}
