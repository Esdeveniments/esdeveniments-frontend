import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "../../app/sitemap.xml/route";
import { NextRequest } from "next/server";
import { XMLParser } from "fast-xml-parser";

const originalEnv = { ...process.env };

// Mock the config module
vi.mock("../../config/index", async () => {
  const actual = await vi.importActual("../../config/index");
  return {
    ...actual,
    getSiteUrlFromRequest: vi.fn(),
  };
});

describe("app/sitemap.xml/route", () => {
  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("returns valid sitemap index XML", async () => {
    const { getSiteUrlFromRequest } = await import("../../config/index");
    vi.mocked(getSiteUrlFromRequest).mockReturnValue(
      "https://www.esdeveniments.cat"
    );

    const mockRequest = {
      nextUrl: {
        protocol: "https:",
        host: "www.esdeveniments.cat",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await GET(mockRequest);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/xml; charset=utf-8"
    );

    const text = await response.text();
    expect(text).toMatch(/<sitemapindex/);
    expect(text).toContain("https://www.esdeveniments.cat");
  });

  it("includes all expected sitemap URLs", async () => {
    const { getSiteUrlFromRequest } = await import("../../config/index");
    vi.mocked(getSiteUrlFromRequest).mockReturnValue(
      "https://www.esdeveniments.cat"
    );

    const mockRequest = {
      nextUrl: {
        protocol: "https:",
        host: "www.esdeveniments.cat",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await GET(mockRequest);
    const text = await response.text();

    expect(text).toContain("/sitemap-0.xml");
    expect(text).toContain("/server-sitemap.xml");
    expect(text).toContain("/server-news-sitemap.xml");
    expect(text).toContain("/server-place-sitemap.xml");
    expect(text).toContain("/server-google-news-sitemap.xml");
  });

  it("does not include self-reference to /sitemap.xml", async () => {
    const { getSiteUrlFromRequest } = await import("../../config/index");
    vi.mocked(getSiteUrlFromRequest).mockReturnValue(
      "https://www.esdeveniments.cat"
    );

    const mockRequest = {
      nextUrl: {
        protocol: "https:",
        host: "www.esdeveniments.cat",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await GET(mockRequest);
    const text = await response.text();

    // Parse XML to verify structure
    const parser = new XMLParser();
    const xmlObj = parser.parse(text);

    expect(xmlObj.sitemapindex).toBeDefined();
    const sitemaps = Array.isArray(xmlObj.sitemapindex.sitemap)
      ? xmlObj.sitemapindex.sitemap
      : [xmlObj.sitemapindex.sitemap];

    const locs = sitemaps.map((s: { loc: string }) => s.loc);
    expect(locs).not.toContain(
      expect.stringContaining("/sitemap.xml")
    );
  });

  it("uses correct site URL from request", async () => {
    const { getSiteUrlFromRequest } = await import("../../config/index");
    vi.mocked(getSiteUrlFromRequest).mockReturnValue(
      "https://preview-abc.vercel.app"
    );

    const mockRequest = {
      nextUrl: {
        protocol: "https:",
        host: "preview-abc.vercel.app",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await GET(mockRequest);
    const text = await response.text();

    expect(text).toContain("https://preview-abc.vercel.app");
    expect(getSiteUrlFromRequest).toHaveBeenCalledWith(mockRequest);
  });

  it("sets correct cache headers", async () => {
    const { getSiteUrlFromRequest } = await import("../../config/index");
    vi.mocked(getSiteUrlFromRequest).mockReturnValue(
      "https://www.esdeveniments.cat"
    );

    const mockRequest = {
      nextUrl: {
        protocol: "https:",
        host: "www.esdeveniments.cat",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await GET(mockRequest);

    expect(response.headers.get("Cache-Control")).toBe(
      "public, s-maxage=600, stale-while-revalidate=86400"
    );
  });

  it("handles localhost URLs correctly", async () => {
    const { getSiteUrlFromRequest } = await import("../../config/index");
    vi.mocked(getSiteUrlFromRequest).mockReturnValue("http://localhost:3000");

    const mockRequest = {
      nextUrl: {
        protocol: "http:",
        host: "localhost:3000",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await GET(mockRequest);
    const text = await response.text();

    expect(text).toContain("http://localhost:3000");
  });

  it("generates valid XML structure", async () => {
    const { getSiteUrlFromRequest } = await import("../../config/index");
    vi.mocked(getSiteUrlFromRequest).mockReturnValue(
      "https://www.esdeveniments.cat"
    );

    const mockRequest = {
      nextUrl: {
        protocol: "https:",
        host: "www.esdeveniments.cat",
      },
      headers: new Headers(),
    } as unknown as NextRequest;

    const response = await GET(mockRequest);
    const text = await response.text();

    // Verify XML structure
    expect(text).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
    expect(text).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(text).toContain("</sitemapindex>");

    // Parse to ensure it's valid XML
    const parser = new XMLParser();
    const xmlObj = parser.parse(text);
    expect(xmlObj.sitemapindex).toBeDefined();
    expect(xmlObj.sitemapindex.sitemap).toBeDefined();
  });
});

