import { FireIcon } from "@heroicons/react/24/solid";
import { EyeIcon } from "@heroicons/react/24/outline";

const POPULAR_THRESHOLD = 50;

/**
 * Social proof counter — always shows for any positive visit count.
 * ≥50: FireIcon (solid, red) + "N interested" — signals trending/hot
 * <50: EyeIcon (outline) + "N interested" — signals "others are looking"
 *
 * Server component — no client-side state needed.
 */
export default function SocialProofCounter({
  visits,
  interestedLabel,
}: {
  visits: number;
  interestedLabel: string;
}) {
  if (!visits || visits <= 0) return null;

  const isPopular = visits >= POPULAR_THRESHOLD;

  return (
    <span className="inline-flex items-center gap-1 body-small text-foreground-strong">
      {isPopular ? (
        <FireIcon className="w-4 h-4 text-primary" />
      ) : (
        <EyeIcon className="w-4 h-4 text-foreground-strong/70" />
      )}
      <span className={`tabular-nums ${isPopular ? "font-semibold" : ""}`}>
        {interestedLabel}
      </span>
    </span>
  );
}
