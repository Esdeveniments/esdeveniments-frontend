import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
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
     */
    "/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap|ads.txt|static).*)",
  ],
};
