import { NextResponse, type NextRequest } from "next/server";
import { getCanonicalNewsSearch } from "@utils/news-helpers";

// /noticies and /noticies/<place>, not files like /noticies/rss.xml.
const NEWS_LIST_PATH_RE = /^\/noticies(?:\/[^/.]+)?$/;

/** 301 old news pagination URLs (0-based `?page`, `size`, `cities`) to `?page=N`. */
export function getNewsPaginationRedirect(
  request: NextRequest,
  pathnameWithoutLocale: string,
): NextResponse | null {
  if (!NEWS_LIST_PATH_RE.test(pathnameWithoutLocale)) return null;
  const search = getCanonicalNewsSearch(request.nextUrl.searchParams);
  if (search === null) return null;
  const url = request.nextUrl.clone();
  url.search = search;
  return NextResponse.redirect(url, 301);
}
