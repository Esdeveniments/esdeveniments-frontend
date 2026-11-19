import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { AuthUser } from "types/auth";
import type { ImageUploadResult } from "types/upload";
import {
  AVATAR_MAX_DIMENSION,
  AVATAR_MIN_DIMENSION,
  IMAGE_UPLOAD_ACCEPT,
  MAX_AVATAR_BYTES,
} from "@utils/constants";

const baseUser: AuthUser = {
  id: "user-1",
  email: "alex@example.com",
  name: "Alex Garcia",
  username: "alex91",
  avatarUrl: undefined,
};

let authUser: AuthUser = baseUser;
const mockRefetchUser = vi.fn();
const mockRefresh = vi.fn();
const { sendGoogleEventMock, mockPrepare } = vi.hoisted(() => ({
  sendGoogleEventMock: vi.fn<
    (event: string, obj: Record<string, unknown>) => void
  >(),
  mockPrepare: vi.fn<(file: File, options: unknown) => Promise<ImageUploadResult>>(),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock("@components/hooks/useAuth", () => ({
  useAuth: () => ({ user: authUser, refetchUser: mockRefetchUser }),
}));

vi.mock("@i18n/routing", () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock("@utils/analytics", () => ({
  sendGoogleEvent: sendGoogleEventMock,
}));

vi.mock("@utils/image-optimizer", () => ({
  prepareImageForUpload: mockPrepare,
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
    mockRefresh.mockReset();
    sendGoogleEventMock.mockReset();
    mockPrepare
      .mockReset()
      .mockImplementation(async (file) => ({ ok: true, file, detectedType: file.type }));
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

  it("opens the picker for any image", () => {
    render(<EditProfileAvatar />);
    expect(document.querySelector('input[type="file"]')).toHaveAttribute(
      "accept",
      IMAGE_UPLOAD_ACCEPT,
    );
  });

  it.each([
    ["original_too_large", "originalTooLarge"],
    ["too_large", "tooLarge"],
    ["heic_undecodable", "heicUnsupported"],
    ["undecodable", "unreadable"],
  ] as const)("explains a %s failure without uploading", async (reason, message) => {
    mockPrepare.mockResolvedValueOnce({ ok: false, reason, detectedType: "image/heic" });
    render(<EditProfileAvatar />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile("avatar.heic", "", 1024)] } });

    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
    expect(sendGoogleEventMock).toHaveBeenCalledWith("avatar_upload_blocked", {
      reason,
      detected_type: "image/heic",
    });
  });

  it("explains a preparation crash without uploading", async () => {
    mockPrepare.mockRejectedValueOnce(new Error("canvas"));
    render(<EditProfileAvatar />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [makeFile("avatar.jpg", "image/jpeg", 1024)] } });

    expect(await screen.findByText("compressFailed")).toBeInTheDocument();
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
    const file = makeFile("avatar.webp", "image/webp", 4 * 1024 * 1024);
    const prepared = makeFile("avatar.jpg", "image/jpeg", 1024);
    mockPrepare.mockResolvedValueOnce({ ok: true, file: prepared, detectedType: "image/webp" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(mockRefetchUser).toHaveBeenCalledTimes(1));
    expect(mockPrepare).toHaveBeenCalledWith(file, {
      maxBytes: MAX_AVATAR_BYTES,
      maxDimension: AVATAR_MAX_DIMENSION,
      minDimension: AVATAR_MIN_DIMENSION,
    });
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/users/me/avatar");
    expect((init as RequestInit).method).toBe("POST");
    const body = (init as RequestInit).body as FormData;
    expect(body.get("avatarFile")).toBe(prepared);
    expect(sendGoogleEventMock).toHaveBeenCalledWith("avatar_upload_start", {});
    expect(sendGoogleEventMock).toHaveBeenCalledWith("avatar_upload_success", {});
    // Cached pages (staleTimes) would otherwise show the old avatar.
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
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
    expect(sendGoogleEventMock).toHaveBeenCalledWith("avatar_remove_success", {});
    await waitFor(() => expect(mockRefresh).toHaveBeenCalledTimes(1));
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
    expect(sendGoogleEventMock).toHaveBeenCalledWith("avatar_upload_error", {
      reason: "upload_failed",
    });
  });
});
