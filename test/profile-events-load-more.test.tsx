import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { sendGoogleEventMock } = vi.hoisted(() => ({ sendGoogleEventMock: vi.fn() }));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
vi.mock("@utils/analytics", () => ({ sendGoogleEvent: sendGoogleEventMock }));
vi.mock("@components/ui/card", () => ({
  default: ({ event }: { event: { id: string; title: string } }) => (
    <span data-testid="card">{event.title}</span>
  ),
}));

import ProfileEventsLoadMore from "@components/partials/ProfileEventsLoadMore";

const event = (id: string) => ({ id, title: `Event ${id}` });
const pageOf = (ids: string[], last: boolean) => ({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ content: ids.map(event), last }),
});

beforeEach(() => {
  sendGoogleEventMock.mockReset();
  vi.stubGlobal("fetch", vi.fn());
});

describe("ProfileEventsLoadMore", () => {
  it("appends the next pages, skips ids already on screen and stops at the last page", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(pageOf(["ssr", "a", "b"], false) as unknown as Response)
      .mockResolvedValueOnce(pageOf(["b", "c"], true) as unknown as Response);
    render(
      <ProfileEventsLoadMore username="sala apolo" status="past" pageSize={20} initialIds={["ssr"]} />,
    );

    fireEvent.click(screen.getByTestId("load-more-button"));
    await waitFor(() => expect(screen.getAllByTestId("card")).toHaveLength(2));
    expect(fetch).toHaveBeenCalledWith("/api/users/sala%20apolo/events?status=past&page=1&size=20");

    fireEvent.click(screen.getByTestId("load-more-button"));
    await waitFor(() =>
      expect(screen.getAllByTestId("card").map((c) => c.textContent)).toEqual([
        "Event a",
        "Event b",
        "Event c",
      ]),
    );
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain("page=2");
    expect(screen.queryByTestId("load-more-button")).toBeNull();
    expect(sendGoogleEventMock).toHaveBeenCalledWith("load_more", {
      context: "profile_events",
      status: "past",
      page: 1,
    });
  });

  it("shows an error and keeps the button so the user can retry the same page", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({ ok: false, status: 502 } as Response)
      .mockResolvedValueOnce(pageOf(["a"], true) as unknown as Response);
    render(
      <ProfileEventsLoadMore username="sala-apolo" status="upcoming" pageSize={20} initialIds={[]} />,
    );

    fireEvent.click(screen.getByTestId("load-more-button"));
    expect(await screen.findByRole("alert")).toHaveTextContent("loadMoreError");

    fireEvent.click(screen.getByTestId("load-more-button"));
    await waitFor(() => expect(screen.getAllByTestId("card")).toHaveLength(1));
    expect(vi.mocked(fetch).mock.calls[1][0]).toContain("page=1");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent("loadedCount");
  });

  it("clears the status while loading so two equal pages are both announced", async () => {
    let resolveSecond: (value: unknown) => void = () => {};
    vi.mocked(fetch)
      .mockResolvedValueOnce(pageOf(["a"], false) as unknown as Response)
      .mockReturnValueOnce(new Promise((resolve) => (resolveSecond = resolve)) as Promise<Response>);
    render(
      <ProfileEventsLoadMore username="sala-apolo" status="past" pageSize={1} initialIds={[]} />,
    );

    fireEvent.click(screen.getByTestId("load-more-button"));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("loadedCount"));

    fireEvent.click(screen.getByTestId("load-more-button"));
    await waitFor(() => expect(screen.getByRole("status").textContent).toBe(""));

    resolveSecond(pageOf(["b"], true));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("loadedCount"));
  });
});
