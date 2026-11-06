import PressableAnchor from "@components/ui/primitives/PressableAnchor";
import type { BadgeProps } from "types/common";

// Base classes aligned with design tokens (badge sizing + transitions)
const BASE_CLASS =
  "rounded-badge px-badge-x py-badge-y text-xs font-medium border border-border hover:bg-muted transition-interactive cursor-pointer";

const Badge = ({
  href,
  children,
  className = "",
  onClick,
  ariaLabel,
  ariaCurrent,
  ref,
  ...rest
}: BadgeProps) => {
  const combined = `${BASE_CLASS} ${className}`.trim();

  // Separate data-* attributes to forward to the underlying element
  const dataAttrs = Object.fromEntries(
    Object.entries(rest).filter(([k]) => k.startsWith("data-")),
  );

  if (href) {
    return (
      <PressableAnchor
        href={href}
        className={combined}
        aria-label={ariaLabel}
        aria-current={ariaCurrent}
        variant="chip"
        prefetch={false}
        {...dataAttrs}
      >
        <span data-slot="badge" ref={ref}>
          {children}
        </span>
      </PressableAnchor>
    );
  }

  return (
    <span
      data-slot="badge"
      ref={ref}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      className={combined}
      {...dataAttrs}
    >
      {children}
    </span>
  );
};

export default Badge;
