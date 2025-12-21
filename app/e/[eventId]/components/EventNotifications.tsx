import React from "react";
import { useTranslations } from "next-intl";
import Notification from "components/ui/common/notification";
import type { EventNotificationsProps } from "types/event";

const EventNotifications: React.FC<EventNotificationsProps> = ({
  newEvent,
  title,
  slug,
  showThankYouBanner,
  setShowThankYouBanner,
}) => {
  const t = useTranslations("Components.EventNotifications");

  return (
    <>
      {newEvent && <Notification title={title} url={slug} />}
      {showThankYouBanner && (
        <Notification
          customNotification={false}
          hideClose
          hideNotification={setShowThankYouBanner}
          title={t("thankYou")}
        />
      )}
    </>
  );
};

export default EventNotifications;
