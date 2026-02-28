import type { CategoryBadgeProps } from "types/ui";
import { CATEGORY_BADGE_COLOR } from "@utils/constants";

export default function CategoryBadge({ label }: CategoryBadgeProps) {
  if (!label) return null;

  return (
    <span className={`inline-block text-[11px] font-semibold rounded-badge px-2 py-0.5 mb-1 w-fit ${CATEGORY_BADGE_COLOR}`}>
      {label}
    </span>
  );
}
