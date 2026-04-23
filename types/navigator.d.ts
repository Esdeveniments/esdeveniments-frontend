import { NetworkInformation } from "./common";

// Navigator interface augmentation for network connection properties
// mozConnection and webkitConnection are deprecated but included for broader browser support.
declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
    // WebMCP / Model Context Protocol — the browser will expose this once the
    // API ships. Typed here so callers don't need inline casts.
    modelContext?: ModelContext;
  }

  interface ModelContext {
    registerTool(
      tool: {
        name: string;
        title?: string;
        description: string;
        inputSchema?: object;
        annotations?: { readOnlyHint?: boolean };
        execute: (
          input: Record<string, unknown>,
          client?: unknown,
        ) => Promise<unknown>;
      },
      options?: { signal?: AbortSignal },
    ): void;
  }
}
