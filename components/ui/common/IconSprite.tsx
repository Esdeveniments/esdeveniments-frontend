// Heroicons that event cards repeat many times per page, plus the mobile
// bottom-nav icons. The root layout renders this sprite once; cards and nav
// links draw an icon with <svg><use href={`#${id}`} /></svg> instead of
// inlining the full path (keeps each nav link under ActiveLink's size budget).
export const SPRITE_ICON = {
  mapPin: "icon-map-pin",
  heartOutline: "icon-heart-outline",
  heartSolid: "icon-heart-solid",
  home: "icon-home",
  calendar: "icon-calendar",
  plus: "icon-plus",
  newspaper: "icon-newspaper",
} as const;

const OUTLINE_PATHS = {
  [SPRITE_ICON.heartOutline]:
    "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z",
  [SPRITE_ICON.home]:
    "m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25",
  [SPRITE_ICON.calendar]:
    "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5",
  [SPRITE_ICON.plus]: "M12 4.5v15m7.5-7.5h-15",
  [SPRITE_ICON.newspaper]:
    "M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z",
};

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
      <symbol id={SPRITE_ICON.heartSolid} viewBox="0 0 24 24">
        <path
          fill="currentColor"
          d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z"
        />
      </symbol>
      {Object.entries(OUTLINE_PATHS).map(([id, d]) => (
        <symbol key={id} id={id} viewBox="0 0 24 24">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            d={d}
          />
        </symbol>
      ))}
    </svg>
  );
}
