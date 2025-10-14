import { expect } from "@playwright/test";
import { XMLParser } from "fast-xml-parser";

export function parseAndValidateSitemap(xmlText: string) {
  expect(xmlText).toContain("<urlset");

  const parser = new XMLParser();
  const xmlObj = parser.parse(xmlText);

  expect(xmlObj.urlset).toBeDefined();

  const urls = Array.isArray(xmlObj.urlset.url)
    ? xmlObj.urlset.url
    : [xmlObj.urlset.url];

  return urls.filter(Boolean);
}
