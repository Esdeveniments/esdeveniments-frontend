import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Activity, type ComponentType } from "react";
import type { EventFormProps } from "types/event";
import type { PublishDraft, UsePublishDraftOptions } from "types/publish-draft";

const mocks = vi.hoisted(() => ({
  draftOptions: null as UsePublishDraftOptions | null,
  createEventAction: vi.fn(),
}));

vi.mock("@i18n/routing", () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
  getPathname: () => "/",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@sentry/nextjs", () => ({ addBreadcrumb: vi.fn(), captureException: vi.fn() }));
vi.mock("@utils/analytics", () => ({ sendGoogleEvent: vi.fn() }));
vi.mock("../app/[locale]/publica/actions", () => ({ createEventAction: mocks.createEventAction }));
vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "u1", profileCompleted: true }, signIn: vi.fn(), isAuthenticated: true, isLoading: false }),
}));
vi.mock("@components/hooks/useGetRegionsWithCities", () => ({
  useGetRegionsWithCities: () => ({ regionsWithCities: [], isLoading: false, isError: false, mutate: vi.fn() }),
}));
vi.mock("@components/hooks/useCategories", () => ({
  useCategories: () => ({ categories: [], isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@components/hooks/usePublishDraft", () => ({
  usePublishDraft: (options: UsePublishDraftOptions) => {
    mocks.draftOptions = options;
    return {
      status: "idle", pendingDraft: null, failure: null, dirty: false, canDiscard: false, guestConflict: false,
      ownerChanged: false, markEdited: vi.fn(), restore: vi.fn(), restoreGuest: vi.fn(), discard: vi.fn(),
      retry: vi.fn(), flush: vi.fn(), complete: vi.fn(), prepareResume: vi.fn(), resumeFailed: vi.fn(),
      claimPublication: vi.fn(),
    };
  },
}));
// Only the dates and the submit matter here; the real wizard is covered elsewhere.
vi.mock("@components/ui/EventForm", () => ({
  default: ({ form, onSubmit }: EventFormProps) => (
    <div>
      <output data-testid="start">{form.startDate}</output>
      <output data-testid="end">{form.endDate}</output>
      <button type="button" onClick={(event) => { void onSubmit(event); }}>submit</button>
    </div>
  ),
}));

const loadPublishForm = async (): Promise<ComponentType> =>
  (await import("../app/[locale]/publica/PublishForm")).default;

const restore = (form: PublishDraft["form"]) =>
  act(() => mocks.draftOptions?.onRestore({ form, imageFile: null, updatedAt: 0 }));

describe("publish form default dates (#534)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
    mocks.createEventAction.mockReset();
  });

  it("uses the day the form opens, not the day the module loaded", async () => {
    vi.setSystemTime(new Date(2026, 10, 19, 23, 50));
    const PublishForm = await loadPublishForm();
    vi.setSystemTime(new Date(2026, 10, 20, 8, 0));
    render(<PublishForm />);
    expect(screen.getByTestId("start").textContent).toBe("2026-11-20T09:00");
    expect(screen.getByTestId("end").textContent).toBe("2026-11-20T10:00");
  });

  it("refreshes untouched defaults when Next shows the route again the next day", async () => {
    vi.setSystemTime(new Date(2026, 10, 19, 23, 50));
    const PublishForm = await loadPublishForm();
    const shown = (mode: "visible" | "hidden") => <Activity mode={mode}><PublishForm /></Activity>;
    const { rerender } = render(shown("visible"));
    expect(screen.getByTestId("start").textContent).toBe("2026-11-19T09:00");
    rerender(shown("hidden"));
    vi.setSystemTime(new Date(2026, 10, 20, 8, 0));
    rerender(shown("visible"));
    expect(screen.getByTestId("start").textContent).toBe("2026-11-20T09:00");
    expect(screen.getByTestId("end").textContent).toBe("2026-11-20T10:00");
  });

  it("keeps restored dates when Next shows the route again", async () => {
    vi.setSystemTime(new Date(2026, 10, 19, 23, 50));
    const PublishForm = await loadPublishForm();
    const shown = (mode: "visible" | "hidden") => <Activity mode={mode}><PublishForm /></Activity>;
    const { rerender } = render(shown("visible"));
    restore({ title: "Concert", startDate: "2026-11-19T09:00", endDate: "2026-11-19T12:00" });
    rerender(shown("hidden"));
    vi.setSystemTime(new Date(2026, 10, 20, 8, 0));
    rerender(shown("visible"));
    expect(screen.getByTestId("start").textContent).toBe("2026-11-19T09:00");
    expect(screen.getByText(/comença en una data passada/)).toBeTruthy();
  });

  it("gives a discarded form fresh defaults", async () => {
    vi.setSystemTime(new Date(2026, 10, 20, 8, 0));
    const PublishForm = await loadPublishForm();
    render(<PublishForm />);
    vi.setSystemTime(new Date(2026, 10, 21, 7, 0));
    act(() => mocks.draftOptions?.onReset());
    expect(screen.getByTestId("start").textContent).toBe("2026-11-21T09:00");
  });

  it("keeps a restored draft's past dates, flags them and refuses to publish", async () => {
    vi.setSystemTime(new Date(2026, 10, 20, 8, 0));
    const PublishForm = await loadPublishForm();
    render(<PublishForm />);
    restore({ title: "Concert", startDate: "2026-11-18T19:00", endDate: "2026-11-18T21:00" });
    expect(screen.getByTestId("start").textContent).toBe("2026-11-18T19:00");
    expect(screen.getByText(/comença en una data passada/)).toBeTruthy();

    fireEvent.click(screen.getByText("submit"));
    expect(await screen.findByText(/ja s'ha acabat/)).toBeTruthy();
    expect(mocks.createEventAction).not.toHaveBeenCalled();
    expect(screen.getByTestId("start").textContent).toBe("2026-11-18T19:00");
  });

  it("flags a form left open overnight on its next render without moving its dates", async () => {
    vi.setSystemTime(new Date(2026, 10, 19, 22, 0));
    const PublishForm = await loadPublishForm();
    const { rerender } = render(<PublishForm />);
    expect(screen.queryByText(/comença en una data passada/)).toBeNull();

    vi.setSystemTime(new Date(2026, 10, 20, 8, 0));
    rerender(<PublishForm />);
    expect(screen.getByText(/comença en una data passada/)).toBeTruthy();
    expect(screen.getByTestId("start").textContent).toBe("2026-11-19T09:00");
    fireEvent.click(screen.getByText("submit"));
    expect(await screen.findByText(/ja s'ha acabat/)).toBeTruthy();
    expect(mocks.createEventAction).not.toHaveBeenCalled();
  });

  it("still publishes a run that started earlier and ends later", async () => {
    vi.setSystemTime(new Date(2026, 10, 20, 8, 0));
    const PublishForm = await loadPublishForm();
    render(<PublishForm />);
    restore({ title: "Exposició", startDate: "2026-11-01T10:00", endDate: "2026-12-01T20:00" });
    expect(screen.getByText(/comença en una data passada/)).toBeTruthy();
    fireEvent.click(screen.getByText("submit"));
    expect(screen.queryByText(/ja s'ha acabat/)).toBeNull();
  });
});
