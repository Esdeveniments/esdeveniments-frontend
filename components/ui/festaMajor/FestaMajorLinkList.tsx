import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import type { FestaMajorLinkListProps } from "types/props";

export default function FestaMajorLinkList({
  title,
  links,
}: FestaMajorLinkListProps) {
  if (links.length === 0) return null;
  return (
    <nav
      aria-label={title}
      className="stack gap-2 w-full pt-6 border-t border-border"
    >
      <h2 className="heading-3">{title}</h2>
      <ul className="flex flex-wrap gap-x-6 gap-y-2">
        {links.map((link) => (
          <li key={link.href}>
            <PressableAnchor
              href={link.href}
              className="text-primary hover:text-primary-dark body-small transition-colors"
              variant="inline"
              prefetch={false}
            >
              {link.label}
            </PressableAnchor>
          </li>
        ))}
      </ul>
    </nav>
  );
}
