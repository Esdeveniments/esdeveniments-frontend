import type { EventHeaderProps } from "types/event";
import EventStatusBadge from "./EventStatusBadge";
import SocialProofCounter from "./SocialProofCounter";
import EventByline from "./EventByline";

/**
 * State row (status + interest), the title, then who publishes it. Share and
 * favourite sit at the right of the byline, or of the state row when there is
 * no owner, so they never get a row of their own.
 */
export default function EventHeader({
  title,
  temporalStatus,
  visits,
  interestedLabel,
  owner,
  actions,
  children,
}: EventHeaderProps) {
  const actionsGroup = <div className="flex flex-shrink-0 items-center gap-1">{actions}</div>;

  return (
    <header className="w-full flex flex-col gap-2 min-w-0">
      <div className="flex min-h-button items-center justify-between gap-element-gap">
        <div className="flex flex-wrap items-center gap-x-element-gap gap-y-1">
          <EventStatusBadge status={temporalStatus} />
          <SocialProofCounter visits={visits} interestedLabel={interestedLabel} />
        </div>
        {!owner && actionsGroup}
      </div>
      <h1 className="heading-1 break-words">{title}</h1>
      {owner && (
        <div className="flex items-center justify-between gap-element-gap">
          <div className="min-w-0 flex-1">
            <EventByline owner={owner} />
          </div>
          {actionsGroup}
        </div>
      )}
      {children}
    </header>
  );
}
