import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Link as ActiveLink } from "../components/ui/primitives";

// Mock Next.js navigation
const mockUsePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ children, href, className, ...props }: any) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

describe("ActiveLink", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/");
  });

  it("renders children content", () => {
    render(<ActiveLink href="/test">Test Link</ActiveLink>);
    expect(screen.getByText("Test Link")).toBeInTheDocument();
  });

  it("uses href prop for link destination", () => {
    render(<ActiveLink href="/test">Test Link</ActiveLink>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/test");
  });

  it("uses url prop when href is not provided", () => {
    render(<ActiveLink url="/test-url">Test Link</ActiveLink>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/test-url");
  });

  it("defaults to '/' when neither href nor url is provided", () => {
    render(<ActiveLink>Test Link</ActiveLink>);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/");
  });

  it("applies active class when pathname matches href", () => {
    mockUsePathname.mockReturnValue("/active");
    render(<ActiveLink href="/active">Active Link</ActiveLink>);
    const link = screen.getByRole("link");
    expect(link).toHaveClass("text-primary");
    expect(link).toHaveClass("bg-whiteCorp");
    expect(link).toHaveClass("border-b-2");
    expect(link).toHaveClass("border-primary");
  });

  it("applies custom activeLinkClass when provided and active", () => {
    mockUsePathname.mockReturnValue("/active");
    render(
      <ActiveLink href="/active" activeLinkClass="custom-active">
        Active Link
      </ActiveLink>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveClass("custom-active");
  });

  it("applies default className when not active", () => {
    render(<ActiveLink href="/inactive">Inactive Link</ActiveLink>);
    const link = screen.getByRole("link");
    expect(link).toHaveClass("flex");
    expect(link).toHaveClass("justify-center");
    expect(link).toHaveClass("items-center");
  });

  it("uses custom className when provided", () => {
    render(
      <ActiveLink href="/test" className="custom-class">
        Test Link
      </ActiveLink>,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveClass("custom-class");
  });

  it("passes through additional props to Link", () => {
    render(
      <ActiveLink href="/test" data-testid="custom-link">
        Test Link
      </ActiveLink>,
    );
    expect(screen.getByTestId("custom-link")).toBeInTheDocument();
  });
});
