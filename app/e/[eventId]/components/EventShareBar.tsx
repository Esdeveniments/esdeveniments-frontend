"use client";

import FavoriteButton from "./FavoriteButton";

export default function EventShareBar({
  visits,
  slug,
}: {
  visits: number;
  slug: string;
}) {
  return (
    <div className="w-full flex items-center justify-between px-4">
      <div className="text-sm text-gray-600">{visits} visites</div>
      <FavoriteButton slug={slug} />
    </div>
  );
}
