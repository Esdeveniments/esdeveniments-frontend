"use client";

import dynamic from "next/dynamic";
import type { ClientInteractiveLayerProps } from "types/props";

// Lazy load ClientInteractiveLayer to reduce initial bundle size
// This is a client component wrapper that allows ssr: false in Next.js 16
const ClientInteractiveLayer = dynamic(
  () => import("@components/ui/clientInteractiveLayer"),
  {
    ssr: false, // Client-only component with hooks and browser APIs
    loading: () => null, // Filters can load after initial render
  }
);

export default function LazyClientInteractiveLayer(props: ClientInteractiveLayerProps) {
  return <ClientInteractiveLayer {...props} />;
}


