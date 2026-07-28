import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import AuthCheckSkeleton from "@components/ui/common/skeletons/AuthCheckSkeleton";

describe("AuthCheckSkeleton", () => {
  it("renders a spinner hidden from assistive tech, not a content-shaped box", () => {
    const { container } = render(<AuthCheckSkeleton />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveAttribute("aria-hidden", "true");
    expect(wrapper.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
