import { NextResponse, type NextRequest } from "next/server";
import { stripLocalePrefix } from "@utils/i18n-routing";
import { MATCH_USERNAME_RE } from "@lib/validation/username";

// Profile pages: /perfil/<username> and /perfil/<username>/passats.
const PROFILE_PATH_RE = /^\/perfil\/([^/]+)(\/passats)?$/;

/**
 * 301 a profile URL with capitals to its lowercase form. Usernames are always
 * lowercase and the backend finds them case-insensitively, so
 * /perfil/BegudesAmbClasse rendered a second copy of the page.
 */
export function getProfileCaseRedirect(
  request: NextRequest,
  pathnameWithoutLocale: string,
): NextResponse | null {
  const match = PROFILE_PATH_RE.exec(pathnameWithoutLocale);
  if (!match) return null;
  const username = match[1];
  const lower = username.toLowerCase();
  if (username === lower || !MATCH_USERNAME_RE.test(lower)) return null;

  const { locale } = stripLocalePrefix(request.nextUrl.pathname);
  const localePrefix = locale ? `/${locale}` : "";
  const url = request.nextUrl.clone();
  url.pathname = `${localePrefix}/perfil/${lower}${match[2] ?? ""}`;
  return NextResponse.redirect(url, 301);
}
