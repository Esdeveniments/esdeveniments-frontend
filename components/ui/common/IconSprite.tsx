// Heroicons that event cards repeat many times per page. The root layout renders
// this sprite once; cards draw an icon with <svg><use href={`#${id}`} /></svg>
// instead of inlining the full path in every card.
export const SPRITE_ICON = {
  mapPin: "icon-map-pin",
  heartOutline: "icon-heart-outline",
  heartSolid: "icon-heart-solid",
} as const;

export default function IconSprite() {
  return (
    <svg aria-hidden="true" className="absolute h-0 w-0 overflow-hidden">
      <symbol id={SPRITE_ICON.mapPin} viewBox="0 0 24 24">
        <g
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
          <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
        </g>
      </symbol>
      <symbol id={SPRITE_ICON.heartOutline} viewBox="0 0 24 24">
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
        />
      </symbol>
      <symbol id={SPRITE_ICON.heartSolid} viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z"
        />
      </symbol>
    </svg>
  );
}
