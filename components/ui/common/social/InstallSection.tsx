import { useTranslations } from "next-intl";
import IosInstallSteps from "./IosInstallSteps";

export default function InstallSection({
  canPromptInstall,
  showIosInstructions,
  showOpenInSafariHint,
  isIpad,
  iosShareLocation,
  isInstalling,
  onInstall,
}: {
  canPromptInstall: boolean;
  showIosInstructions: boolean;
  showOpenInSafariHint: boolean;
  isIpad: boolean;
  iosShareLocation: "safari" | "menu";
  isInstalling: boolean;
  onInstall: () => void;
}) {
  const t = useTranslations("Components.SocialFollowPopup");
  if (!canPromptInstall && !showIosInstructions && !showOpenInSafariHint) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2.5">
      {canPromptInstall ? (
        <button
          onClick={onInstall}
          disabled={isInstalling}
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          {isInstalling ? t("installEnabling") : t("installEnable")}
        </button>
      ) : null}
      {showIosInstructions ? (
        <IosInstallSteps isIpad={isIpad} shareLocation={iosShareLocation} />
      ) : null}
      {showOpenInSafariHint ? (
        <p className="body-small text-foreground/70 text-center leading-relaxed">
          {t("installInAppHelp")}
        </p>
      ) : null}
    </div>
  );
}
