export type TcfCallback = (
  tcData: {
    eventStatus?: string;
    listenerId?: number;
    purpose?: { consents?: Record<string, boolean> };
    vendor?: { consents?: Record<string, boolean> };
  },
  success: boolean
) => void;
