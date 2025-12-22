import { describe, it, expect } from "vitest";
import {
  addPlaceBreadcrumb,
  addIntermediateDateBreadcrumb,
  addCurrentPageBreadcrumb,
  handleCatalunyaHomepage,
  updatePlaceBreadcrumbUrl,
} from "@utils/breadcrumb-helpers";
import type { BreadcrumbItem } from "types/common";
import type { AppLocale } from "types/i18n";
import { siteUrl } from "@config/index";

describe("breadcrumb-helpers", () => {
  describe("addPlaceBreadcrumb", () => {
    it("adds place breadcrumb when place is not catalunya", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
      ];
      const locale: AppLocale = "ca";

      addPlaceBreadcrumb(breadcrumbs, "barcelona", "Barcelona", locale);

      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[1]).toEqual({
        name: "Barcelona",
        url: `${siteUrl}/barcelona`,
      });
    });

    it("uses place slug as name when placeLabel is empty", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
      ];
      const locale: AppLocale = "ca";

      addPlaceBreadcrumb(breadcrumbs, "mataro", "", locale);

      expect(breadcrumbs[1].name).toBe("mataro");
    });

    it("does not add breadcrumb when place is catalunya", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
      ];
      const locale: AppLocale = "ca";

      addPlaceBreadcrumb(breadcrumbs, "catalunya", "Catalunya", locale);

      expect(breadcrumbs).toHaveLength(1);
    });

    it("handles different locales correctly", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
      ];

      addPlaceBreadcrumb(breadcrumbs, "barcelona", "Barcelona", "es");
      expect(breadcrumbs[1].url).toBe(`${siteUrl}/es/barcelona`);

      const breadcrumbsEn: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
      ];
      addPlaceBreadcrumb(breadcrumbsEn, "barcelona", "Barcelona", "en");
      expect(breadcrumbsEn[1].url).toBe(`${siteUrl}/en/barcelona`);
    });
  });

  describe("addIntermediateDateBreadcrumb", () => {
    it("adds intermediate date breadcrumb with correct path", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
        { name: "Barcelona", url: "/barcelona" },
      ];
      const locale: AppLocale = "ca";

      addIntermediateDateBreadcrumb(
        breadcrumbs,
        "barcelona",
        "avui",
        "Avui",
        locale
      );

      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[2]).toEqual({
        name: "Avui",
        url: `${siteUrl}/barcelona/avui`,
      });
    });

    it("uses date slug as name when dateLabel is undefined", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
        { name: "Barcelona", url: "/barcelona" },
      ];
      const locale: AppLocale = "ca";

      addIntermediateDateBreadcrumb(
        breadcrumbs,
        "barcelona",
        "dema",
        undefined,
        locale
      );

      expect(breadcrumbs[2].name).toBe("dema");
    });

    it("handles empty place correctly", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
      ];
      const locale: AppLocale = "ca";

      addIntermediateDateBreadcrumb(
        breadcrumbs,
        "",
        "avui",
        "Avui",
        locale
      );

      expect(breadcrumbs[1].url).toBe(`${siteUrl}/avui`);
    });

    it("handles different locales correctly", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
        { name: "Barcelona", url: "/barcelona" },
      ];

      addIntermediateDateBreadcrumb(
        breadcrumbs,
        "barcelona",
        "avui",
        "Avui",
        "es"
      );

      expect(breadcrumbs[2].url).toBe(`${siteUrl}/es/barcelona/avui`);
    });

    it("includes catalunya in path for intermediate date breadcrumb (not homepage)", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
      ];
      const locale: AppLocale = "ca";

      // Even though catalunya is treated specially for homepage breadcrumbs,
      // filtered pages (date + category) should include catalunya in the URL path
      addIntermediateDateBreadcrumb(
        breadcrumbs,
        "catalunya",
        "avui",
        "Avui",
        locale
      );

      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[1]).toEqual({
        name: "Avui",
        url: `${siteUrl}/catalunya/avui`, // Must include catalunya, not just /avui
      });
    });
  });

  describe("addCurrentPageBreadcrumb", () => {
    it("adds date breadcrumb when only date is specified", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
        { name: "Barcelona", url: "/barcelona" },
      ];

      addCurrentPageBreadcrumb(
        breadcrumbs,
        true, // hasSpecificDate
        false, // hasSpecificCategory
        "avui",
        "Avui",
        undefined,
        undefined,
        "/barcelona/avui"
      );

      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[2]).toEqual({
        name: "Avui",
        url: "/barcelona/avui",
      });
    });

    it("uses date slug when dateLabel is undefined", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
        { name: "Barcelona", url: "/barcelona" },
      ];

      addCurrentPageBreadcrumb(
        breadcrumbs,
        true,
        false,
        "dema",
        undefined,
        undefined,
        undefined,
        "/barcelona/dema"
      );

      expect(breadcrumbs[2].name).toBe("dema");
    });

    it("adds category breadcrumb when category is specified", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
        { name: "Barcelona", url: "/barcelona" },
      ];

      addCurrentPageBreadcrumb(
        breadcrumbs,
        false,
        true,
        undefined,
        undefined,
        "musica",
        "Música",
        "/barcelona/musica"
      );

      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[2]).toEqual({
        name: "Música",
        url: "/barcelona/musica",
      });
    });

    it("adds category breadcrumb when both date and category are specified", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
        { name: "Barcelona", url: "/barcelona" },
        { name: "Avui", url: "/barcelona/avui" },
      ];

      addCurrentPageBreadcrumb(
        breadcrumbs,
        true,
        true,
        "avui",
        "Avui",
        "musica",
        "Música",
        "/barcelona/avui/musica"
      );

      expect(breadcrumbs).toHaveLength(4);
      expect(breadcrumbs[3]).toEqual({
        name: "Música",
        url: "/barcelona/avui/musica",
      });
    });

    it("uses category slug when categoryLabel is undefined", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
        { name: "Barcelona", url: "/barcelona" },
      ];

      addCurrentPageBreadcrumb(
        breadcrumbs,
        false,
        true,
        undefined,
        undefined,
        "teatre",
        undefined,
        "/barcelona/teatre"
      );

      expect(breadcrumbs[2].name).toBe("teatre");
    });

    it("does not add breadcrumb when neither date nor category is specified", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
        { name: "Barcelona", url: "/barcelona" },
      ];

      addCurrentPageBreadcrumb(
        breadcrumbs,
        false,
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        "/barcelona"
      );

      expect(breadcrumbs).toHaveLength(2);
    });
  });

  describe("handleCatalunyaHomepage", () => {
    it("updates the home breadcrumb URL to current URL", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Inici", url: "/" },
      ];

      handleCatalunyaHomepage(breadcrumbs, "Inici", "/catalunya");

      expect(breadcrumbs[0]).toEqual({
        name: "Inici",
        url: "/catalunya",
      });
    });

    it("preserves the home label", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
      ];

      handleCatalunyaHomepage(breadcrumbs, "Home", "/catalunya");

      expect(breadcrumbs[0].name).toBe("Home");
    });

    it("handles different home labels correctly", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Inicio", url: "/" },
      ];

      handleCatalunyaHomepage(breadcrumbs, "Inicio", "/catalunya");

      expect(breadcrumbs[0].name).toBe("Inicio");
    });
  });

  describe("updatePlaceBreadcrumbUrl", () => {
    it("updates the last breadcrumb URL to current URL", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
        { name: "Barcelona", url: "/barcelona" },
      ];

      updatePlaceBreadcrumbUrl(breadcrumbs, "/barcelona?filter=active");

      expect(breadcrumbs[1].url).toBe("/barcelona?filter=active");
      expect(breadcrumbs[1].name).toBe("Barcelona");
    });

    it("preserves all other breadcrumb properties", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
        { name: "Mataró", url: "/mataro" },
      ];

      updatePlaceBreadcrumbUrl(breadcrumbs, "/mataro");

      expect(breadcrumbs[0]).toEqual({ name: "Home", url: "/" });
      expect(breadcrumbs[1].name).toBe("Mataró");
    });

    it("handles single breadcrumb in array", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
      ];

      updatePlaceBreadcrumbUrl(breadcrumbs, "/home");

      expect(breadcrumbs[0].url).toBe("/home");
    });

    it("handles multiple breadcrumbs correctly", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
        { name: "Barcelona", url: "/barcelona" },
        { name: "Avui", url: "/barcelona/avui" },
      ];

      updatePlaceBreadcrumbUrl(breadcrumbs, "/barcelona/avui?updated=true");

      expect(breadcrumbs[0].url).toBe("/");
      expect(breadcrumbs[1].url).toBe("/barcelona");
      expect(breadcrumbs[2].url).toBe("/barcelona/avui?updated=true");
    });
  });

  describe("integration scenarios", () => {
    it("builds correct breadcrumbs for place + date scenario", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
      ];
      const locale: AppLocale = "ca";

      addPlaceBreadcrumb(breadcrumbs, "barcelona", "Barcelona", locale);
      addCurrentPageBreadcrumb(
        breadcrumbs,
        true,
        false,
        "avui",
        "Avui",
        undefined,
        undefined,
        "/barcelona/avui"
      );

      expect(breadcrumbs).toHaveLength(3);
      expect(breadcrumbs[0].name).toBe("Home");
      expect(breadcrumbs[1].name).toBe("Barcelona");
      expect(breadcrumbs[2]).toEqual({ name: "Avui", url: "/barcelona/avui" });
    });

    it("builds correct breadcrumbs for place + date + category scenario", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
      ];
      const locale: AppLocale = "ca";

      addPlaceBreadcrumb(breadcrumbs, "barcelona", "Barcelona", locale);
      addIntermediateDateBreadcrumb(
        breadcrumbs,
        "barcelona",
        "avui",
        "Avui",
        locale
      );
      addCurrentPageBreadcrumb(
        breadcrumbs,
        true,
        true,
        "avui",
        "Avui",
        "musica",
        "Música",
        "/barcelona/avui/musica"
      );

      expect(breadcrumbs).toHaveLength(4);
      expect(breadcrumbs[0].name).toBe("Home");
      expect(breadcrumbs[1].name).toBe("Barcelona");
      expect(breadcrumbs[2]).toEqual({ name: "Avui", url: `${siteUrl}/barcelona/avui` });
      expect(breadcrumbs[3]).toEqual({
        name: "Música",
        url: "/barcelona/avui/musica",
      });
    });

    it("handles catalunya homepage scenario correctly", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Inici", url: "/" },
      ];
      const locale: AppLocale = "ca";

      // Should not add place breadcrumb for catalunya
      addPlaceBreadcrumb(breadcrumbs, "catalunya", "Catalunya", locale);
      handleCatalunyaHomepage(breadcrumbs, "Inici", "/catalunya");

      expect(breadcrumbs).toHaveLength(1);
      expect(breadcrumbs[0]).toEqual({ name: "Inici", url: "/catalunya" });
    });

    it("handles place-only scenario correctly", () => {
      const breadcrumbs: BreadcrumbItem[] = [
        { name: "Home", url: "/" },
      ];
      const locale: AppLocale = "ca";

      addPlaceBreadcrumb(breadcrumbs, "mataro", "Mataró", locale);
      updatePlaceBreadcrumbUrl(breadcrumbs, "/mataro");

      expect(breadcrumbs).toHaveLength(2);
      expect(breadcrumbs[0].name).toBe("Home");
      expect(breadcrumbs[1]).toEqual({ name: "Mataró", url: "/mataro" });
    });
  });

  describe("edge cases", () => {
    describe("addPlaceBreadcrumb edge cases", () => {
      it("handles empty place string", () => {
        const breadcrumbs: BreadcrumbItem[] = [
          { name: "Home", url: "/" },
        ];
        const locale: AppLocale = "ca";

        addPlaceBreadcrumb(breadcrumbs, "", "Empty Place", locale);

        expect(breadcrumbs).toHaveLength(2);
        expect(breadcrumbs[1].name).toBe("Empty Place");
      });

      it("handles whitespace-only placeLabel (uses whitespace as-is)", () => {
        const breadcrumbs: BreadcrumbItem[] = [
          { name: "Home", url: "/" },
        ];
        const locale: AppLocale = "ca";

        addPlaceBreadcrumb(breadcrumbs, "barcelona", "   ", locale);

        // Note: || operator treats whitespace as truthy, so it uses the whitespace
        expect(breadcrumbs[1].name).toBe("   ");
      });
    });

    describe("addIntermediateDateBreadcrumb edge cases", () => {
      it("handles empty date string", () => {
        const breadcrumbs: BreadcrumbItem[] = [
          { name: "Home", url: "/" },
        ];
        const locale: AppLocale = "ca";

        addIntermediateDateBreadcrumb(
          breadcrumbs,
          "barcelona",
          "",
          "Empty Date",
          locale
        );

        expect(breadcrumbs[1].name).toBe("Empty Date");
        expect(breadcrumbs[1].url).toContain("/barcelona");
      });

      it("handles both place and date as empty strings", () => {
        const breadcrumbs: BreadcrumbItem[] = [
          { name: "Home", url: "/" },
        ];
        const locale: AppLocale = "ca";

        addIntermediateDateBreadcrumb(
          breadcrumbs,
          "",
          "",
          undefined,
          locale
        );

        expect(breadcrumbs[1].name).toBe("");
        expect(breadcrumbs[1].url).toBeDefined();
      });
    });

    describe("addCurrentPageBreadcrumb edge cases", () => {
      it("handles hasSpecificDate=true but date is undefined", () => {
        const breadcrumbs: BreadcrumbItem[] = [
          { name: "Home", url: "/" },
        ];

        addCurrentPageBreadcrumb(
          breadcrumbs,
          true,
          false,
          undefined, // date is undefined
          undefined,
          undefined,
          undefined,
          "/barcelona/avui"
        );

        // Should still add breadcrumb but with empty name
        expect(breadcrumbs).toHaveLength(2);
        expect(breadcrumbs[1].url).toBe("/barcelona/avui");
      });

      it("handles hasSpecificCategory=true but category is undefined", () => {
        const breadcrumbs: BreadcrumbItem[] = [
          { name: "Home", url: "/" },
        ];

        addCurrentPageBreadcrumb(
          breadcrumbs,
          false,
          true,
          undefined,
          undefined,
          undefined, // category is undefined
          undefined,
          "/barcelona/musica"
        );

        // Should still add breadcrumb but with empty name
        expect(breadcrumbs).toHaveLength(2);
        expect(breadcrumbs[1].url).toBe("/barcelona/musica");
      });

      it("handles empty currentUrl", () => {
        const breadcrumbs: BreadcrumbItem[] = [
          { name: "Home", url: "/" },
        ];

        addCurrentPageBreadcrumb(
          breadcrumbs,
          true,
          false,
          "avui",
          "Avui",
          undefined,
          undefined,
          "" // empty URL
        );

        expect(breadcrumbs[1].url).toBe("");
      });

      it("handles empty date and category strings", () => {
        const breadcrumbs: BreadcrumbItem[] = [
          { name: "Home", url: "/" },
        ];

        addCurrentPageBreadcrumb(
          breadcrumbs,
          true,
          false,
          "", // empty string
          "",
          undefined,
          undefined,
          "/barcelona"
        );

        expect(breadcrumbs[1].name).toBe(""); // Falls back to empty date
        expect(breadcrumbs[1].url).toBe("/barcelona");
      });
    });

    describe("handleCatalunyaHomepage edge cases", () => {
      it("handles empty breadcrumbs array", () => {
        const breadcrumbs: BreadcrumbItem[] = [];

        // This should not throw, but will set breadcrumbs[0]
        handleCatalunyaHomepage(breadcrumbs, "Home", "/catalunya");

        expect(breadcrumbs).toHaveLength(1);
        expect(breadcrumbs[0]).toEqual({ name: "Home", url: "/catalunya" });
      });

      it("handles empty homeLabel", () => {
        const breadcrumbs: BreadcrumbItem[] = [
          { name: "Home", url: "/" },
        ];

        handleCatalunyaHomepage(breadcrumbs, "", "/catalunya");

        expect(breadcrumbs[0].name).toBe("");
        expect(breadcrumbs[0].url).toBe("/catalunya");
      });

      it("handles empty currentUrl", () => {
        const breadcrumbs: BreadcrumbItem[] = [
          { name: "Home", url: "/" },
        ];

        handleCatalunyaHomepage(breadcrumbs, "Home", "");

        expect(breadcrumbs[0].url).toBe("");
      });
    });

    describe("updatePlaceBreadcrumbUrl edge cases", () => {
      it("handles empty breadcrumbs array", () => {
        const breadcrumbs: BreadcrumbItem[] = [];

        // This should not throw, but will try to set breadcrumbs[-1]
        updatePlaceBreadcrumbUrl(breadcrumbs, "/barcelona");

        // Array remains empty, but no error thrown
        expect(breadcrumbs).toHaveLength(0);
      });

      it("handles empty currentUrl", () => {
        const breadcrumbs: BreadcrumbItem[] = [
          { name: "Home", url: "/" },
          { name: "Barcelona", url: "/barcelona" },
        ];

        updatePlaceBreadcrumbUrl(breadcrumbs, "");

        expect(breadcrumbs[1].url).toBe("");
      });

      it("preserves existing properties when updating URL", () => {
        const breadcrumbs: BreadcrumbItem[] = [
          { name: "Home", url: "/" },
          { name: "Barcelona", url: "/barcelona" },
        ];

        updatePlaceBreadcrumbUrl(breadcrumbs, "/barcelona?updated=true");

        expect(breadcrumbs[1].name).toBe("Barcelona");
        expect(breadcrumbs[1].url).toBe("/barcelona?updated=true");
      });
    });

    describe("multiple function calls", () => {
      it("handles calling addPlaceBreadcrumb multiple times", () => {
        const breadcrumbs: BreadcrumbItem[] = [
          { name: "Home", url: "/" },
        ];
        const locale: AppLocale = "ca";

        addPlaceBreadcrumb(breadcrumbs, "barcelona", "Barcelona", locale);
        addPlaceBreadcrumb(breadcrumbs, "mataro", "Mataró", locale);

        expect(breadcrumbs).toHaveLength(3);
        expect(breadcrumbs[1].name).toBe("Barcelona");
        expect(breadcrumbs[2].name).toBe("Mataró");
      });

      it("handles calling addCurrentPageBreadcrumb multiple times", () => {
        const breadcrumbs: BreadcrumbItem[] = [
          { name: "Home", url: "/" },
        ];

        addCurrentPageBreadcrumb(
          breadcrumbs,
          true,
          false,
          "avui",
          "Avui",
          undefined,
          undefined,
          "/barcelona/avui"
        );
        addCurrentPageBreadcrumb(
          breadcrumbs,
          false,
          true,
          undefined,
          undefined,
          "musica",
          "Música",
          "/barcelona/musica"
        );

        // Both should be added
        expect(breadcrumbs).toHaveLength(3);
        expect(breadcrumbs[1].name).toBe("Avui");
        expect(breadcrumbs[2].name).toBe("Música");
      });
    });

    describe("special character handling", () => {
      it("handles place names with special characters", () => {
        const breadcrumbs: BreadcrumbItem[] = [
          { name: "Home", url: "/" },
        ];
        const locale: AppLocale = "ca";

        addPlaceBreadcrumb(
          breadcrumbs,
          "sant-cugat-del-valles",
          "Sant Cugat del Vallès",
          locale
        );

        expect(breadcrumbs[1].name).toBe("Sant Cugat del Vallès");
        expect(breadcrumbs[1].url).toContain("sant-cugat-del-valles");
      });

      it("handles URLs with query parameters and fragments", () => {
        const breadcrumbs: BreadcrumbItem[] = [
          { name: "Home", url: "/" },
        ];

        addCurrentPageBreadcrumb(
          breadcrumbs,
          true,
          false,
          "avui",
          "Avui",
          undefined,
          undefined,
          "/barcelona/avui?filter=active&sort=date#section"
        );

        expect(breadcrumbs[1].url).toBe(
          "/barcelona/avui?filter=active&sort=date#section"
        );
      });
    });
  });
});

