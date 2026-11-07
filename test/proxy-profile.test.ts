import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { stripLocalePrefix } from "@utils/i18n-routing";
import { getProfileCaseRedirect } from "@utils/proxy-profile";

const redirectFor = (path: string) => {
  const request = new NextRequest(`https://www.esdeveniments.cat${path}`);
  const { pathnameWithoutLocale } = stripLocalePrefix(request.nextUrl.pathname);
  return getProfileCaseRedirect(request, pathnameWithoutLocale);
};

describe("getProfileCaseRedirect", () => {
  it.each([
    ["/perfil/BegudesAmbClasse", "/perfil/begudesambclasse"],
    ["/es/perfil/Ajuntament-Cardedeu/passats", "/es/perfil/ajuntament-cardedeu/passats"],
    ["/en/perfil/ABC?utm_source=x", "/en/perfil/abc?utm_source=x"],
  ])("%s → %s (301)", (from, to) => {
    const response = redirectFor(from);
    expect(response?.status).toBe(301);
    const location = new URL(response!.headers.get("location")!);
    expect(location.pathname + location.search).toBe(to);
  });

  it.each([
    "/perfil/begudesambclasse",
    "/perfil/edita",
    "/es/perfil/abc/passats",
    "/perfil/Foo/other",
    "/perfil/Foo--Bar",
    "/perfil/Caf%C3%A9",
    "/Barcelona",
  ])("leaves %s alone", (path) => {
    expect(redirectFor(path)).toBeNull();
  });
});
