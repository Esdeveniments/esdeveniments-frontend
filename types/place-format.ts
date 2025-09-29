// Types supporting place formatting helpers
import { GooglePlace } from "types/api/restaurant";

export interface OpenLineInfo {
  hoursText: string | null;
  openLabel: string | null;
  toneClass: string;
}

// Re-export GooglePlace for convenience (optional)
export type { GooglePlace };
