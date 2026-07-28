import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AuthCheckSkeleton from "@components/ui/common/skeletons/AuthCheckSkeleton";

describe("AuthCheckSkeleton", () => {
  it("renders a status region with a spinner, not a content-shaped box", () => {
    render(<AuthCheckSkeleton />);
    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
    expect(status.querySelector(".animate-spin")).toBeInTheDocument();
  });
});
