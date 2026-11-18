import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import TranslateDescription from "../app/[locale]/e/[eventId]/components/TranslateDescription";

vi.mock("../app/[locale]/e/[eventId]/actions", () => ({
  translateDescription: vi.fn(async () => ({ ok: true, translation: "<p>Traducido</p>" })),
}));

const ID = "event-description-body";

// Next keeps a recently visited event mounted but hidden, so two sections can
// share the description id; each button must only touch its own.
function TwoEvents() {
  return (
    <>
      <section data-testid="hidden-event">
        <TranslateDescription slug="a" locale="es" />
        <div id={ID}>
          <p>Original A</p>
        </div>
      </section>
      <section data-testid="current-event">
        <TranslateDescription slug="b" locale="es" />
        <div id={ID}>
          <p>Original B</p>
        </div>
      </section>
    </>
  );
}

describe("TranslateDescription", () => {
  it("translates and restores only its own section's description", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<TwoEvents />);
    const [hidden, current] = [
      screen.getByTestId("hidden-event"),
      screen.getByTestId("current-event"),
    ];
    const body = (section: HTMLElement) => section.querySelector(`#${ID}`)!.innerHTML;
    const [hiddenOriginal, currentOriginal] = [body(hidden), body(current)];

    fireEvent.click(current.querySelector("button")!);
    await waitFor(() => expect(current.querySelector("button")!.disabled).toBe(false));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(body(current)).toBe("<p>Traducido</p>");
    expect(body(hidden)).toBe(hiddenOriginal);

    fireEvent.click(current.querySelector("button")!);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(body(current)).toBe(currentOriginal);
    expect(body(hidden)).toBe(hiddenOriginal);
    vi.useRealTimers();
  });

  it("keeps the original when 'show original' is double-clicked mid-fade", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    render(<TwoEvents />);
    const current = screen.getByTestId("current-event");
    const button = () => current.querySelector("button")!;
    const body = () => current.querySelector(`#${ID}`)!.innerHTML;
    const original = body();

    fireEvent.click(button());
    await waitFor(() => expect(button().disabled).toBe(false));
    act(() => {
      vi.advanceTimersByTime(200);
    });

    // A toggle settles at once, so a second click can land before the fade.
    const toggle = async () => {
      fireEvent.click(button());
      await act(async () => {});
    };
    await toggle();
    await toggle();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    await toggle();
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(body()).toBe(original);
    vi.useRealTimers();
  });
});
