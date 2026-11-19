import SectionHeading from "@components/ui/common/SectionHeading";
import type { DescriptionLayoutProps } from "types/props";

export const DESCRIPTION_BODY_CLASS =
  "body-normal leading-[1.75] text-foreground-strong/90 [&>*]:body-normal [&>*]:leading-[1.75] [&>*]:text-foreground-strong/90 [&_strong]:font-semibold";

/**
 * Description section markup. No "use client": the server `Description` and
 * the event page's client translate button both render it.
 */
export default function DescriptionLayout({
  title,
  introText,
  actions,
  children,
}: DescriptionLayoutProps) {
  return (
    <section className="w-full" aria-labelledby="description-section">
      <div className="stack min-w-0">
        <div className="flex-between flex-wrap gap-element-gap">
          <SectionHeading
            headingId="description-section"
            title={title}
            titleClassName="heading-2"
          />
          {actions ? <div className="flex items-center">{actions}</div> : null}
        </div>
        <div className="w-full max-w-prose break-words overflow-hidden space-y-4">
          {introText && (
            <p className="body-normal leading-[1.75] text-foreground-strong/90">{introText}</p>
          )}
          {children}
        </div>
      </div>
    </section>
  );
}
