import { ReactElement } from "react";
import { HybridEventsHeadingLayoutProps } from "types/props";

export default function HeadingLayout({
  title,
  subtitle,
  titleClass,
  subtitleClass,
  cta,
}: HybridEventsHeadingLayoutProps): ReactElement {
  return (
    <>
      <div className="mt-element-gap mb-element-gap md:flex md:items-start md:justify-between gap-element-gap">
        <h1 className={`${titleClass} flex-1`}>{title}</h1>
        {cta}
      </div>
      <p className={`${subtitleClass} text-left mb-element-gap`}>
        {subtitle}
      </p>
    </>
  );
}
