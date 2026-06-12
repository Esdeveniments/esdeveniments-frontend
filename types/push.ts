/**
 * Types for the Web Push notification system.
 */

/** A row from the push_subscriptions Turso table. */
export interface PushSubscriptionRow {
  id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** The payload shape sent from client → /api/push/subscribe */
export interface PushSubscribeBody {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

/** The payload shape for /api/push/send */
export interface PushSendBody {
  title: string;
  body: string;
  /** URL to open when the user clicks the notification. Defaults to "/". */
  url?: string;
  /** Optional icon URL. Defaults to the app icon. */
  icon?: string;
}

/** Client-side push subscription state for UI rendering. */
export type PushState =
  | "unsupported"
  | "denied"
  | "subscribed"
  | "unsubscribed";
