export type TcfCallback = (
  tcData: {
    eventStatus?: string;
    listenerId?: number;
    purpose?: { consents?: Record<string, boolean> };
    vendor?: { consents?: Record<string, boolean> };
  },
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
