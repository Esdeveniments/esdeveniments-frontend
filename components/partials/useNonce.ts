"use client";

import { useContext } from "react";
import { NonceContext } from "./NonceContext";

export function useNonce(): string {
  return useContext(NonceContext);
}

export default useNonce;

