import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { buildShareText, buildShareUrl, buildWhatsappShareHref } from "@utils/share-kit";
import { wrapLines } from "@utils/event-flyer";
import { SHARE_KIT_EVENT } from "./fixtures/share-kit-event";

const mockSendGoogleEvent = vi.fn();
vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: (...args: unknown[]) => mockSendGoogleEvent(...args),
}));

const mockRenderEventFlyer = vi.fn();
vi.mock("@utils/event-flyer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@utils/event-flyer")>()),
  renderEventFlyer: (...args: unknown[]) => mockRenderEventFlyer(...args),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

import ShareKit from "@components/ui/shareKit/ShareKit";

describe("share kit links", () => {
  it("tags the event URL with the channel and where the share started", () => {
    const url = new URL(buildShareUrl(SHARE_KIT_EVENT.url, "whatsapp", "post_publish"));

    expect(url.pathname).toBe("/e/my-event");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      utm_source: "whatsapp",
      utm_medium: "organizer_share",
      utm_campaign: "post_publish",
    });
  });

  it("skips the date and place lines when they are empty", () => {
    const text = buildShareText({ ...SHARE_KIT_EVENT, dateText: "", placeText: "" }, "https://x/e");

    expect(text).toBe("My Event\nhttps://x/e");
  });

  it("encodes the message so line breaks and the link's query survive in WhatsApp", () => {
    const shareUrl = buildShareUrl(SHARE_KIT_EVENT.url, "whatsapp", "post_publish");
    const href = new URL(buildWhatsappShareHref(buildShareText(SHARE_KIT_EVENT, shareUrl)));

    expect(href.searchParams.get("text")).toBe(
      `My Event\n📅 dissabte, 12 de setembre\n📍 Cardedeu\n${shareUrl}`,
    );
  });
});

describe("poster text wrapping", () => {
  // 10 px per character keeps widths easy to reason about.
  const ctx = { measureText: (text: string) => ({ width: text.length * 10 }) as TextMetrics };

  it("does not add an ellipsis when extra whitespace is the only difference", () => {
    expect(wrapLines(ctx, "Cardedeu  (Vallès)", 400, 1)).toEqual(["Cardedeu (Vallès)"]);
  });

  it("ends the last line with an ellipsis when words are left over", () => {
    expect(wrapLines(ctx, "one two three four", 90, 2)).toEqual(["one two", "three…"]);
  });
});

describe("ShareKit", () => {
  const originalShare = navigator.share;

  beforeEach(() => {
    mockSendGoogleEvent.mockReset();
  });

  afterEach(() => {
    Object.defineProperty(navigator, "share", { value: originalShare, configurable: true });
  });

  it("does not report a closed share sheet as an error", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("closed", "AbortError"));
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    render(<ShareKit event={SHARE_KIT_EVENT} source="owner_actions" />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("share-kit-native"));
    });

    expect(share).toHaveBeenCalledTimes(1);
    expect(mockSendGoogleEvent).not.toHaveBeenCalled();
  });

  describe("poster on a phone", () => {
    const originalMatchMedia = window.matchMedia;
    const originalCanShare = navigator.canShare;
    let clickSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      mockRenderEventFlyer.mockResolvedValue(new Blob(["png"], { type: "image/png" }));
      window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as typeof window.matchMedia;
      Object.defineProperty(navigator, "canShare", { value: () => true, configurable: true });
      URL.createObjectURL = vi.fn().mockReturnValue("blob:poster");
      URL.revokeObjectURL = vi.fn();
      clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    });

    afterEach(() => {
      window.matchMedia = originalMatchMedia;
      Object.defineProperty(navigator, "canShare", { value: originalCanShare, configurable: true });
      clickSpy.mockRestore();
    });

    const tapPoster = async (shareError: DOMException) => {
      Object.defineProperty(navigator, "share", {
        value: vi.fn().mockRejectedValue(shareError),
        configurable: true,
      });
      render(<ShareKit event={SHARE_KIT_EVENT} source="post_publish" />);
      await act(async () => {
        fireEvent.click(screen.getByTestId("share-kit-image"));
      });
    };

    it("downloads the poster when the share sheet refuses to open", async () => {
      await tapPoster(new DOMException("no user activation", "NotAllowedError"));

      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("alert")).toBeNull();
      expect(mockSendGoogleEvent).toHaveBeenCalledWith(
        "share_error",
        expect.objectContaining({ method: "image_share" }),
      );
      expect(mockSendGoogleEvent).toHaveBeenCalledWith(
        "share",
        expect.objectContaining({ method: "image_download" }),
      );
    });

    it("does nothing more when the organiser closes the share sheet", async () => {
      await tapPoster(new DOMException("closed", "AbortError"));

      expect(clickSpy).not.toHaveBeenCalled();
      expect(mockSendGoogleEvent).not.toHaveBeenCalled();
    });
  });

  it("copies the tagged link and confirms it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<ShareKit event={SHARE_KIT_EVENT} source="owner_actions" />);

    await act(async () => {
      fireEvent.click(screen.getByTestId("share-kit-copy"));
    });

    expect(writeText).toHaveBeenCalledWith(
      buildShareUrl(SHARE_KIT_EVENT.url, "copy", "owner_actions"),
    );
    expect(screen.getByText("copied")).toBeInTheDocument();
    expect(mockSendGoogleEvent).toHaveBeenCalledWith("share", {
      method: "copy",
      content_type: "event",
      item_id: "my-event",
      source: "owner_actions",
    });
  });
});
