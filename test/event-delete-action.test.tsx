import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const replace = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@i18n/routing", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@utils/analytics", () => ({ sendGoogleEvent: vi.fn() }));

import EventDeleteAction from "@app/[locale]/e/[eventId]/components/EventDeleteAction";

describe("EventDeleteAction", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    replace.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const confirmDelete = async () => {
    fireEvent.click(screen.getByTestId("event-delete-button"));
    fireEvent.click(await screen.findByTestId("event-delete-modal-action-button"));
  };

  it("deletes through the internal route after confirmation and leaves the page", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    render(<EventDeleteAction slug="my-event" />);

    expect(fetchMock).not.toHaveBeenCalled();
    await confirmDelete();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenCalledWith("/api/events/my-event", {
      method: "DELETE",
      credentials: "include",
    });
  });

  it("keeps the dialog open with an error when the delete fails", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));
    render(<EventDeleteAction slug="my-event" />);

    await confirmDelete();

    expect(await screen.findByText("deleteError")).toBeTruthy();
    expect(screen.getByTestId("event-delete-modal")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});
