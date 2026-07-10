"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import type { DatePickerComponentProps } from "types/props";

const DatePickerImpl = dynamic(() => import("./DatePickerImpl"), {
  ssr: false,
});

export default function DatePickerComponent(props: DatePickerComponentProps) {
  const t = useTranslations("Components.DatePicker");
  const [shouldLoad, setShouldLoad] = useState(false);
  const [wasInteracted, setWasInteracted] = useState(false);

  const ensureLoaded = useCallback((e?: React.SyntheticEvent) => {
    setShouldLoad(true);
    if (
      e &&
      (e.type === "click" || e.type === "focus" || e.type === "keydown")
    ) {
      setWasInteracted(true);
    }
  }, []);

  return (
    <div className="w-full" onPointerEnter={ensureLoaded} onFocus={ensureLoaded}>
      {shouldLoad ? (
        <DatePickerImpl {...props} autoFocus={props.autoFocus || wasInteracted} />
      ) : (
        <div
          className="w-full flex flex-col gap-4"
          onClick={ensureLoaded}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              ensureLoaded(e);
            }
          }}
          tabIndex={0}
          role="button"
          aria-label={t("selectDateAndTime")}
        >
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <div className="w-full">
              <div className="h-4 w-24 bg-muted rounded mb-2" />
              <div className="w-full min-h-[44px] px-4 py-3 border border-border rounded-xl bg-muted/30" />
            </div>
            <div className="w-full">
              <div className="h-4 w-24 bg-muted rounded mb-2" />
              <div className="w-full min-h-[44px] px-4 py-3 border border-border rounded-xl bg-muted/30" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
