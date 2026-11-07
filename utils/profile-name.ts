import { formatCatalanDe } from "@utils/string-helpers";
import type { ProfileNameSource } from "types/api/user";

// The backend names town councils "Ajuntament El Masnou", "Ajuntament Sora".
const COUNCIL_WITHOUT_DE = /^(ajuntament)\s+(?!(?:de|del|dels)\s|d['’])(\S.*)$/i;

/**
 * On-screen name of a profile: displayName, then the legacy `name`, then the
 * username. A council name missing its "de" gets it, with the article
 * contracted ("Ajuntament El Masnou" → "Ajuntament del Masnou").
 */
export function getProfileDisplayName(
  profile: ProfileNameSource | null | undefined
): string {
  const name =
    profile?.displayName?.trim() ||
    profile?.name?.trim() ||
    profile?.username?.trim() ||
    "";
  const council = COUNCIL_WITHOUT_DE.exec(name);
  return council
    ? `${council[1]} ${formatCatalanDe(council[2], false, false, "town")}`
    : name;
}
