import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { SWRConfig } from "swr";
import Search from "@components/ui/search";
import { renderWithProviders } from "./utils/renderWithProviders";
import type { UserSearchResultDTO } from "types/api/user";

const h = vi.hoisted(() => ({
  profilesEnabled: false,
  push: vi.fn(),
  selectGA: vi.fn(),
  outcomeGA: vi.fn(),
}));

vi.mock("@config/search", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@config/search")>();
  return {
    ...actual,
    get PROFILE_SEARCH_ENABLED() {
      return h.profilesEnabled;
    },
  };
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/",
  useRouter: () => ({ push: h.push }),
}));

vi.mock("@i18n/routing", () => ({
  useRouter: () => ({ push: h.push }),
  usePathname: () => "/",
}));

vi.mock("@utils/analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/analytics")>()),
  sendGoogleEvent: vi.fn(),
  sendSuggestionSelectGA: h.selectGA,
  sendSearchOutcomeGA: h.outcomeGA,
}));

vi.mock("@components/hooks/useGetRegionsWithCities", () => ({
  useGetRegionsWithCities: (enabled: boolean) => ({
    regionsWithCities: enabled
      ? [
          {
            id: 1,
            name: "Vallès Oriental",
            slug: "valles-oriental",
            cities: [
              { id: 10, label: "Cardedeu", value: "cardedeu" },
              { id: 11, label: "Castellcir", value: "castellcir" },
            ],
          },
        ]
      : undefined,
  }),
}));

// Render the popup directly instead of through next/dynamic.
vi.mock("@components/ui/search/SearchSuggestionsLazy", async () => ({
  default: (await import("@components/ui/search/SearchSuggestions")).default,
  preloadSearchSuggestions: vi.fn(),
}));

const profile = (username: string): UserSearchResultDTO => ({
  username,
  displayName: username === "begudes" ? "Begudes amb Classe" : null,
  avatarUrl: null,
  verified: true,
  role: "ORGANIZATION",
  upcomingEventCount: 3,
});

function setup() {
  const { unmount } = renderWithProviders(
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <Search />
    </SWRConfig>,
  );
  const input = screen.getByRole("combobox");
  const type = (value: string) => {
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value } });
  };
  const key = (k: string, init: KeyboardEventInit = {}) =>
    fireEvent.keyDown(input, { key: k, ...init });
  const options = () => screen.queryAllByRole("option");
  return { input, type, key, options, unmount };
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  h.profilesEnabled = false;
  h.push.mockReset();
  h.selectGA.mockReset();
  h.outcomeGA.mockReset();
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("search suggestions (profiles off)", () => {
  it("suggests a place for its exact name and for one typo, after the text option", () => {
    const { input, type, options } = setup();
    type("Cardedeu");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(options().map((o) => o.textContent)).toEqual([
      "Cerca esdeveniments «Cardedeu»",
      "Cardedeu, lloc",
    ]);

    type("Csrdedeu");
    expect(options()[1]).toHaveTextContent("Cardedeu");
  });

  it("never requests profiles while the flag is off", async () => {
    const { type } = setup();
    type("begudes amb classe");
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.queryByText("Cercant perfils…")).not.toBeInTheDocument();
  });

  it("keeps Enter a text search when no option is active", () => {
    const { type, key } = setup();
    type("Castell");
    key("Enter");
    expect(h.push).toHaveBeenCalledWith("/catalunya?search=Castell");
    expect(h.selectGA).not.toHaveBeenCalled();
  });

  it("moves through options with the arrows, looping, and opens the active one", () => {
    const { input, type, key, options } = setup();
    type("Cardedeu");
    const idOf = (i: number) => options()[i].id;

    key("ArrowUp");
    expect(input).toHaveAttribute("aria-activedescendant", idOf(1));
    key("ArrowDown");
    expect(input).toHaveAttribute("aria-activedescendant", idOf(0));
    key("ArrowDown");
    expect(options()[1]).toHaveAttribute("aria-selected", "true");

    key("Enter");
    expect(h.push).toHaveBeenCalledWith("/cardedeu");
    expect(h.selectGA).toHaveBeenCalledWith("search", "place", 2, 8);
    expect(h.outcomeGA).toHaveBeenCalledWith("search", "place");
    expect(input).toHaveValue("");
  });

  it("ignores keys while an IME is composing", () => {
    const { type, key } = setup();
    type("Cardedeu");
    key("ArrowDown", { isComposing: true });
    key("Enter", { isComposing: true });
    key("Enter", { keyCode: 229 });
    key("Escape", { isComposing: true });
    expect(h.push).not.toHaveBeenCalled();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
  });

  it("closes on the first Esc and clears the text on the second, without navigating", () => {
    const { input, type, key } = setup();
    type("Castell");
    key("Escape");
    expect(input).toHaveAttribute("aria-expanded", "false");
    key("Escape");
    expect(input).toHaveValue("");
    expect(h.push).not.toHaveBeenCalled();
  });

  it("closes on a pointerdown outside, but not inside the search bar", () => {
    const { input, type } = setup();
    type("Castell");
    fireEvent.pointerDown(screen.getByTestId("search-bar"));
    expect(input).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerDown(document.body);
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("reports abandoned once when the user leaves after seeing the list", () => {
    const { type, key, unmount } = setup();
    type("Castell");
    key("Escape");
    fireEvent.pointerDown(document.body);
    expect(h.outcomeGA).not.toHaveBeenCalled();
    unmount();
    expect(h.outcomeGA).toHaveBeenCalledTimes(1);
    expect(h.outcomeGA).toHaveBeenCalledWith("search", "abandoned");
  });

  it("doesn't report abandoned for a search submitted after closing the list", () => {
    const { type, key, unmount } = setup();
    type("Castell");
    key("Escape");
    key("Enter");
    unmount();
    expect(h.outcomeGA).not.toHaveBeenCalledWith("search", "abandoned");
  });

  it("closes without an abandoned outcome when the tap submits the same search", () => {
    const { input, type, unmount } = setup();
    const cta = document.createElement("button");
    cta.setAttribute("data-search-submit", "");
    document.body.append(cta);
    type("Castell");
    fireEvent.pointerDown(cta);
    expect(input).toHaveAttribute("aria-expanded", "false");
    unmount();
    expect(h.outcomeGA).not.toHaveBeenCalled();
    cta.remove();
  });

  it("keeps focus in the input on mousedown and opens the clicked option", () => {
    const { type, options } = setup();
    type("Cardedeu");
    const place = options()[1];
    expect(fireEvent.mouseDown(place)).toBe(false);
    fireEvent.click(place);
    expect(h.push).toHaveBeenCalledWith("/cardedeu");
  });

  it("picking the text option searches the text even when it names a place", () => {
    const { type, key } = setup();
    type("Cardedeu");
    key("ArrowDown");
    key("Enter");
    expect(h.push).toHaveBeenCalledWith("/catalunya?search=Cardedeu");
    expect(h.selectGA).toHaveBeenCalledWith("search", "events", 1, 8);
  });
});

describe("search suggestions (profiles on)", () => {
  type Deferred = { resolve: (rows: UserSearchResultDTO[]) => void };
  let pending: Map<string, Deferred>;

  beforeEach(() => {
    h.profilesEnabled = true;
    pending = new Map();
    fetchMock.mockImplementation((url: string) => {
      const q = new URL(url, "http://x").searchParams.get("q") ?? "";
      return new Promise((resolve) => {
        pending.set(q, {
          resolve: (rows) => resolve(new Response(JSON.stringify(rows))),
        });
      });
    });
  });

  it("requests the folded query and opens a picked profile", async () => {
    const { type, key, options } = setup();
    type("Bégudes");
    await waitFor(() => expect(pending.has("begudes")).toBe(true));
    expect(fetchMock.mock.calls[0][0]).toBe("/api/users?q=begudes&size=5");
    expect(screen.getByText("Cercant perfils…")).toBeInTheDocument();

    await act(async () => pending.get("begudes")!.resolve([profile("begudes")]));
    expect(await screen.findByRole("group", { name: "Perfils de tot Catalunya" })).toBeInTheDocument();
    expect(options()[1]).toHaveTextContent("Begudes amb Classe");
    expect(options()[1]).toHaveTextContent("3 esdeveniments propers");
    expect(options()[1]).toHaveTextContent(", perfil");

    key("ArrowUp");
    key("Enter");
    expect(h.push).toHaveBeenCalledWith("/perfil/begudes");
    expect(h.outcomeGA).toHaveBeenCalledWith("search", "profile");
  });

  it("never shows a late answer for older text", async () => {
    const { type, options } = setup();
    type("begudes");
    await waitFor(() => expect(pending.has("begudes")).toBe(true));
    type("tapies");
    await waitFor(() => expect(pending.has("tapies")).toBe(true));

    await act(async () => pending.get("begudes")!.resolve([profile("begudes")]));
    expect(options().some((o) => o.textContent?.includes("Begudes"))).toBe(false);

    await act(async () => pending.get("tapies")!.resolve([profile("tapies")]));
    await waitFor(() => expect(options().at(-1)).toHaveTextContent("@tapies"));
  });

  it("keeps the active option when the profile group arrives late", async () => {
    const { input, type, key, options } = setup();
    type("Cardedeu");
    key("ArrowDown");
    key("ArrowDown");
    const activePlace = options()[1].id;
    expect(input).toHaveAttribute("aria-activedescendant", activePlace);

    await waitFor(() => expect(pending.has("cardedeu")).toBe(true));
    await act(async () => pending.get("cardedeu")!.resolve([profile("cardedeu")]));
    await waitFor(() => expect(options()).toHaveLength(3));
    expect(input).toHaveAttribute("aria-activedescendant", activePlace);
  });

  it("hides the profile group when the request fails", async () => {
    fetchMock.mockResolvedValue(new Response("", { status: 502 }));
    const { type } = setup();
    type("begudes");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText("Cercant perfils…")).not.toBeInTheDocument());
    expect(screen.getAllByRole("option")).toHaveLength(1);
  });
});
