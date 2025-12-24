"use client";

import FavoriteButton from "./index";
import type { FavoriteButtonProps } from "types/props";

export default function FavoriteButtonOverlay({
  wrapperClassName,
  ...props
}: Omit<FavoriteButtonProps, "className"> & { wrapperClassName?: string }) {
  return (
    <div
      className={["absolute top-2 right-2 z-20", wrapperClassName]
        .filter(Boolean)
        .join(" ")}
    >
      <FavoriteButton
        {...props}
        className="h-10 w-10 p-0 rounded-badge bg-background/90 ring-1 ring-border/60 hover:bg-muted/60 hover:ring-border transition-[background,transform,box-shadow,border-color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
      />
    </div>
  );
}
