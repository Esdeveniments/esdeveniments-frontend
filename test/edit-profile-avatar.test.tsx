import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AuthUser } from "types/auth";

const baseUser: AuthUser = {
  id: "user-1",
  email: "alex@example.com",
  name: "Alex Garcia",
  username: "alex91",
  avatarUrl: undefined,
};

let authUser: AuthUser = baseUser;
const mockRefetchUser = vi.fn();

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ user: authUser, refetchUser: mockRefetchUser }),
}));

import EditProfileAvatar from "@app/[locale]/perfil/edita/EditProfileAvatar";

function makeFile(name: string, type: string, sizeBytes: number): File {
  const file = new File([new Uint8Array(sizeBytes)], name, { type });
  return file;
}

describe("EditProfileAvatar", () => {
  beforeEach(() => {
    authUser = baseUser;
    mockRefetchUser.mockReset().mockResolvedValue(undefined);
    vi.stubGlobal("fetch", vi.fn());
  });

  it("shows the initial-letter fallback when there is no avatarUrl", () => {
    render(<EditProfileAvatar />);
    expect(screen.getByRole("img", { name: "Alex Garcia" })).toBeInTheDocument();
    expect(screen.queryByText("removeButton")).toBeNull();
  });

  it("shows a remove button once an avatarUrl is set", () => {
    authUser = { ...baseUser, avatarUrl: "https://cdn.example.com/a.jpg" };
    render(<EditProfileAvatar />);
    expect(screen.getByText("removeButton")).toBeInTheDocument();
  });

  it("gives a transparent-background upload a neutral backdrop", () => {
    authUser = { ...baseUser, avatarUrl: "https://cdn.example.com/a.jpg" };
    render(<EditProfileAvatar />);
    expect(screen.getByAltText("altPreview")).toHaveClass("bg-background");
  });

  it("rejects an unsupported file type locally, without uploading", async () => {
    render(<EditProfileAvatar />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("avatar.gif", "image/gif", 1024);
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText("errorUnsupported")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects an oversized file locally, without uploading", async () => {
    render(<EditProfileAvatar />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("avatar.jpg", "image/jpeg", 3 * 1024 * 1024);
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText("errorTooLarge")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uploads a valid file with the avatarFile field and refetches the session", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ avatarUrl: "https://cdn.example.com/a.jpg" }),
    } as Response);

    render(<EditProfileAvatar />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("avatar.jpg", "image/jpeg", 1024);
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(mockRefetchUser).toHaveBeenCalledTimes(1));
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/users/me/avatar");
    expect((init as RequestInit).method).toBe("POST");
    const body = (init as RequestInit).body as FormData;
    expect(body.get("avatarFile")).toBe(file);
  });

  it("removes the avatar and refetches the session", async () => {
    authUser = { ...baseUser, avatarUrl: "https://cdn.example.com/a.jpg" };
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ ok: true }),
    } as Response);

    render(<EditProfileAvatar />);
    fireEvent.click(screen.getByText("removeButton"));

    await waitFor(() => expect(mockRefetchUser).toHaveBeenCalledTimes(1));
    expect(fetch).toHaveBeenCalledWith(
      "/api/users/me/avatar",
      expect.objectContaining({ method: "DELETE", credentials: "include" }),
    );
  });

  it("surfaces an upload failure without refetching", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve(null),
    } as Response);

    render(<EditProfileAvatar />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("avatar.jpg", "image/jpeg", 1024);
    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByText("errorUploadFailed")).toBeInTheDocument();
    expect(mockRefetchUser).not.toHaveBeenCalled();
  });
});
