import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PosterAutofillCard from "@components/ui/publish/PosterAutofillCard";
import type { PosterExtractedEvent } from "types/api/poster";

const mocks = vi.hoisted(() => ({
  loadAndPrepareImage: vi.fn(),
  sendGoogleEvent: vi.fn(),
}));

vi.mock("@utils/image-upload", () => ({
  loadAndPrepareImage: mocks.loadAndPrepareImage,
  imageUploadErrorMessage: (_t: unknown, reason: string) => `err:${reason}`,
}));

vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: mocks.sendGoogleEvent,
}));

vi.mock("next-intl", () => ({
  useLocale: () => "ca",
  useTranslations: () => (key: string, values?: Record<string, unknown>) =>
    values ? `${key}:${JSON.stringify(values)}` : key,
}));

const EXTRACTED: PosterExtractedEvent = {
  title: "Concert al Parc",
  description: "Música en directe.",
  startDate: "2027-06-20T20:00",
  endDate: "2027-06-20T22:00",
  isAllDay: false,
  dateInferred: true,
  isMultiEvent: false,
  town: "Cardedeu",
  location: "Parc dels Pinetons",
  url: null,
  price: "Entrada lliure",
  priceResolution: {
    priceType: "free",
    priceAmount: "",
    originalPrice: null,
    needsReview: false,
  },
  categories: ["concerts"],
};

const sampleFile = new File(["img"], "cartell.jpg", { type: "image/jpeg" });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.loadAndPrepareImage.mockResolvedValue({
    ok: true,
    file: sampleFile,
    detectedType: "image/jpeg",
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PosterAutofillCard", () => {
  it("makes zero network calls on mount when untouched", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    render(
      <PosterAutofillCard
        currentImageFile={null}
        currentImagePreview={null}
        isAuthenticated={true}
        isAuthLoading={false}
        onRequestAuthForScan={vi.fn()}
        onPosterPrepared={vi.fn()}
        onExtractionApplied={vi.fn()}
        canUndo={false}
        onUndo={vi.fn()}
      />,
    );

    expect(screen.getByTestId("poster-autofill-card")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("extracts poster for signed-in user, shows filled pills & warnings, and triggers Undo", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ state: "available", signedIn: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            extracted: EXTRACTED,
            hasData: true,
            model: "gemini/gemini-3.6-flash",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchSpy);

    const onPosterPrepared = vi.fn();
    const onExtractionApplied = vi.fn().mockReturnValue({
      filledFields: ["title", "description", "town", "dates"],
      unmatchedTown: null,
      pastDate: false,
      dateInferred: true,
      priceNeedsReview: false,
      isMultiEvent: false,
    });
    const onUndo = vi.fn();

    render(
      <PosterAutofillCard
        currentImageFile={sampleFile}
        currentImagePreview="data:image/jpeg;base64,abc"
        isAuthenticated={true}
        isAuthLoading={false}
        onRequestAuthForScan={vi.fn()}
        onPosterPrepared={onPosterPrepared}
        onExtractionApplied={onExtractionApplied}
        canUndo={true}
        onUndo={onUndo}
      />,
    );

    const input = screen.getByTestId("poster-autofill-input");
    fireEvent.change(input, { target: { files: [sampleFile] } });

    await waitFor(() =>
      expect(screen.getByTestId("poster-autofill-success")).toBeInTheDocument(),
    );
    expect(onPosterPrepared).toHaveBeenCalledWith(sampleFile);
    expect(onExtractionApplied).toHaveBeenCalledWith(EXTRACTED, {
      allowOverwriteOwned: false,
    });
    expect(screen.getByTestId("poster-autofill-warnings")).toHaveTextContent(
      "posterAutofill.warningDateInferred",
    );

    fireEvent.click(screen.getByTestId("poster-autofill-undo"));
    expect(onUndo).toHaveBeenCalledTimes(1);
  });

  it("does not redirect guest to Logto when AI status is disabled", async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ state: "disabled", signedIn: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const onRequestAuthForScan = vi.fn();
    const onPosterPrepared = vi.fn();

    render(
      <PosterAutofillCard
        currentImageFile={null}
        currentImagePreview={null}
        isAuthenticated={false}
        isAuthLoading={false}
        onRequestAuthForScan={onRequestAuthForScan}
        onPosterPrepared={onPosterPrepared}
        onExtractionApplied={vi.fn()}
        canUndo={false}
        onUndo={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("poster-autofill-input"), {
      target: { files: [sampleFile] },
    });

    await waitFor(() =>
      expect(screen.getByTestId("poster-autofill-error")).toHaveTextContent(
        "posterAutofill.errorUnavailable",
      ),
    );
    expect(onPosterPrepared).toHaveBeenCalledWith(sampleFile);
    expect(onRequestAuthForScan).not.toHaveBeenCalled();
  });

  it("requests auth handoff when guest drops poster and AI is available", async () => {
    const fetchSpy = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ state: "available", signedIn: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchSpy);

    const onRequestAuthForScan = vi.fn();

    render(
      <PosterAutofillCard
        currentImageFile={null}
        currentImagePreview={null}
        isAuthenticated={false}
        isAuthLoading={false}
        onRequestAuthForScan={onRequestAuthForScan}
        onPosterPrepared={vi.fn()}
        onExtractionApplied={vi.fn()}
        canUndo={false}
        onUndo={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("poster-autofill-input"), {
      target: { files: [sampleFile] },
    });

    await waitFor(() =>
      expect(onRequestAuthForScan).toHaveBeenCalledWith(sampleFile),
    );
  });

  it("shows network error instead of image compression error when lazy optimizer chunk fails to fetch", async () => {
    mocks.loadAndPrepareImage.mockRejectedValueOnce(
      new TypeError("Failed to fetch dynamically imported module"),
    );

    render(
      <PosterAutofillCard
        currentImageFile={null}
        currentImagePreview={null}
        isAuthenticated={true}
        isAuthLoading={false}
        onRequestAuthForScan={vi.fn()}
        onPosterPrepared={vi.fn()}
        onExtractionApplied={vi.fn()}
        canUndo={false}
        onUndo={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("poster-autofill-input"), {
      target: { files: [sampleFile] },
    });

    await waitFor(() =>
      expect(screen.getByTestId("poster-autofill-error")).toHaveTextContent(
        "posterAutofill.errorNetwork",
      ),
    );
  });
});
