import type { ReactNode } from "react";

export default function SectionHeading({
  headingId,
  icon,
  title,
  titleClassName = "",
  containerClassName = "flex-start gap-element-gap",
}: {
  headingId?: string;
  icon: ReactNode;
  title: string;
  titleClassName?: string;
  containerClassName?: string;
}) {
  return (
    <div className={containerClassName}>
      {icon}
      <h2 id={headingId} className={titleClassName}>
        {title}
      </h2>
    </div>
  );
}
