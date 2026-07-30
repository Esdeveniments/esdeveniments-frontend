import type { AvatarInitialsProps } from "types/props";

export default function AvatarInitials({ name }: AvatarInitialsProps) {
  const initial = (name.trim().charAt(0) || "?").toUpperCase();
  return (
    <div
      className="w-20 h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-bold"
      role="img"
      aria-label={name}
    >
      {initial}
    </div>
  );
}
