import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import AuthCheckSkeleton from "@components/ui/common/skeletons/AuthCheckSkeleton";

describe("AuthCheckSkeleton", () => {
  it("is hidden from assistive tech, matching every other skeleton in the codebase", () => {
    const { container } = render(<AuthCheckSkeleton />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
  });

  it("uses the exact card frame shared by PublishAuthGate/CompleteProfileGate/EditProfileAuthGate, so it doesn't shift when real content swaps in", () => {
    const { container } = render(<AuthCheckSkeleton />);
    const card = container.querySelector(
      ".w-full.max-w-md.card-bordered.card-body.stack.text-center",
    );
    expect(card).toBeInTheDocument();
  });

  it("renders animated placeholder bars for the icon, heading, description, and button", () => {
    const { container } = render(<AuthCheckSkeleton />);
    const bars = container.querySelectorAll(".animate-pulse");
    // icon circle + heading bar + description bar + button bar
    expect(bars.length).toBe(4);
  });
});
