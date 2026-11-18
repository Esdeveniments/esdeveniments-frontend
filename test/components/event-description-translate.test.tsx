import {
  Activity,
  createElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";
import { act, fireEvent, render, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import caMessages from "../../messages/ca.json";
import type { EventDescriptionProps } from "types/event";

const { translateDescription } = vi.hoisted(() => ({
  translateDescription: vi.fn(),
}));

vi.mock("app/[locale]/e/[eventId]/actions", () => ({ translateDescription }));
vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn() }));

import EventDescription from "app/[locale]/e/[eventId]/components/EventDescription";

const SHOW_ORIGINAL = caMessages.Components.Description.showOriginal;
const TRANSLATE = /^Traduir la descripció/;

const ORIGINAL_A = "<p>Concert a la <strong>plaça</strong>.</p><p>Entrada lliure.</p>";
const TRANSLATION_A = "<p>Concierto en la <strong>plaza</strong>.</p><p>Entrada libre.</p>";
const ORIGINAL_B = "<p>Teatre al <em>casal</em>.</p><p>Cal reservar.</p>";
const TRANSLATION_B = "<p>Teatro en el <em>casal</em>.</p><p>Hay que reservar.</p>";

type Reply = { ok: true; translation: string };

function propsFor(
  slug: string,
  description: string,
  showTranslate = true,
): EventDescriptionProps {
  return { slug, description, locale: "es", showTranslate };
}

/**
 * Renders what the server would send: runs the async server components
 * (`Description`) and keeps client components as elements.
 */
async function resolveServer(node: ReactNode): Promise<ReactNode> {
  if (Array.isArray(node)) return Promise.all(node.map(resolveServer));
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<Record<string, unknown>>;
  const { type } = element;
  if (typeof type === "function" && type.constructor.name === "AsyncFunction") {
    const render = type as (props: unknown) => Promise<ReactNode>;
    return resolveServer(await render(element.props));
  }
  const props: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(element.props)) {
    props[key] =
      isValidElement(value) || Array.isArray(value)
        ? await resolveServer(value as ReactNode)
        : value;
  }
  return createElement(element.type, { ...props, key: element.key });
}

async function serverEvent(props: EventDescriptionProps): Promise<ReactNode> {
  return resolveServer(await EventDescription(props));
}

/**
 * The description body: the innermost single `<div>` under the text column.
 * Test descriptions have two `<p>` children, so the walk stops at the body.
 */
function bodyOf(root: HTMLElement): HTMLElement {
  let node = root.querySelector<HTMLElement>("section .max-w-prose");
  if (!node) throw new Error("description text column not found");
  while (node.children.length === 1 && node.firstElementChild?.tagName === "DIV") {
    node = node.firstElementChild as HTMLElement;
  }
  return node;
}

async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(300);
  });
}

async function click(button: HTMLElement) {
  await act(async () => {
    fireEvent.click(button);
  });
}

function deferred() {
  let resolve!: (reply: Reply) => void;
  const promise = new Promise<Reply>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.useFakeTimers();
  translateDescription.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("EventDescription translate button", () => {
  it("translates, then restores the exact original HTML", async () => {
    translateDescription.mockResolvedValue({ ok: true, translation: TRANSLATION_A });
    const { container, getByRole } = render(await serverEvent(propsFor("a", ORIGINAL_A)));
    expect(bodyOf(container).innerHTML).toBe(ORIGINAL_A);

    await click(getByRole("button", { name: TRANSLATE }));
    await settle();
    expect(translateDescription).toHaveBeenCalledWith({ slug: "a", targetLang: "es" });
    expect(bodyOf(container).innerHTML).toBe(TRANSLATION_A);

    await click(getByRole("button", { name: SHOW_ORIGINAL }));
    await settle();
    expect(bodyOf(container).innerHTML).toBe(ORIGINAL_A);
    expect(getByRole("button", { name: TRANSLATE })).toBeInTheDocument();
  });

  it("keeps the original when the button is double-clicked mid-fade", async () => {
    translateDescription.mockResolvedValue({ ok: true, translation: TRANSLATION_A });
    const { container, getByRole } = render(await serverEvent(propsFor("a", ORIGINAL_A)));
    await click(getByRole("button", { name: TRANSLATE }));
    await settle();

    await click(getByRole("button", { name: SHOW_ORIGINAL }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(50);
    });
    await click(getByRole("button"));
    await settle();
    // Two clicks are two toggles: the translation is back, and the label says so.
    expect(bodyOf(container).innerHTML).toBe(TRANSLATION_A);
    expect(getByRole("button", { name: SHOW_ORIGINAL })).toBeInTheDocument();

    await click(getByRole("button", { name: SHOW_ORIGINAL }));
    await settle();
    expect(bodyOf(container).innerHTML).toBe(ORIGINAL_A);
    expect(translateDescription).toHaveBeenCalledTimes(1);
  });

  it("shows the new original after a refresh changes the description", async () => {
    translateDescription.mockResolvedValue({ ok: true, translation: TRANSLATION_A });
    const { container, getByRole, rerender } = render(
      await serverEvent(propsFor("a", ORIGINAL_A)),
    );
    await click(getByRole("button", { name: TRANSLATE }));
    await settle();
    expect(bodyOf(container).innerHTML).toBe(TRANSLATION_A);

    rerender(await serverEvent(propsFor("a", ORIGINAL_B)));
    await settle();
    expect(bodyOf(container).innerHTML).toBe(ORIGINAL_B);
    expect(getByRole("button", { name: TRANSLATE })).toBeInTheDocument();
  });

  it("drops the translation when showTranslate turns false", async () => {
    translateDescription.mockResolvedValue({ ok: true, translation: TRANSLATION_A });
    const { container, getByRole, queryByRole, rerender } = render(
      await serverEvent(propsFor("a", ORIGINAL_A)),
    );
    await click(getByRole("button", { name: TRANSLATE }));
    await settle();
    expect(bodyOf(container).innerHTML).toBe(TRANSLATION_A);

    rerender(await serverEvent(propsFor("a", ORIGINAL_A, false)));
    await settle();
    expect(bodyOf(container).innerHTML).toBe(ORIGINAL_A);
    expect(queryByRole("button")).toBeNull();
  });

  it("changes only the visible event when the previous one stays mounted but hidden", async () => {
    translateDescription.mockResolvedValue({ ok: true, translation: TRANSLATION_B });
    const eventA = await serverEvent(propsFor("a", ORIGINAL_A));
    const eventB = await serverEvent(propsFor("b", ORIGINAL_B));
    const page = (mode: "visible" | "hidden", next: ReactNode) => (
      <>
        <Activity mode={mode}>
          <div data-testid="event-a">{eventA}</div>
        </Activity>
        {next}
      </>
    );
    // Like a client navigation with cacheComponents: event A stays in the DOM, hidden.
    const { getByTestId, rerender } = render(page("visible", null));
    rerender(page("hidden", <div data-testid="event-b">{eventB}</div>));
    await settle();

    const b = getByTestId("event-b");
    await click(within(b).getByRole("button", { name: TRANSLATE }));
    await settle();

    expect(translateDescription).toHaveBeenCalledWith({ slug: "b", targetLang: "es" });
    expect(bodyOf(b).innerHTML).toBe(TRANSLATION_B);
    expect(bodyOf(getByTestId("event-a")).innerHTML).toBe(ORIGINAL_A);
  });

  it("ignores a late reply after the description changed", async () => {
    const reply = deferred();
    translateDescription.mockReturnValue(reply.promise);
    const { container, getByRole, rerender } = render(
      await serverEvent(propsFor("a", ORIGINAL_A)),
    );
    await click(getByRole("button", { name: TRANSLATE }));

    rerender(await serverEvent(propsFor("a", ORIGINAL_B)));
    await act(async () => {
      reply.resolve({ ok: true, translation: TRANSLATION_A });
    });
    await settle();

    expect(bodyOf(container).innerHTML).toBe(ORIGINAL_B);
    expect(getByRole("button", { name: TRANSLATE })).toBeInTheDocument();
  });
});
