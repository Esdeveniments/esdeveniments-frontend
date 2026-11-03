import { NextResponse, type NextRequest } from "next/server";

/**
 * Agent views: `?mode=agent` returns the structured agent view, and
 * `Accept: text/markdown` returns the llms.txt content ("Markdown for Agents").
 */
export function getAgentRewrite(request: NextRequest): NextResponse | null {
  if (request.nextUrl.searchParams.get("mode") === "agent") {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/agent-view";
    rewriteUrl.searchParams.delete("mode");
    return NextResponse.rewrite(rewriteUrl);
  }

  // Proxy still runs for /_next/data even though the matcher excludes _next.
  if (
    request.headers.get("accept")?.includes("text/markdown") &&
    !request.nextUrl.pathname.startsWith("/_next/")
  ) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/llms.txt";
    rewriteUrl.searchParams.set("_accept", "text/markdown");
    const headers = new Headers(request.headers);
    headers.set("x-markdown-negotiation", "1");
    return NextResponse.rewrite(rewriteUrl, { request: { headers } });
  }

  return null;
}
