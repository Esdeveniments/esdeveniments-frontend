"use client";

import { HeroProvider } from "./HeroContext";
import HeroSearch from "./HeroSearch";
import DateQuickFilters from "./DateQuickFilters";
import HeroCTA from "./HeroCTA";

export default function HeroSection({ subTitle }: { subTitle?: string }) {
  return (
    <HeroProvider>
      <HeroSearch subTitle={subTitle} />
      <DateQuickFilters />
      <HeroCTA />
    </HeroProvider>
  );
}
