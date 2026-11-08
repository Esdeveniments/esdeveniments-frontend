import { NextResponse, type NextRequest } from "next/server";

/** `?mode=agent` returns the structured agent view. */
export function getAgentRewrite(request: NextRequest): NextResponse | null {
  if (request.nextUrl.searchParams.get("mode") === "agent") {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = "/agent-view";
    rewriteUrl.searchParams.delete("mode");
    return NextResponse.rewrite(rewriteUrl);
  }
  return null;
}

// Proxy still runs for /_next/data even though the matcher excludes _next.
export function wantsMarkdown(request: NextRequest): boolean {
  return (
    !!request.headers.get("accept")?.includes("text/markdown") &&
    !request.nextUrl.pathname.startsWith("/_next/")
  );
}

const NOT_FOUND_MARKDOWN = `# Not found

There is no page at this URL on Esdeveniments.cat.

- Guide for agents: [/llms.txt](/llms.txt)
- All pages: [/sitemap.xml](/sitemap.xml)
- API: [/openapi.json](/openapi.json)
`;

/**
 * "Markdown for Agents": `Accept: text/markdown` on a page URL. The homepage
 * gets its markdown twin (/index.md), other pages the llms.txt guide, and a
 * path Proxy already knows is missing a markdown 404.
 *
 * Same URL as the HTML page: only the Cloudflare "Markdown negotiation —
 * never cache" bypass rule keeps these responses out of the shared cache.
 */
export function getMarkdownResponse(
  request: NextRequest,
  path: string,
  isMissing: boolean,
): NextResponse {
  if (isMissing) {
    const response = new NextResponse(NOT_FOUND_MARKDOWN, { status: 404 });
    response.headers.set("Content-Type", "text/markdown; charset=utf-8");
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Vary", "Accept");
    return response;
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = path === "/" ? "/index.md" : "/llms.txt";
  rewriteUrl.searchParams.set("_accept", "text/markdown");
  const headers = new Headers(request.headers);
  headers.set("x-markdown-negotiation", "1");
  return NextResponse.rewrite(rewriteUrl, { request: { headers } });
}
