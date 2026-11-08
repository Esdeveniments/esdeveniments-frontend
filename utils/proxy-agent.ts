import { NextResponse, type NextRequest } from "next/server";

export const MARKDOWN_CONTENT_TYPE = "text/markdown; charset=utf-8";
const NEGOTIATION_HEADER = "x-markdown-negotiation";

// Markdown served on a page URL shares the URL with the HTML. Cloudflare keys
// on the URL only and ignores Vary, so it must never be stored there.
export const NEGOTIATED_MARKDOWN_HEADERS = {
  "Content-Type": MARKDOWN_CONTENT_TYPE,
  "Cache-Control": "private, no-store",
  Vary: "Accept",
};

/** True when proxy.ts rewrote a page request here for `Accept: text/markdown`. */
export function isNegotiatedMarkdown(request: Request): boolean {
  return request.headers.get(NEGOTIATION_HEADER) === "1";
}

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
 * The Cloudflare "Markdown negotiation — never cache" bypass rule also keeps
 * them, and any redirect served to a markdown request, out of the CDN.
 */
export function getMarkdownResponse(
  request: NextRequest,
  path: string,
  isMissing: boolean,
): NextResponse {
  if (isMissing) {
    return new NextResponse(NOT_FOUND_MARKDOWN, {
      status: 404,
      headers: NEGOTIATED_MARKDOWN_HEADERS,
    });
  }

  const rewriteUrl = request.nextUrl.clone();
  rewriteUrl.pathname = path === "/" ? "/index.md" : "/llms.txt";
  const headers = new Headers(request.headers);
  headers.set(NEGOTIATION_HEADER, "1");
  return NextResponse.rewrite(rewriteUrl, { request: { headers } });
}
