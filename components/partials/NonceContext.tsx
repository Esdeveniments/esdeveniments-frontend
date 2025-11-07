"use client";

import { createContext } from "react";
import type { ReactNode } from "react";

export const NonceContext = createContext<string>("");

export function NonceProvider({
  nonce,
  children,
}: {
  nonce: string;
  children: ReactNode;
}) {
  return <NonceContext.Provider value={nonce}>{children}</NonceContext.Provider>;
}
