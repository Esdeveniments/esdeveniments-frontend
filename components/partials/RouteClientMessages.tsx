import { locale as rootLocale } from "next/root-params";
import { getMessages } from "next-intl/server";
import { ROUTE_CLIENT_PATHS, pickPath } from "@lib/i18n/client-namespaces";
import type { AppLocale, RouteClientMessagesProps } from "types/i18n";
import ScopedMessagesProvider from "./ScopedMessagesProvider";

/**
 * Adds the messages only this route's client components read (see
 * ROUTE_CLIENT_PATHS) on top of the root provider's messages.
 */
export default async function RouteClientMessages({
  scope,
  children,
}: RouteClientMessagesProps) {
  const locale = (await rootLocale()) as AppLocale;
  const messages = await getMessages({ locale });
  const extra: Record<string, unknown> = {};
  for (const path of ROUTE_CLIENT_PATHS[scope]) {
    pickPath(messages, extra, path.split("."));
  }

  return (
    <ScopedMessagesProvider messages={extra}>{children}</ScopedMessagesProvider>
  );
}
