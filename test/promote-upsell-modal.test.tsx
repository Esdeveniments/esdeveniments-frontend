import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockPush = vi.fn();
vi.mock("@i18n/routing", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@heroicons/react/24/outline", () => ({
  RocketLaunchIcon: () => <svg data-testid="rocket-icon" />,
  CheckCircleIcon: () => <svg data-testid="check-icon" />,
}));

// Minimal Modal stub mirroring the real component's close/actionButton contract:
// calls setOpen(false) after onActionButtonClick resolves, unless it returns false.
vi.mock("@components/ui/common/modal", () => ({
  __esModule: true,
  default: ({
    open,
    setOpen,
    title,
    children,
    actionButton,
    onActionButtonClick,
  }: {
    open: boolean;
    setOpen: (open: boolean) => void;
    title: string;
    children: ReactNode;
    actionButton?: ReactNode;
    onActionButtonClick?: () => boolean | void | Promise<boolean | void>;
  }) => {
    if (!open) return null;
    return (
      <div data-testid="modal">
        <h2>{title}</h2>
        {children}
        {actionButton && (
          <button
            data-testid="modal-action-button"
            onClick={async () => {
              const result = await onActionButtonClick?.();
              if (result !== false) setOpen(false);
            }}
          >
            {actionButton}
          </button>
        )}
      </div>
    );
  },
}));

import PromoteUpsellModal from "../app/[locale]/e/[eventId]/components/PromoteUpsellModal";

describe("PromoteUpsellModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigates to the promote page and keeps working even if Modal also calls setOpen", () => {
    const setOpen = vi.fn();
    render(<PromoteUpsellModal open setOpen={setOpen} slug="my-event" />);

    fireEvent.click(screen.getByTestId("modal-action-button"));

    expect(mockPush).toHaveBeenCalledWith("/e/my-event/promote");
  });

  it("closes the modal without navigating on 'keep it free' (already on the event detail page)", () => {
    const setOpen = vi.fn();
    render(<PromoteUpsellModal open setOpen={setOpen} slug="my-event" />);

    fireEvent.click(screen.getByTestId("promote-modal-keep-free"));

    expect(setOpen).toHaveBeenCalledWith(false);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows the benefit list reusing the promote page's own copy", () => {
    render(<PromoteUpsellModal open setOpen={vi.fn()} slug="my-event" />);

    expect(screen.getByText("benefit1")).toBeInTheDocument();
    expect(screen.getByText("benefit2")).toBeInTheDocument();
    expect(screen.getByText("benefit3")).toBeInTheDocument();
  });
});
