import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import type { HubLinkProps } from "types/props";

/** On an event's page, under its title: a link to a collection it belongs to. */
export default function HubLink({
  href,
  label,
  analyticsEventName,
}: HubLinkProps) {
  return (
    <PressableAnchor
      href={href}
      className="self-start body-small font-semibold text-primary hover:text-primary-dark transition-colors"
      variant="inline"
      prefetch={false}
      data-analytics-event-name={analyticsEventName}
    >
      {label} →
    </PressableAnchor>
  );
}
