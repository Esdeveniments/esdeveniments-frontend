"use client";

import { useState } from "react";
import AvatarInitials from "@components/ui/common/AvatarInitials";
import { buildOptimizedImageUrl } from "@utils/image-cache";
import type { ProfileAvatarProps, ProfileAvatarSize } from "types/props";

const SIZES: Record<ProfileAvatarSize, { px: number; box: string; text: string }> = {
  xs: { px: 20, box: "w-5 h-5", text: "text-xs" },
  sm: { px: 32, box: "w-8 h-8", text: "text-sm" },
  md: { px: 48, box: "w-12 h-12", text: "text-lg" },
};

/**
 * Decorative avatar: the name is always shown next to it. Falls back to the
 * initial when there is no photo or the proxy can't fetch it.
 */
export default function ProfileAvatar({ avatarUrl, name, size }: ProfileAvatarProps) {
  const [failed, setFailed] = useState(false);
  const { px, box, text } = SIZES[size];

  if (avatarUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- already resized by /api/image-proxy
      <img
        src={buildOptimizedImageUrl(avatarUrl, null, { width: px * 2, quality: 50 })}
        alt=""
        width={px}
        height={px}
        loading="lazy"
        decoding="async"
        // A server-rendered image can fail before hydration, when React isn't
        // listening yet. A lazy image that hasn't started has no currentSrc.
        ref={(img) => {
          if (img?.complete && img.naturalWidth === 0 && img.currentSrc) setFailed(true);
        }}
        onError={() => setFailed(true)}
        // bg-background: a transparent logo needs a neutral backdrop.
        className={`${box} shrink-0 rounded-full object-cover bg-background border border-border`}
      />
    );
  }
  return <AvatarInitials name={name} className={`${box} ${text}`} decorative />;
}
