import React from "react";
import Notification from "components/ui/common/notification";
import type { EventNotificationsProps } from "types/event";

const EventNotifications: React.FC<EventNotificationsProps> = ({
  newEvent,
  title,
  slug,
  showThankYouBanner,
  setShowThankYouBanner,
}) => {
  return (
    <>
      {newEvent && <Notification title={title} url={slug} />}
      {showThankYouBanner && (
        <Notification
          customNotification={false}
          hideClose
          hideNotification={setShowThankYouBanner}
          title="Gràcies per contribuir a millorar el contingut de Esdeveniments.cat! En menys de 24 hores estarà disponible el canvi."
        />
      )}
    </>
  );
};

export default EventNotifications;
