import Badge from "@components/ui/common/badge";
import type { FestaMajorLinkListProps } from "types/props";

/** A labelled row of chip links. */
export default function FestaMajorChips({
  title,
  links,
}: FestaMajorLinkListProps) {
  if (links.length === 0) return null;
  return (
    <nav aria-label={title} className="stack gap-2 w-full">
      <p className="body-small font-medium text-muted-foreground">{title}</p>
      <ul className="flex flex-wrap gap-element-gap-sm">
        {links.map((link) => (
          <li key={link.href}>
            <Badge href={link.href}>{link.label}</Badge>
          </li>
        ))}
      </ul>
    </nav>
  );
}
