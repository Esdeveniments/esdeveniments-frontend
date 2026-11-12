import { describe, it, expect, vi, afterEach, beforeAll } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { usePresenceTransition } from "@components/hooks/usePresenceTransition";

function Toast({ show }: { show: boolean }) {
  const { ref, mounted, closed } = usePresenceTransition<HTMLDivElement>(show);
  return mounted ? (
    <div ref={ref} data-closed={closed ? "" : undefined} data-testid="toast" />
  ) : null;
}

/** The hook opens two frames after mounting closed. */
const twoFrames = () =>
  act(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
      )
  );

/** Fakes one running exit transition that ends when `finish` is called. */
function runningTransition() {
  let finish = () => {};
  const finished = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const spy = vi
    .spyOn(HTMLElement.prototype, "getAnimations")
    .mockReturnValue([{ finished } as unknown as Animation]);
  return { finish, spy };
}

describe("usePresenceTransition", () => {
  beforeAll(() => {
    // jsdom has no Web Animations API; spyOn needs a method to replace.
    HTMLElement.prototype.getAnimations ??= () => [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mounts closed, opens, and unmounts at once when nothing animates", async () => {
    const { rerender } = render(<Toast show={true} />);
    expect(screen.getByTestId("toast")).toHaveAttribute("data-closed");
    await twoFrames();
    expect(screen.getByTestId("toast")).not.toHaveAttribute("data-closed");

    rerender(<Toast show={false} />);
    expect(screen.queryByTestId("toast")).toBeNull();
  });

  it("stays mounted, closed, until its exit transition ends", async () => {
    const { rerender } = render(<Toast show={true} />);
    await twoFrames();
    const { finish } = runningTransition();

    rerender(<Toast show={false} />);
    expect(screen.getByTestId("toast")).toHaveAttribute("data-closed");

    await act(async () => finish());
    expect(screen.queryByTestId("toast")).toBeNull();
  });

  it("reverses when shown again mid-exit", async () => {
    const { rerender } = render(<Toast show={true} />);
    await twoFrames();
    const { finish } = runningTransition();

    rerender(<Toast show={false} />);
    rerender(<Toast show={true} />);
    await twoFrames();
    expect(screen.getByTestId("toast")).not.toHaveAttribute("data-closed");

    await act(async () => finish());
    expect(screen.getByTestId("toast")).toBeInTheDocument();
  });
});
