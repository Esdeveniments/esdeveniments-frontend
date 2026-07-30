import { useTranslations } from "next-intl";
import { usePushNotifications } from "@components/hooks/usePushNotifications";

export default function PushSection({
  pushState,
  isSubscribing,
  onSubscribe,
}: {
  pushState: ReturnType<typeof usePushNotifications>["state"];
  isSubscribing: boolean;
  onSubscribe: () => void;
}) {
  const t = useTranslations("Components.SocialFollowPopup");
  return (
    <div className="flex flex-col gap-2.5 bg-muted/60 border border-border/40 rounded-card p-4">
      {/* Persistent live region: must exist in the DOM before its content
          changes for screen readers to announce it. sr-only (position:absolute)
          so it adds no layout; the rows below render the same state visually. */}
      <div role="status" aria-live="polite" className="sr-only">
        {pushState === "subscribed"
          ? t("pushEnabled")
          : pushState === "denied"
            ? t("pushBlockedHelp")
            : ""}
      </div>
      {pushState === "unsubscribed" ? (
        <button
          onClick={onSubscribe}
          disabled={isSubscribing}
          className="btn-primary w-full justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="w-4 h-4"
            aria-hidden="true"
          >
            <path d="M18 8h1a4 4 0 0 1 4 4v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V12a4 4 0 0 1 4-4h1V6a4 4 0 0 1 8 0v2zM10 19v-6m4 6v-6" />
          </svg>
          {isSubscribing ? t("pushEnabling") : t("pushEnable")}
        </button>
      ) : null}
      {pushState === "denied" ? (
        <p className="body-small text-foreground/70 text-center">
          {t("pushBlockedHelp")}
        </p>
      ) : null}
      {pushState === "subscribed" ? (
        <div className="flex items-center justify-center gap-2 py-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-5 h-5 text-success"
            aria-hidden="true"
          >
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          <p className="body-small text-success font-medium">
            {t("pushEnabled")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
