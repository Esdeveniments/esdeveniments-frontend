import { describe, it, expect, vi } from "vitest";
import type { ReactElement } from "react";

vi.mock("next/cache", () => ({ cacheLife: vi.fn() }));

import Footer from "components/ui/common/footer";
import { Link } from "@i18n/routing";
import ActiveLink from "@components/ui/common/link";
import PressableAnchorClient from "@components/ui/primitives/PressableAnchorClient";
import { buildTopAgendaLinks } from "@config/top-agenda-links";

function collectByHref(node: unknown): ReactElement[] {
  const found: ReactElement[] = [];
  const visit = (x: unknown) => {
    if (!x || typeof x !== "object") return;
    if (Array.isArray(x)) {
      x.forEach(visit);
      return;
    }
    const el = x as ReactElement<{ href?: string; children?: unknown }>;
    if (typeof el.props?.href === "string") found.push(el);
    visit(el.props?.children);
  };
  visit(node);
  return found;
}

describe("Footer", () => {
  it("renders internal links with the i18n Link straight from the server tree", async () => {
    const links = collectByHref(await Footer());
    const internal = links.filter((el) =>
      (el.props as { href: string }).href.startsWith("/"),
    );

    expect(internal.length).toBeGreaterThanOrEqual(25);
    for (const el of internal) {
      expect(el.type).toBe(Link);
      expect(el.type).not.toBe(ActiveLink);
      expect(el.type).not.toBe(PressableAnchorClient);
      expect(el.props).toMatchObject({
        prefetch: false,
        "data-pressable-link": "inline",
      });
    }
  });

  it("contracts the article in the featured agenda labels", async () => {
    const masnou = collectByHref(await Footer()).find(
      (el) => (el.props as { href: string }).href === "/el-masnou",
    );
    expect(masnou?.props).toMatchObject({ children: "Agenda del Masnou" });
  });

  it("keeps the bare town name for the home chips", () => {
    const masnou = buildTopAgendaLinks((placeOf) => `Agenda ${placeOf}`, "ca").find(
      (link) => link.href === "/el-masnou"
    );
    expect(masnou).toEqual({
      href: "/el-masnou",
      shortLabel: "El Masnou",
      label: "Agenda del Masnou",
    });
  });

  it("keeps the analytics hook on the login link", async () => {
    const login = collectByHref(await Footer()).find(
      (el) => (el.props as { href: string }).href === "/iniciar-sessio",
    );
    expect(login?.props).toMatchObject({
      "data-analytics-action": "footer_login",
    });
  });
});
