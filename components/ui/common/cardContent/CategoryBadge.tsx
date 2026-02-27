import type { CategoryBadgeProps } from "types/ui";

export default function CategoryBadge({ label, size = "default" }: CategoryBadgeProps) {
  if (!label) return null;

  const sizeClasses =
    size === "sm"
      ? "top-2 left-2 px-2 py-0.5 text-[11px]"
      : "top-2.5 left-2.5 px-2.5 py-1 text-xs";

  return (
    <div className={`absolute ${sizeClasses} z-[2] pointer-events-none`}>
      <span className="inline-flex items-center rounded-badge font-semibold bg-background/90 text-foreground-strong backdrop-blur-sm shadow-xs">
        {label}
      </span>
    </div>
  );
}
