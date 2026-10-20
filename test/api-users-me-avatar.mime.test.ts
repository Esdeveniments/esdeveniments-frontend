// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../app/api/users/me/avatar/route";

vi.mock("../utils/auth-cookies", () => ({
  getValidAccessToken: vi.fn().mockResolvedValue("tok"),
}));
vi.mock("../lib/api/users-external", () => ({
  uploadUserAvatarExternal: vi.fn().mockResolvedValue({ avatarUrl: "https://cdn/a.png" }),
  deleteUserAvatarExternal: vi.fn(),
}));

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);

async function post(type: string, content: Uint8Array<ArrayBuffer> = PNG_BYTES) {
  const form = new FormData();
  form.append("avatarFile", new File([content], "a", { type }));
  const body = new Response(form);
  const bytes = await body.arrayBuffer();
  return POST(
    new NextRequest("http://localhost/api/users/me/avatar", {
      method: "POST",
      headers: {
        "content-type": body.headers.get("content-type") ?? "",
        "content-length": String(bytes.byteLength),
      },
      body: bytes,
    }),
  );
}

describe("POST /api/users/me/avatar MIME allowlist", () => {
  it("accepts PNG", async () => {
    expect((await post("image/png")).status).toBe(200);
  });

  it("accepts JPEG", async () => {
    expect((await post("image/jpeg", JPEG_BYTES)).status).toBe(200);
  });

  it("rejects PNG-labelled bytes that are not an image", async () => {
    expect((await post("image/png", new Uint8Array([1, 2, 3]))).status).toBe(415);
  });

  it("rejects WebP, which the backend no longer accepts", async () => {
    expect((await post("image/webp")).status).toBe(415);
  });
});
