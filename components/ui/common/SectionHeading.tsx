import { memo } from "react";

function SectionHeading({
  headingId,
  Icon,
  title,
  titleClassName = "",
  containerClassName = "flex-start gap-element-gap",
  iconClassName = "h-5 w-5 text-foreground-strong flex-shrink-0",
}: {
  headingId?: string;
  Icon?: React.ElementType;
  title: string;
  titleClassName?: string;
  containerClassName?: string;
  iconClassName?: string;
}) {
  return (
    <div className={containerClassName}>
      {Icon ? <Icon className={iconClassName} aria-hidden="true" /> : null}
      <h2 id={headingId} className={titleClassName}>
        {title}
      </h2>
    </div>
  );
}

export default memo(SectionHeading);
