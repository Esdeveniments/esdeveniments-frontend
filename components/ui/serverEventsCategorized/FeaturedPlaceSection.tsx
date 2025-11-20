import ChevronRightIcon from "@heroicons/react/solid/ChevronRightIcon";
import Badge from "@components/ui/common/badge";
import EventsAroundServer from "@components/ui/eventsAround/EventsAroundServer";
import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import type { FeaturedPlaceConfig } from "types/props";
import type { EventSummaryResponseDTO } from "types/api/event";

export function FeaturedPlaceSection({
  section,
}: {
  section: FeaturedPlaceConfig & {
    events: EventSummaryResponseDTO[];
    placeSlug: string;
    usePriority: boolean;
  };
}) {
  return (
    <section className="py-section-y border-b">
      <div className="flex-between gap-element-gap">
        <div className="stack gap-1">
          <h2 className="heading-2">{section.title}</h2>
          {section.subtitle && (
            <p className="body-small text-foreground/70">{section.subtitle}</p>
          )}
        </div>
        <PressableAnchor
          href={`/${section.placeSlug}`}
          className="flex-center gap-1 body-small text-primary hover:text-primary/80 transition-interactive whitespace-nowrap"
          prefetch={false}
          variant="inline"
        >
          Veure més
          <ChevronRightIcon className="w-5 h-5" />
        </PressableAnchor>
      </div>

      <nav
        aria-label={`Explora ${section.title} per data`}
        className="mt-element-gap-sm mb-element-gap-sm"
      >
        <ul className="flex gap-element-gap">
          <li>
            <Badge
              href={`/${section.placeSlug}/avui`}
              ariaLabel={`Veure activitats d'avui a ${section.title}`}
            >
              Avui
            </Badge>
          </li>
          <li>
            <Badge
              href={`/${section.placeSlug}/dema`}
              ariaLabel={`Veure activitats de demà a ${section.title}`}
            >
              Demà
            </Badge>
          </li>
          <li>
            <Badge
              href={`/${section.placeSlug}/cap-de-setmana`}
              ariaLabel={`Veure activitats aquest cap de setmana a ${section.title}`}
            >
              Cap de setmana
            </Badge>
          </li>
        </ul>
      </nav>

      <EventsAroundServer
        events={section.events}
        layout="horizontal"
        usePriority={section.usePriority}
        showJsonLd
        title={section.title}
        jsonLdId={`featured-events-${section.slug}`}
      />
    </section>
  );
}
