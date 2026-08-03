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

import PromoteUpsellModal from "../app/[locale]/publica/PromoteUpsellModal";

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

  it("navigates to the event detail page and closes the modal on 'keep it free'", () => {
    const setOpen = vi.fn();
    render(<PromoteUpsellModal open setOpen={setOpen} slug="my-event" />);

    fireEvent.click(screen.getByTestId("promote-modal-keep-free"));

    expect(setOpen).toHaveBeenCalledWith(false);
    expect(mockPush).toHaveBeenCalledWith("/e/my-event");
  });
});
