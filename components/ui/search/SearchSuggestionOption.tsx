"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { MagnifyingGlassIcon, MapPinIcon } from "@heroicons/react/24/outline";
import AvatarInitials from "@components/ui/common/AvatarInitials";
import VerifiedBadge from "@components/ui/profile/VerifiedBadge";
import { buildOptimizedImageUrl } from "@utils/image-cache";
import type { SearchSuggestionAvatarProps, SearchSuggestionOptionProps } from "types/search";

const AVATAR_PX = 32;
const ICON_CLASS = "w-5 h-5 shrink-0 text-muted-foreground";

function Avatar({ profile, name }: SearchSuggestionAvatarProps) {
  const [failed, setFailed] = useState(false);
  if (profile.avatarUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- already resized by /api/image-proxy
      <img
        src={buildOptimizedImageUrl(profile.avatarUrl, null, { width: AVATAR_PX * 2, quality: 50 })}
        alt=""
        width={AVATAR_PX}
        height={AVATAR_PX}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
        className="w-8 h-8 shrink-0 rounded-full object-cover bg-background border border-border"
      />
    );
  }
  return <AvatarInitials name={name} className="w-8 h-8 text-sm" decorative />;
}

/** One `role="option"` row of the search suggestions listbox. */
export default function SearchSuggestionOption({
  suggestion,
  domId,
  active,
  onSelect,
}: SearchSuggestionOptionProps) {
  const t = useTranslations("Components.SearchBar.suggestions");
  let content;
  if (suggestion.type === "events") {
    content = (
      <>
        <MagnifyingGlassIcon className={ICON_CLASS} aria-hidden="true" />
        <span className="truncate">{t("searchEvents", { query: suggestion.query })}</span>
      </>
    );
  } else if (suggestion.type === "place") {
    content = (
      <>
        <MapPinIcon className={ICON_CLASS} aria-hidden="true" />
        <span className="truncate">{suggestion.place.label}</span>
        <span className="sr-only">, {t("placeType")}</span>
      </>
    );
  } else {
    const { profile } = suggestion;
    content = (
      <>
        <Avatar profile={profile} name={profile.displayName || profile.username} />
        <span className="min-w-0 flex flex-col">
          <span className="flex items-center gap-1">
            <span className="truncate text-foreground-strong">
              {profile.displayName || `@${profile.username}`}
            </span>
            <VerifiedBadge role={profile.role} verified={profile.verified} />
          </span>
          <span className="body-small text-muted-foreground truncate">
            {profile.displayName ? `@${profile.username} · ` : ""}
            {t("upcomingEvents", { count: profile.upcomingEventCount })}
          </span>
        </span>
        <span className="sr-only">, {t("profileType")}</span>
      </>
    );
  }

  return (
    <div
      id={domId}
      role="option"
      aria-selected={active}
      onClick={() => onSelect(suggestion)}
      className={`flex items-center gap-3 min-h-button px-4 py-2 cursor-pointer body-normal text-foreground ${active ? "bg-muted" : "hover:bg-muted/60"}`}
      data-testid="search-suggestion"
      data-type={suggestion.type}
    >
      {content}
    </div>
  );
}
