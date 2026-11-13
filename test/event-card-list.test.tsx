import { describe, it, expect, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import CardServer from "@components/ui/card/CardServer";
import List from "@components/ui/list";
import type { CardLabels } from "types/props";
import type { ListEvent } from "types/api/event";

vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

const labels: CardLabels = {
  locale: "es",
  tCard: (key) => key,
  tCategories: (key) => key,
};

const event = {
  id: "1",
  hash: "h",
  slug: "concert",
  title: "Concert",
  imageUrl: "",
  startDate: "2026-11-20",
  endDate: "2026-11-20",
  location: "Barcelona",
  categories: [],
} as unknown as ListEvent;

describe("server event cards", () => {
  // An async card (or card link) makes React stream every card as its own
  // hidden segment plus an inline `$RS` script. renderToStaticMarkup throws
  // when anything in the tree suspends, so this fails if an await comes back.
  it("render synchronously and link with the list's locale", () => {
    const html = renderToStaticMarkup(<CardServer event={event} labels={labels} />);
    expect(html).toContain('href="/es/e/concert"');
  });

  it("are listed as ul > li", () => {
    const html = renderToStaticMarkup(
      <List events={[event]}>{() => <span>card</span>}</List>,
    );
    expect(html).toMatch(/^<ul[^>]*><li[^>]*><span>card<\/span><\/li><\/ul>$/);
  });
});
