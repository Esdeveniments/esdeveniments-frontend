import { useTranslations } from "next-intl";

/**
 * iOS "Add to Home Screen" instruction sheet, following the de-facto
 * standard pattern (react-ios-pwa-prompt, Progressier): app identity row
 * matching the native A2HS preview, then numbered steps with the real iOS
 * glyphs so users pattern-match icons instead of translating words.
 */
export default function IosInstallSteps({
  isIpad,
  shareLocation,
}: {
  isIpad: boolean;
  shareLocation: "safari" | "menu";
}) {
  const t = useTranslations("Components.SocialFollowPopup");
  const shareStep =
    shareLocation === "menu"
      ? t("installStepShareMenu")
      : isIpad
        ? t("installStepShareIpad")
        : t("installStepShare");
  return (
    <div className="flex flex-col">
      {/* Identity row: mirrors what iOS shows in the A2HS dialog */}
      <div className="flex items-center gap-3 pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- 40px static
            asset already precached by the SW; next/image adds no value */}
        <img
          src="/static/icons/icon-192x192.png"
          alt=""
          aria-hidden="true"
          width={40}
          height={40}
          className="rounded-lg border border-border/60 bg-background"
        />
        <div className="text-left">
          <p
            className="body-small font-semibold text-foreground-strong leading-tight"
            translate="no"
          >
            Esdeveniments
          </p>
          <p className="body-small text-foreground/60 leading-tight" translate="no">
            esdeveniments.cat
          </p>
        </div>
      </div>

      <ol className="flex flex-col" aria-label={t("installEnable")}>
        <li className="flex items-center gap-3 py-2.5 border-t border-border/40">
          <span className="body-small text-foreground/50 w-4 text-center flex-shrink-0">
            1
          </span>
          {shareLocation === "menu" ? (
            /* ⋯ overflow glyph for Chrome/Firefox/Edge/Opera on iOS, where
               Share sits inside the menu rather than the toolbar */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-5 h-5 flex-shrink-0 text-foreground"
              aria-hidden="true"
            >
              <circle cx="5" cy="12" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="19" cy="12" r="1.6" />
            </svg>
          ) : (
            /* iOS share glyph; #007AFF replicates the system tint so users
               can pattern-match the real button (semantic tokens would
               defeat the recognition purpose) */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#007AFF"
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5 flex-shrink-0"
              aria-hidden="true"
            >
              <path d="M12 3v12M8 7l4-4 4 4" />
              <path d="M5 11v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
            </svg>
          )}
          <span className="body-small text-foreground text-left">
            {shareStep}
          </span>
        </li>
        <li className="flex items-center gap-3 py-2.5 border-t border-border/40">
          <span className="body-small text-foreground/50 w-4 text-center flex-shrink-0">
            2
          </span>
          {/* iOS "Add to Home Screen" plus-square glyph */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 flex-shrink-0 text-foreground"
            aria-hidden="true"
          >
            <rect x="4" y="4" width="16" height="16" rx="4" />
            <path d="M12 8.5v7M8.5 12h7" />
          </svg>
          <span className="body-small text-foreground text-left">
            {t("installStepAdd")}
          </span>
        </li>
      </ol>
    </div>
  );
}
