import type { SkeletonVariant } from "types/ui";

export const SKELETON_VARIANTS: Record<SkeletonVariant, string> = {
  card: "bg-darkCorp animate-fast-pulse rounded-lg",
  text: "bg-darkCorp animate-fast-pulse rounded",
  avatar: "bg-darkCorp animate-fast-pulse rounded-full",
  "card-horizontal": "",
  "card-compact": "",
  restaurant: "",
  share: "",
  image: "",
};

export const SKELETON_SIZES: Record<string, string> = {
  sm: "h-4 w-16",
  md: "h-4 w-24",
  lg: "h-4 w-32",
  xl: "h-6 w-40",
};
