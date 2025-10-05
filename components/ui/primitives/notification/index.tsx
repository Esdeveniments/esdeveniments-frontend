import { FC } from "react";
import CheckCircleIcon from "@heroicons/react/solid/CheckCircleIcon";
import ExclamationCircleIcon from "@heroicons/react/solid/ExclamationCircleIcon";
import XIcon from "@heroicons/react/solid/XIcon";
import type { EventNotificationProps } from "types/event";
import { Text } from "@components/ui/primitives/Text";

const Notification: FC<EventNotificationProps> = ({
  url,
  title,
  type,
  customNotification = true,
  hideNotification,
  hideClose = false,
}) => {
  if (customNotification) {
    return (
      <div className="break-word mb-component-md rounded-md bg-success/10 p-component-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <CheckCircleIcon
              className="h-5 w-5 text-primary"
              aria-hidden="true"
            />
          </div>
          <div className="ml-component-sm">
            <Text as="h3" size="sm" color="black" className="font-semibold">
              Fantàstic!! L&apos;esdeveniment {title} s&apos;ha creat
              correctament i ja el pot veure tothom!
            </Text>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="break-word relative mb-component-md rounded-md bg-success/10 p-component-md">
      {!hideClose && (
        <div className="absolute right-0 top-0 pr-component-md pt-component-md">
          <button
            type="button"
            className="rounded-md text-blackCorp/40 hover:text-blackCorp/60"
            onClick={() => hideNotification?.(true)}
          >
            <span className="sr-only">Close</span>
            <XIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      )}
      <div className="flex">
        <div className="flex-shrink-0">
          {type === "warning" ? (
            <ExclamationCircleIcon
              className="h-5 w-5 text-success/80"
              aria-hidden="true"
            />
          ) : (
            <CheckCircleIcon
              className="h-5 w-5 text-success/80"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="ml-component-sm">
          <Text as="h3" size="sm" color="black" className="font-semibold">
            {title}
          </Text>
          {url && (
            <Text
              as="a"
              variant="body-sm"
              className="text-success hover:underline"
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Veure esdeveniment
            </Text>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notification;
