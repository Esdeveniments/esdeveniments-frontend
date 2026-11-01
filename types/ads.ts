export interface TcfData {
  eventStatus?: "tcloaded" | "useractioncomplete" | "cmpuishown" | string;
  listenerId?: number;
  purpose?: { consents?: Record<string, boolean> };
  vendor?: { consents?: Record<string, boolean> };
}

export type TcfCallback = (
  tcData: TcfData | null,
  success: boolean
) => void;

export interface AdContextType {
  adsAllowed: boolean;
  observeVisibility: (element: Element, callback: () => void) => void;
  unobserveVisibility: (element: Element) => void;
  observeMutations: (
    element: Element,
    callback: (mutations: MutationRecord[]) => void
  ) => void;
  unobserveMutations: (element: Element) => void;
}

export interface GoogleScriptsHeavyProps {
  adsAllowed: boolean;
  /** True after the first user interaction or the load fallback timeout. */
  adsScriptReady: boolean;
}
