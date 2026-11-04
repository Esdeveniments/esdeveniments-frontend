import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { EventFormProps } from "types/event";
import type { EventDetailResponseDTO } from "types/api/event";

vi.mock("@components/hooks/useCategories", () => ({
  useCategories: () => ({ categories: [], isLoading: false }),
}));
vi.mock("@app/[locale]/e/[eventId]/edita/actions", () => ({ editEvent: vi.fn() }));
vi.mock("@components/ui/EventForm", () => ({
  default: ({ handleImageChange, onSubmit, imageToUpload }: EventFormProps) => (
    <form onSubmit={onSubmit}>
      <span data-testid="preview">{imageToUpload}</span>
      <button type="button" onClick={() => handleImageChange(new File(["x"], "new.jpg", { type: "image/jpeg" }))}>Select</button>
      <button type="button" onClick={() => handleImageChange(null)}>Remove</button>
      <button type="submit">Save</button>
    </form>
  ),
}));
import EditEventClient from "@app/[locale]/e/[eventId]/edita/EditEventClient";
import { editEvent } from "@app/[locale]/e/[eventId]/edita/actions";

class LateReader extends EventTarget {
  static last: LateReader;
  result = "data:image/jpeg;base64,late";
  constructor() { super(); LateReader.last = this; }
  readAsDataURL() {}
  abort = vi.fn();
}
const event: EventDetailResponseDTO = {
  id: "b831621e-43d4-4364-b797-4f83f5752e83", hash: "hash", slug: "concert",
  title: "Concert", description: "Descripcio", imageUrl: "https://example.com/old.jpg",
  startDate: "2099-10-25", endDate: "2099-10-25", startTime: "18:00", endTime: "20:00",
  url: null, isPromoted: false, categories: [], location: "Teatre", visits: 0, origin: "MANUAL",
  city: { id: 1, name: "Barcelona", slug: "barcelona", latitude: 41, longitude: 2, postalCode: "08001", enabled: true },
  region: { id: 1, name: "Barcelones", slug: "barcelones" },
  province: { id: 1, name: "Barcelona", slug: "barcelona" },
};

describe("editor cover intent", () => {
  beforeEach(() => {
    vi.stubGlobal("FileReader", LateReader);
    vi.mocked(editEvent).mockResolvedValue({
      success: false, newSlug: "saved-concert", errorCode: "COVER_UPDATE_FAILED",
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("preserves removal despite a late preview and translates a partial failure", async () => {
    render(<EditEventClient event={event} regions={[]} />);
    fireEvent.click(screen.getByText("Select"));
    const reader = LateReader.last;
    fireEvent.click(screen.getByText("Remove"));
    act(() => reader.dispatchEvent(new Event("load")));
    expect(screen.getByTestId("preview")).toBeEmptyDOMElement();
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(editEvent).toHaveBeenCalledOnce());
    const cover = vi.mocked(editEvent).mock.calls[0][3];
    expect(cover?.get("removeImage")).toBe("1");
    expect(cover?.get("imageFile")).toBeNull();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "L'esdeveniment s'ha desat, però no s'ha pogut actualitzar la imatge.",
    );
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(editEvent).toHaveBeenCalledTimes(2));
    expect(vi.mocked(editEvent).mock.calls[1][1]).toBe("saved-concert");
  });
});
