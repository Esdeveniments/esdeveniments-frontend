import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { vi } from "vitest";
import FilterButton from "./FilterButton";

// Mock next/navigation
const mockPush = vi.fn();
const mockScrollTo = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock window.scrollTo
Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: mockScrollTo,
});

describe("FilterButton", () => {
  const defaultProps = {
    text: "Test Filter",
    enabled: false,
    removeUrl: "/test-remove-url",
    onOpenModal: vi.fn(),
    testId: "test-filter",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the filter text", () => {
    render(<FilterButton {...defaultProps} />);
    expect(screen.getByText("Test Filter")).toBeInTheDocument();
  });

  it("renders with correct testId", () => {
    render(<FilterButton {...defaultProps} />);
    expect(screen.getByTestId("test-filter")).toBeInTheDocument();
  });

  describe("when enabled is false", () => {
    it("shows chevron down icon", () => {
      render(<FilterButton {...defaultProps} />);
      const chevronIcon = screen
        .getByTestId("test-filter")
        .querySelector("svg");
      expect(chevronIcon).toBeInTheDocument();
      // ChevronDownIcon has specific path
      expect(chevronIcon).toHaveAttribute("aria-hidden", "true");
    });

    it("applies disabled filter styles", () => {
      render(<FilterButton {...defaultProps} />);
      const innerDiv = screen.getByTestId("test-filter").querySelector("div");
      expect(innerDiv).toHaveClass("text-blackCorp");
      expect(innerDiv).toHaveClass("hover:bg-darkCorp");
    });

    it("calls onOpenModal when text is clicked", async () => {
      const onOpenModal = vi.fn();
      render(<FilterButton {...defaultProps} onOpenModal={onOpenModal} />);
      const textElement = screen.getByText("Test Filter");

      await userEvent.click(textElement);
      expect(onOpenModal).toHaveBeenCalledTimes(1);
    });

    it("calls onOpenModal when chevron is clicked", async () => {
      const onOpenModal = vi.fn();
      render(<FilterButton {...defaultProps} onOpenModal={onOpenModal} />);
      const chevronIcon = screen
        .getByTestId("test-filter")
        .querySelector("svg");

      await userEvent.click(chevronIcon!);
      expect(onOpenModal).toHaveBeenCalledTimes(1);
    });
  });

  describe("when enabled is true", () => {
    const enabledProps = { ...defaultProps, enabled: true };

    it("shows X icon for removal", () => {
      render(<FilterButton {...enabledProps} />);
      expect(screen.getByTestId("test-filter-remove")).toBeInTheDocument();
    });

    it("applies enabled filter styles", () => {
      render(<FilterButton {...enabledProps} />);
      const innerDiv = screen.getByTestId("test-filter").querySelector("div");
      expect(innerDiv).toHaveClass("text-primary");
    });

    it("calls onOpenModal when text is clicked", async () => {
      const onOpenModal = vi.fn();
      render(<FilterButton {...enabledProps} onOpenModal={onOpenModal} />);
      const textElement = screen.getByText("Test Filter");

      await userEvent.click(textElement);
      expect(onOpenModal).toHaveBeenCalledTimes(1);
    });

    it("calls router.push and scrollTo when remove icon is clicked", async () => {
      render(<FilterButton {...enabledProps} />);
      const removeIcon = screen.getByTestId("test-filter-remove");

      await userEvent.click(removeIcon);
      expect(mockPush).toHaveBeenCalledWith("/test-remove-url");
      expect(mockScrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    });

    it("prevents event propagation when remove icon is clicked", async () => {
      const onOpenModal = vi.fn();
      render(<FilterButton {...enabledProps} onOpenModal={onOpenModal} />);
      const removeIcon = screen.getByTestId("test-filter-remove");

      await userEvent.click(removeIcon);
      // onOpenModal should not be called because event propagation is stopped
      expect(onOpenModal).not.toHaveBeenCalled();
    });
  });

  describe("accessibility", () => {
    it("passes axe-core accessibility checks when disabled", async () => {
      const { container } = render(<FilterButton {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("passes axe-core accessibility checks when enabled", async () => {
      const { container } = render(<FilterButton {...defaultProps} enabled />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("has proper aria-hidden on icons", () => {
      render(<FilterButton {...defaultProps} />);
      const icons = screen.getByTestId("test-filter").querySelectorAll("svg");
      expect(icons.length).toBeGreaterThan(0);
      icons.forEach((icon) => {
        expect(icon).toHaveAttribute("aria-hidden", "true");
      });
    });
  });

  describe("interactions", () => {
    it("handles multiple clicks correctly", async () => {
      const onOpenModal = vi.fn();
      render(<FilterButton {...defaultProps} onOpenModal={onOpenModal} />);
      const textElement = screen.getByText("Test Filter");

      await userEvent.click(textElement);
      await userEvent.click(textElement);
      expect(onOpenModal).toHaveBeenCalledTimes(2);
    });

    it("has cursor pointer styling", () => {
      render(<FilterButton {...defaultProps} />);
      const textElement = screen.getByText("Test Filter");
      expect(textElement).toHaveClass("cursor-pointer");
    });
  });

  describe("edge cases", () => {
    it("renders without testId", () => {
      const { testId, ...propsWithoutTestId } = defaultProps;
      render(<FilterButton {...propsWithoutTestId} />);
      // Should not throw and should render
      expect(screen.getByText("Test Filter")).toBeInTheDocument();
    });

    it("handles empty text", () => {
      render(<FilterButton {...defaultProps} text="" />);
      const textElement = screen
        .getByTestId("test-filter")
        .querySelector("span");
      expect(textElement).toBeInTheDocument();
      expect(textElement).toHaveTextContent("");
    });

    it("handles long text", () => {
      const longText = "Very long filter text that might wrap or be truncated";
      render(<FilterButton {...defaultProps} text={longText} />);
      expect(screen.getByText(longText)).toBeInTheDocument();
    });
  });
});
