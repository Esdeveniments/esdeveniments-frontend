"use client";

import { useTranslations } from "next-intl";
import { FC } from "react";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  XMarkIcon as XIcon,
} from "@heroicons/react/24/solid";
import type { EventNotificationProps } from "types/event";

const Notification: FC<EventNotificationProps> = ({
  url,
  title,
  type,
  customNotification = true,
  hideNotification,
  hideClose = false,
}) => {
  const t = useTranslations("Components.Notification");

  if (customNotification) {
    return (
      <div className="rounded-md bg-green-50 p-4 mb-4 break-word">
        <div className="flex">
          <div className="flex-shrink-0">
            <CheckCircleIcon
              className="h-5 w-5 text-primary"
              aria-hidden="true"
            />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-semibold text-foreground-strong">
              {t("createdSuccess", { title: title || "Event" })}
            </h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-md bg-green-50 p-4 mb-4 break-word">
      {!hideClose && (
        <div className="absolute top-0 right-0 pt-4 pr-4">
          <button
            type="button"
            className="rounded-md text-foreground/60 hover:text-foreground/80"
            onClick={() => hideNotification?.(true)}
          >
            <span className="sr-only">{t("close")}</span>
            <XIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      )}
      <div className="flex">
        <div className="flex-shrink-0">
          {type === "warning" ? (
            <ExclamationCircleIcon
              className="h-5 w-5 text-green-400"
              aria-hidden="true"
            />
          ) : (
            <CheckCircleIcon
              className="h-5 w-5 text-green-400"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-semibold text-foreground-strong">{title}</h3>
          {url && (
            <a
              href={url}
              className="text-sm text-green-700 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("viewEvent")}
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notification;
