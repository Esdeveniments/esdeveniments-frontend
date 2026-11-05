import HomeHero from "@components/ui/hero/HomeHero";
import HeroSectionSkeleton from "@components/ui/hero/HeroSectionSkeleton";
import HomeEventsSkeleton from "./HomeEventsSkeleton";

// Mirrors ServerEventsCategorized: hero, link chip sections, quick
// categories, then the streamed event sections.
export default function HomePageSkeleton() {
  return (
    <div className="w-full bg-background" data-testid="home-page-skeleton">
      <HomeHero>
        <HeroSectionSkeleton />
      </HomeHero>

      <div
        className="container py-section-y border-b border-border/40 space-y-8 animate-pulse"
        aria-hidden="true"
      >
        {[4, 4, 3].map((chipCount, sectionIndex) => (
          <div key={sectionIndex} className="flex flex-col gap-4">
            <div className="h-7 w-64 rounded bg-border/40" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: chipCount }).map((_, chipIndex) => (
                <div
                  key={chipIndex}
                  className="h-8 w-32 rounded-full bg-border/40"
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div
        className="py-section-y container border-b animate-pulse"
        aria-hidden="true"
      >
        <div className="h-7 w-56 rounded bg-border/40 mb-element-gap" />
        <div className="grid grid-cols-2 gap-element-gap sm:flex sm:flex-row sm:gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-10 w-full sm:w-36 rounded-button bg-border/40"
            />
          ))}
        </div>
      </div>

      <HomeEventsSkeleton />
    </div>
  );
}
