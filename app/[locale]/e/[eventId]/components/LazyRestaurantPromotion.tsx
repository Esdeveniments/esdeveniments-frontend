"use client";

import dynamic from "next/dynamic";
import type { RestaurantPromotionSectionProps } from "types/api/restaurant";

// Lazy load RestaurantPromotionSection to reduce initial bundle size
// This is a client component wrapper that allows ssr: false in Next.js 16
const RestaurantPromotionSection = dynamic(
  () => import("@components/ui/restaurantPromotion").then((mod) => ({ 
    default: mod.RestaurantPromotionSection 
  })),
  {
    ssr: false, // Client-only component, uses intersection observer
    loading: () => null, // Component handles its own visibility
  }
);

export default function LazyRestaurantPromotion(props: RestaurantPromotionSectionProps) {
  return <RestaurantPromotionSection {...props} />;
}


