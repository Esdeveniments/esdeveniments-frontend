"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { DatePickerComponentProps } from "types/props";

const DatePickerImpl = dynamic(() => import("./DatePickerImpl"), {
  ssr: false,
});

export default function DatePickerComponent(props: DatePickerComponentProps) {
  const [shouldLoad, setShouldLoad] = useState(false);

  const ensureLoaded = useCallback(() => {
    setShouldLoad(true);
  }, []);

  return (
    <div className="w-full" onPointerEnter={ensureLoaded} onFocus={ensureLoaded}>
      {shouldLoad ? (
        <DatePickerImpl {...props} />
      ) : (
        <div className="w-full flex flex-col gap-4" onClick={ensureLoaded}>
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="flex flex-col md:flex-row gap-4 w-full">
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
