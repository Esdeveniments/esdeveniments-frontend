import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const segments = pathname.split("/").filter(Boolean);

  // Handle redirects for old /tots/ URLs (future-proofing)
  if (segments.length === 3 && segments[1] === "tots") {
    // /catalunya/tots/festivals -> /catalunya/festivals
    const newUrl = `/${segments[0]}/${segments[2]}`;
    const searchParams = request.nextUrl.searchParams.toString();
    const finalUrl = searchParams ? `${newUrl}?${searchParams}` : newUrl;
    return NextResponse.redirect(new URL(finalUrl, request.url), 301);
  }

  if (segments.length === 2 && segments[1] === "tots") {
    // /catalunya/tots -> /catalunya
    const newUrl = `/${segments[0]}`;
    const searchParams = request.nextUrl.searchParams.toString();
    const finalUrl = searchParams ? `${newUrl}?${searchParams}` : newUrl;
    return NextResponse.redirect(new URL(finalUrl, request.url), 301);
  }

  // Create a new response
  const response = NextResponse.next();

  // Add the pathname to the headers so server components can access it
  response.headers.set("x-pathname", request.nextUrl.pathname);

  return response;
}

export const config = {
  // Match all paths except for static files and API routes
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - robots.txt, sitemap.xml, ads.txt (SEO files)
     * - static (static assets)
     * - styles (CSS files)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap|ads.txt|static|styles).*)",
  ],
};
