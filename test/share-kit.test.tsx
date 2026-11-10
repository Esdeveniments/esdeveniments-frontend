import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { buildShareText, buildShareUrl, buildWhatsappShareHref } from "@utils/share-kit";
import { SHARE_KIT_EVENT } from "./fixtures/share-kit-event";

const mockSendGoogleEvent = vi.fn();
vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: (...args: unknown[]) => mockSendGoogleEvent(...args),
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
