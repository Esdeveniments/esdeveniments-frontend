import { describe, expect, it } from "vitest";
import { pickPath } from "../lib/i18n/client-namespaces";

describe("pickPath", () => {
  it("copies the wildcard leaf from every child and nothing else", () => {
    const source = {
      Partials: {
        GeneratePagesData: {
          categories: {
            music: { titleSuffix: "de música", description: "long text" },
            theatre: { titleSuffix: "de teatre", heading: "Teatre" },
            empty: { heading: "No suffix" },
          },
          other: "drop me",
        },
      },
      Sponsorship: { checkout: { pay: "Paga" }, faq: { title: "FAQ" } },
    };
    const target: Record<string, unknown> = {};

    pickPath(source, target, "Partials.GeneratePagesData.categories.*.titleSuffix".split("."));
    pickPath(source, target, "Sponsorship.checkout".split("."));

    expect(target).toEqual({
      Partials: {
        GeneratePagesData: {
          categories: {
            music: { titleSuffix: "de música" },
            theatre: { titleSuffix: "de teatre" },
            empty: {},
          },
        },
      },
      Sponsorship: { checkout: { pay: "Paga" } },
    });
  });

  it("skips paths that do not exist", () => {
    const target: Record<string, unknown> = {};
    pickPath({ A: {} }, target, ["A", "missing"]);
    expect(target).toEqual({ A: {} });
  });
});
