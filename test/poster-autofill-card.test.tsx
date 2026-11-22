import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import PosterAutofillCard from "@components/ui/publish/PosterAutofillCard";
import { usePublishPosterAutofill } from "@components/hooks/usePublishPosterAutofill";
import type { FormData } from "types/event";
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

  it("extracts poster for signed-in user, swaps heading to success with only 2 actions, shows warnings, and triggers Undo", async () => {
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
    const onExtractionApplied = vi.fn().mockResolvedValue({
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

    // Before scanning, an attached poster offers "Llegeix el cartell" + "Canvia el cartell"
    expect(
      screen.getByTestId("poster-autofill-analyze-existing"),
    ).toHaveTextContent("posterAutofill.analyzeExistingButton");

    const input = screen.getByTestId("poster-autofill-input");
    fireEvent.change(input, { target: { files: [sampleFile] } });

    await waitFor(() =>
      expect(screen.getByTestId("poster-autofill-success")).toBeInTheDocument(),
    );
    expect(onPosterPrepared).toHaveBeenCalledWith(sampleFile);
    expect(onExtractionApplied).toHaveBeenCalledWith(
      EXTRACTED,
      expect.objectContaining({ allowOverwriteOwned: false }),
    );

    // Heading swaps in place to success (no stale idle heading)
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "posterAutofill.headingSuccess",
    );
    // Only 2 unmistakable actions on success: change poster + undo fields (no reread button)
    expect(screen.getByTestId("poster-autofill-pick")).toHaveTextContent(
      "posterAutofill.changeButton",
    );
    expect(screen.getByTestId("poster-autofill-undo")).toHaveTextContent(
      "posterAutofill.undoButton",
    );
    expect(
      screen.queryByTestId("poster-autofill-analyze-existing"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("poster-autofill-retry"),
    ).not.toBeInTheDocument();

    expect(screen.getByTestId("poster-autofill-warnings")).toHaveTextContent(
      "posterAutofill.warningDateInferred",
    );
    expect(mocks.sendGoogleEvent).toHaveBeenCalledWith(
      "publish_poster_autofill_success",
      expect.objectContaining({
        source: "publica",
        mode: "gemini/gemini-3.6-flash",
        outcome: "warnings",
        filled_count: 4,
        has_date_inferred: true,
        has_past_date: false,
      }),
    );

    fireEvent.click(screen.getByTestId("poster-autofill-undo"));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(mocks.sendGoogleEvent).toHaveBeenCalledWith(
      "publish_poster_autofill_undo",
      { source: "publica", mode: "gemini/gemini-3.6-flash" },
    );
  });

  it("shows retry button only on retryable errors, not on unavailable/invalid errors", async () => {
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
          JSON.stringify({ error: "Timed out", code: "upstream_timeout" }),
          { status: 504, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchSpy);

    render(
      <PosterAutofillCard
        currentImageFile={sampleFile}
        currentImagePreview="data:image/jpeg;base64,abc"
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
        "posterAutofill.errorTimeout",
      ),
    );
    expect(mocks.sendGoogleEvent).toHaveBeenCalledWith(
      "publish_poster_autofill_error",
      expect.objectContaining({
        source: "publica",
        reason: "upstream_timeout",
        state: "extract",
      }),
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "posterAutofill.headingError",
    );
    expect(screen.getByTestId("poster-autofill-retry")).toHaveTextContent(
      "posterAutofill.retryButton",
    );
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

  it("surfaces detected unmatched town warning even when zero fields were filled", async () => {
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
            extracted: { ...EXTRACTED, title: null, description: null, startDate: null, endDate: null, location: null, price: null, priceResolution: null, categories: [], town: "Vila Desconeguda" },
            hasData: true,
            model: "gemini/gemini-3.6-flash",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchSpy);

    const onExtractionApplied = vi.fn().mockReturnValue({
      filledFields: [],
      unmatchedTown: "Vila Desconeguda",
      pastDate: false,
      dateInferred: false,
      priceNeedsReview: false,
      isMultiEvent: false,
    });

    render(
      <PosterAutofillCard
        currentImageFile={sampleFile}
        currentImagePreview="data:image/jpeg;base64,abc"
        isAuthenticated={true}
        isAuthLoading={false}
        onRequestAuthForScan={vi.fn()}
        onPosterPrepared={vi.fn()}
        onExtractionApplied={onExtractionApplied}
        canUndo={false}
        onUndo={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByTestId("poster-autofill-input"), {
      target: { files: [sampleFile] },
    });

    await waitFor(() =>
      expect(screen.getByTestId("poster-autofill-warnings")).toHaveTextContent(
        "Vila Desconeguda",
      ),
    );
    expect(screen.queryByTestId("poster-autofill-empty")).not.toBeInTheDocument();
  });

  it("clears unmatched-town and past-date warnings reactively, merges deferred fields, and resets when poster is removed externally", async () => {
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
            model: "gemini/gemini-3.5-flash-lite",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchSpy);

    const onExtractionApplied = vi.fn().mockResolvedValue({
      filledFields: ["title", "dates"],
      unmatchedTown: "Vila Desconeguda",
      pastDate: true,
      dateInferred: false,
      priceNeedsReview: false,
      isMultiEvent: false,
    });

    const baseProps = {
      currentImageFile: sampleFile,
      currentImagePreview: "data:image/jpeg;base64,abc",
      isAuthenticated: true,
      isAuthLoading: false,
      onRequestAuthForScan: vi.fn(),
      onPosterPrepared: vi.fn(),
      onExtractionApplied,
      canUndo: true,
      onUndo: vi.fn(),
    };

    const { rerender } = render(
      <PosterAutofillCard
        {...baseProps}
        hasSelectedTown={false}
        isFormDateEnded={true}
      />,
    );

    fireEvent.change(screen.getByTestId("poster-autofill-input"), {
      target: { files: [sampleFile] },
    });

    await waitFor(() =>
      expect(screen.getByTestId("poster-autofill-warnings")).toHaveTextContent(
        "Vila Desconeguda",
      ),
    );
    expect(screen.getByTestId("poster-autofill-warnings")).toHaveTextContent(
      "posterAutofill.warningPastDate",
    );

    // Deferred catalog fill adds "categories" to the summary list; resolving town & date clears both warnings
    rerender(
      <PosterAutofillCard
        {...baseProps}
        deferredFilledFields={["categories"]}
        hasSelectedTown={true}
        isFormDateEnded={false}
      />,
    );
    expect(screen.getByTestId("poster-autofill-success")).toHaveTextContent(
      "posterAutofill.fields.categories",
    );
    expect(
      screen.queryByTestId("poster-autofill-warnings"),
    ).not.toBeInTheDocument();

    // Removing the poster externally from Step 3 resets the card back to idle
    rerender(
      <PosterAutofillCard
        {...baseProps}
        currentImageFile={null}
        currentImagePreview={null}
        canUndo={false}
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId("poster-autofill-card")).toHaveAttribute(
        "data-phase",
        "idle",
      ),
    );
    expect(screen.getByTestId("poster-autofill-pick")).toHaveTextContent(
      "posterAutofill.pickButton",
    );
  });
});

describe("usePublishPosterAutofill publish accuracy telemetry", () => {
  const emptyForm: FormData = {
    title: "",
    description: "",
    startDate: "2027-01-01T09:00",
    startTime: "",
    endDate: "2027-01-01T10:00",
    endTime: "",
    region: null,
    town: null,
    location: "",
    url: "",
    categories: [],
    email: "",
  };

  it("emits kept vs edited per-field outcomes on publish and clears telemetry after Undo", async () => {
    const autoDatesRef = { current: true };
    const handoffStartedRef = { current: false };
    const handedOffRef = { current: false };

    const { result } = renderHook(() => {
      const [form, setForm] = useState<FormData>(emptyForm);
      return usePublishPosterAutofill({
        form,
        setForm,
        autoDatesRef,
        cityOptions: [{ value: "10", label: "Cardedeu", placeType: "town" }],
        cityToRegionOptionMap: {
          "10": { value: "100", label: "Vallès Oriental", placeType: "region" },
        },
        categories: [{ id: 1, name: "Concerts", slug: "concerts" }],
        isLoadingCities: false,
        isLoadingCategories: false,
        isAuthLoading: false,
        locale: "ca",
        signIn: vi.fn(),
        prepareResume: vi.fn(),
        draftOwnerChanged: false,
        markEdited: vi.fn(),
        trackFieldInteraction: vi.fn(),
        setImageFile: vi.fn(),
        updateImagePreview: vi.fn(),
        setError: vi.fn(),
        setHandingOff: vi.fn(),
        handoffStartedRef,
        handedOffRef,
        draftHandoffFailedMessage: "handoff-failed",
      });
    });

    await act(async () => {
      await result.current.handlePosterExtractionApplied(EXTRACTED, {
        model: "gemini/gemini-3.5-flash-lite",
      });
    });

    // User manually edits title and dates before publishing; leaves description/town/location/categories/price intact
    act(() => {
      result.current.trackFormFieldOwnership("title", false);
      result.current.trackFormFieldOwnership("startDate", false);
    });

    let publishMeta: ReturnType<
      typeof result.current.reportPosterAutofillPublishOutcome
    >;
    act(() => {
      publishMeta = result.current.reportPosterAutofillPublishOutcome();
    });

    expect(publishMeta!).toEqual({
      poster_autofill_used: true,
      poster_autofill_filled_count: 7,
      poster_autofill_edited_count: 2,
      mode: "gemini/gemini-3.5-flash-lite",
    });
    expect(mocks.sendGoogleEvent).toHaveBeenCalledWith(
      "publish_poster_autofill_field",
      {
        source: "publica",
        element: "title",
        outcome: "edited",
        mode: "gemini/gemini-3.5-flash-lite",
      },
    );
    expect(mocks.sendGoogleEvent).toHaveBeenCalledWith(
      "publish_poster_autofill_field",
      {
        source: "publica",
        element: "town",
        outcome: "kept",
        mode: "gemini/gemini-3.5-flash-lite",
      },
    );

    // Undoing autofill clears the snapshot so a later manual publish reports unused
    act(() => {
      result.current.handlePosterUndo();
    });
    expect(result.current.reportPosterAutofillPublishOutcome()).toEqual({
      poster_autofill_used: false,
    });
  });
});
