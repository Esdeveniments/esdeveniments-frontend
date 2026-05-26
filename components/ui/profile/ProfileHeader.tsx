import ProfileOwnerActions from "@components/ui/profile/ProfileOwnerActions";
import { getTranslations } from "next-intl/server";
import type { ProfileHeaderProps } from "types/props";

function AvatarFallback({ name }: { name: string }) {
  const initial = name.charAt(0).toUpperCase();
  return (
    <div
      className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center text-3xl font-bold"
      role="img"
      aria-label={name}
    >
      {initial}
    </div>
  );
}

export default async function ProfileHeader({ profile }: ProfileHeaderProps) {
  const t = await getTranslations("Components.Profile");

  return (
    <section
      className="card-bordered rounded-lg overflow-hidden mb-section-y w-full"
      aria-label={t("title", { name: profile.name })}
      data-testid="profile-header"
    >
      <div className="h-40 sm:h-52 w-full bg-muted" />

      <div className="px-section-x py-element-gap -mt-10 relative">
        <div className="flex items-end gap-element-gap mb-element-gap">
          <AvatarFallback name={profile.name} />
        </div>

        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <h1 className="heading-1 text-foreground">{profile.name}</h1>
          <ProfileOwnerActions username={profile.username} />
        </div>

        <p className="body-small text-foreground/60">@{profile.username}</p>
      </div>
    </section>
  );
}
