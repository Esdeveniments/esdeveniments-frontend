import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import {
  buildNewsPageHref,
  getCanonicalNewsSearch,
  parseNewsPage,
} from "@utils/news-helpers";
import { getNewsPaginationRedirect } from "@utils/proxy-news";

describe("parseNewsPage", () => {
  it.each([
    [{}, 1],
    [{ page: "2" }, 2],
    [{ page: ["3", "4"] }, 3],
    [{ page: "0" }, 1],
    [{ page: "02" }, 1],
    [{ page: "-1" }, 1],
    [{ page: "abc" }, 1],
  ])("%j → %i", (query, expected) => {
    expect(parseNewsPage(query)).toBe(expected);
  });
});

describe("buildNewsPageHref", () => {
  it("drops the query on page 1", () => {
    expect(buildNewsPageHref("/noticies", 1)).toBe("/noticies");
    expect(buildNewsPageHref("/noticies/barcelona", 3)).toBe("/noticies/barcelona?page=3");
  });
});

describe("getCanonicalNewsSearch", () => {
  it.each([
    // Already canonical
    ["", null],
    ["page=2", null],
    ["utm_source=x", null],
    // Old 0-based links always carried size: ?page=1&size=10 was page 2
    ["page=1&size=10", "page=2"],
    ["page=0&size=10", ""],
    ["size=20", ""],
    // Old cities toggle kept the 0-based page
    ["page=2&cities=all", "page=3"],
    ["cities=all", ""],
    // Page 1 and junk go to the bare URL, other params survive
    ["page=1", ""],
    ["page=0", ""],
    ["page=abc", ""],
    ["page=1&utm_source=x", "utm_source=x"],
  ])("%s → %s", (search, expected) => {
    expect(getCanonicalNewsSearch(new URLSearchParams(search))).toBe(expected);
  });
});

describe("getNewsPaginationRedirect", () => {
  const redirectFor = (url: string, path: string) =>
    getNewsPaginationRedirect(new NextRequest(url), path);

  it("301s a legacy place URL, keeping the locale prefix", () => {
    const response = redirectFor(
      "https://www.esdeveniments.cat/es/noticies/barcelona?page=1&size=10",
      "/noticies/barcelona",
    );
    expect(response?.status).toBe(301);
    expect(response?.headers.get("location")).toBe(
      "https://www.esdeveniments.cat/es/noticies/barcelona?page=2",
    );
  });

  it("leaves canonical URLs, articles and feeds alone", () => {
    expect(redirectFor("https://www.esdeveniments.cat/noticies?page=2", "/noticies")).toBeNull();
    expect(
      redirectFor("https://www.esdeveniments.cat/noticies/barcelona/slug?page=1", "/noticies/barcelona/slug"),
    ).toBeNull();
    expect(redirectFor("https://www.esdeveniments.cat/noticies/rss.xml?page=1", "/noticies/rss.xml")).toBeNull();
  });
});
