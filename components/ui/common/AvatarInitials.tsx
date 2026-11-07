import type { AvatarInitialsProps } from "types/props";

export default function AvatarInitials({
  name,
  className = "w-20 h-20 text-3xl",
  decorative = false,
}: AvatarInitialsProps) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  return (
    <div
      className={`${className} shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold`}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": name })}
    >
      {initial}
    </div>
  );
}
