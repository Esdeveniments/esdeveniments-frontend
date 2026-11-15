import { describe, expect, it } from "vitest";

import { buildLoginHref, localizePath } from "@utils/i18n-routing";
import { buildAlternateLinks, withLocalePath } from "@utils/i18n-seo";

describe("buildAlternateLinks", () => {
  it("returns hreflang map with localized URLs and x-default", () => {
    const alternates = buildAlternateLinks("https://example.com/foo/bar");

    expect(alternates["ca"]).toMatch(/\/foo\/bar$/);
    expect(alternates["es"]).toMatch(/\/es\/foo\/bar$/);
    expect(alternates["en"]).toMatch(/\/en\/foo\/bar$/);
    expect(alternates["x-default"]).toBe(alternates["ca"]);
  });

  it("handles relative paths safely", () => {
    const alternates = buildAlternateLinks("/baz");

    expect(alternates["ca"]).toMatch(/\/baz$/);
    expect(alternates["es"]).toMatch(/\/es\/baz$/);
    expect(alternates["en"]).toMatch(/\/en\/baz$/);
  });
});

describe("localizePath and withLocalePath", () => {
  it("prefixes town slugs that begin with locale letters (/esparreguera, /encamp)", () => {
    expect(localizePath("/esparreguera", "es")).toBe("/es/esparreguera");
    expect(withLocalePath("/esplugues-de-llobregat", "es")).toBe(
      "/es/esplugues-de-llobregat",
    );
    expect(localizePath("/encamp", "en")).toBe("/en/encamp");
  });

  it("preserves already-localized paths without double-prefixing", () => {
    expect(localizePath("/es", "es")).toBe("/es");
    expect(localizePath("/es?search=fira", "es")).toBe("/es?search=fira");
    expect(localizePath("/es/barcelona", "es")).toBe("/es/barcelona");
    expect(localizePath("/en/barcelona", "es")).toBe("/en/barcelona");
    expect(localizePath("/ca/barcelona", "es")).toBe("/ca/barcelona");
  });

  it("localizes root paths and preserves query/hash suffixes", () => {
    expect(localizePath("/", "es")).toBe("/es");
    expect(localizePath("/?price=gratis", "en")).toBe("/en?price=gratis");
    expect(localizePath("/#main", "es")).toBe("/es#main");
    expect(localizePath("/esparreguera", "ca")).toBe("/esparreguera");
    expect(localizePath("mailto:hola@esdeveniments.cat", "es")).toBe(
      "mailto:hola@esdeveniments.cat",
    );
  });
});

describe("buildLoginHref", () => {
  it("omits ?redirect= on home and /iniciar-sessio across locales", () => {
    expect(buildLoginHref("/", "ca")).toBe("/iniciar-sessio");
    expect(buildLoginHref("/", "es")).toBe("/iniciar-sessio");
    expect(buildLoginHref("/es", "es")).toBe("/iniciar-sessio");
    expect(buildLoginHref("/iniciar-sessio", "en")).toBe("/iniciar-sessio");
    expect(buildLoginHref("/es/iniciar-sessio", "es")).toBe("/iniciar-sessio");
  });

  it("encodes localized return paths including /esparreguera and query strings", () => {
    expect(buildLoginHref("/esparreguera", "es")).toBe(
      "/iniciar-sessio?redirect=%2Fes%2Fesparreguera",
    );
    expect(buildLoginHref("/preferits/passats", "en")).toBe(
      "/iniciar-sessio?redirect=%2Fen%2Fpreferits%2Fpassats",
    );
    expect(buildLoginHref("/perfil/edita?tab=bio", "es")).toBe(
      "/iniciar-sessio?redirect=%2Fes%2Fperfil%2Fedita%3Ftab%3Dbio",
    );
    expect(buildLoginHref("/esparreguera", "ca")).toBe(
      "/iniciar-sessio?redirect=%2Fesparreguera",
    );
  });
});


