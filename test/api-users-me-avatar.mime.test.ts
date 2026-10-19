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

async function post(type: string) {
  const form = new FormData();
  form.append("avatarFile", new File([new Uint8Array([1, 2, 3])], "a", { type }));
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

  it("rejects WebP, which the backend no longer accepts", async () => {
    expect((await post("image/webp")).status).toBe(415);
  });
});
