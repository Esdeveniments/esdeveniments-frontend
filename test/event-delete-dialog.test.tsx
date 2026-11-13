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

import { useState } from "react";
import EventDeleteDialog from "@app/[locale]/e/[eventId]/components/EventDeleteDialog";

function OpenDialog() {
  const [open, setOpen] = useState(true);
  return <EventDeleteDialog slug="my-event" open={open} setOpen={setOpen} />;
}

describe("EventDeleteDialog", () => {
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
    fireEvent.click(await screen.findByTestId("event-delete-modal-action-button"));
  };

  it("deletes through the internal route after confirmation and leaves the page", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    render(<OpenDialog />);

    expect(fetchMock).not.toHaveBeenCalled();
    await confirmDelete();

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenCalledWith("/api/events/my-event", {
      method: "DELETE",
      credentials: "include",
    });
  });

  // 404 too: the route returns it when the backend lookup fails.
  it.each([500, 404])("keeps the dialog open with an error on a %i", async (status) => {
    fetchMock.mockResolvedValue(new Response(null, { status }));
    render(<OpenDialog />);

    await confirmDelete();

    expect(await screen.findByText("deleteError")).toBeTruthy();
    expect(screen.getByTestId("event-delete-modal")).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});
