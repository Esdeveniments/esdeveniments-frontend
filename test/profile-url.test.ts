import { describe, it, expect } from "vitest";
import { toLocalizedUrl } from "../utils/i18n-seo";

describe("Profile URL construction", () => {
  it("generates canonical profile URL", () => {
    const url = toLocalizedUrl("/perfil/razzmatazz", "ca");
    expect(url).toContain("/perfil/razzmatazz");
    expect(url).not.toContain("?");
  });

  it("generates localized profile URLs", () => {
    const caUrl = toLocalizedUrl("/perfil/razzmatazz", "ca");
    const esUrl = toLocalizedUrl("/perfil/razzmatazz", "es");
    const enUrl = toLocalizedUrl("/perfil/razzmatazz", "en");

    expect(caUrl).toContain("/perfil/razzmatazz");
    expect(esUrl).toContain("/es/perfil/razzmatazz");
    expect(enUrl).toContain("/en/perfil/razzmatazz");
  });
});
