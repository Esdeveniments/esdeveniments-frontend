import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { createRef } from "react";
import Modal from "../components/ui/common/modal";
import { renderWithProviders } from "./utils/renderWithProviders";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

function renderModal(
  initialFocusRef?: ReturnType<typeof createRef<HTMLParagraphElement>>,
  renderTarget = true
) {
  renderWithProviders(
    <Modal open setOpen={() => {}} title="Filtres" initialFocusRef={initialFocusRef}>
      <p>Lloc</p>
      {renderTarget && (
        <p ref={initialFocusRef} tabIndex={-1}>
          Preu
        </p>
      )}
    </Modal>
  );
}

describe("Modal initial focus", () => {
  it("focuses the close button by default", async () => {
    renderModal();
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute("aria-label", "Tanca")
    );
  });

  it("focuses initialFocusRef when given", async () => {
    renderModal(createRef<HTMLParagraphElement>());
    await waitFor(() =>
      expect(document.activeElement).toBe(screen.getByText("Preu"))
    );
  });

  it("falls back to the close button when the target didn't render", async () => {
    renderModal(createRef<HTMLParagraphElement>(), false);
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute("aria-label", "Tanca")
    );
  });
});
