import JsonLdServer from "./JsonLdServer";
import ProfileHeader from "@components/ui/profile/ProfileHeader";
import ProfileClaimCta from "@components/ui/profile/ProfileClaimCta";
import { generateBreadcrumbList } from "@components/partials/seo-meta";
import { getTranslations } from "next-intl/server";
import { getLocaleSafely, toLocalizedUrl } from "@utils/i18n-seo";
import type { BreadcrumbItem } from "types/common";
import type { ProfilePageShellProps } from "types/props";

export default async function ProfilePageShell({
  profile,
}: ProfilePageShellProps) {
  const tBreadcrumbs = await getTranslations("Components.Breadcrumbs");
  const tProfile = await getTranslations("Components.Profile");
  const locale = await getLocaleSafely();

  const profileUrl = toLocalizedUrl(`/perfil/${profile.username}`, locale);

  const breadcrumbItems: BreadcrumbItem[] = [
    { name: tBreadcrumbs("home"), url: toLocalizedUrl("/", locale) },
    {
      name: tProfile("breadcrumbProfiles"),
      url: toLocalizedUrl("/perfil", locale),
    },
    { name: profile.name, url: profileUrl },
  ];

  const breadcrumbListSchema = generateBreadcrumbList(breadcrumbItems);

  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    url: profileUrl,
    identifier: profile.username,
  };

  return (
    <>
      {breadcrumbListSchema && (
        <JsonLdServer id="breadcrumbs-schema" data={breadcrumbListSchema} />
      )}
      <JsonLdServer
        id={`person-${profile.username}`}
        data={personSchema}
      />

      <div className="container flex flex-col justify-center items-center pt-[6rem]">
        <ProfileHeader profile={profile} />
        <ProfileClaimCta username={profile.username} />
      </div>
    </>
  );
}
