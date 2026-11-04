"use client";

import dynamic from "next/dynamic";
import type { DatePickerComponentProps } from "types/props";

const DatePickerImpl = dynamic(() => import("./DatePickerImpl"), {
  ssr: false,
  loading: () => (
    <div className="w-full flex flex-col gap-4">
      <div className="h-5 w-40 bg-muted rounded animate-pulse" />
      <div className="h-[340px] w-full bg-muted/30 rounded-card animate-pulse" />
    </div>
  ),
});

export default function DatePickerComponent(props: DatePickerComponentProps) {
  return <DatePickerImpl {...props} />;
}
