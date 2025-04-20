import { FC } from "react";

import CheckCircleIcon from "@heroicons/react/solid/CheckCircleIcon";
import ExclamationCircleIcon from "@heroicons/react/solid/ExclamationCircleIcon";
import XIcon from "@heroicons/react/solid/XIcon";
import { NotificationProps } from "types/props";

const Notification: FC<NotificationProps> = ({
  url,
  title,
  type,
  customNotification = true,
  hideNotification,
  hideClose = false,
}) => {
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
            <h3 className="text-sm font-semibold text-blackCorp">
              Fantàstic!! L&apos;esdeveniment {title} s&apos;ha creat
              correctament i ja el pot veure tothom!
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
            className="rounded-md text-gray-400 hover:text-gray-500"
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
          <h3 className="text-sm font-semibold text-green-800">
            {title}{" "}
            <span className="mt-2 text-sm text-green-700">
              <a className="font-bold" href={`mailto:${url}`}>
                {url}
              </a>
            </span>
          </h3>
        </div>
      </div>
    </div>
  );
};

export default Notification;
