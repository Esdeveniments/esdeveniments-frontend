import { describe, it, expect } from "vitest";
import { getProfileSlug } from "../utils/user-helpers";

const baseUser = {
  id: "user-123",
  name: "Joan Doe",
  username: "joan-doe",
  email: "joan@example.com",
};

describe("getProfileSlug", () => {
  it("prefers username", () => {
    expect(getProfileSlug(baseUser)).toBe("joan-doe");
  });

  it("falls back to a sanitized display name when username is missing", () => {
    expect(getProfileSlug({ ...baseUser, username: "" })).toBe("joan-doe");
  });

  it("falls back to user id when name is an email", () => {
    expect(
      getProfileSlug({
        id: "user-123",
        name: "esdevenimentscatalunyacat@gmail.com",
        username: "",
        email: "esdevenimentscatalunyacat@gmail.com",
      }),
    ).toBe("user-123");
  });

  it("falls back to user id when name equals the user's email", () => {
    expect(
      getProfileSlug({
        id: "user-456",
        name: "joan@example.com",
        username: "",
        email: "joan@example.com",
      }),
    ).toBe("user-456");
  });

  it("falls back to user id when name is empty", () => {
    expect(
      getProfileSlug({
        id: "user-789",
        name: "",
        username: "",
        email: "joan@example.com",
      }),
    ).toBe("user-789");
  });

  it("returns an empty string for a null/undefined user", () => {
    expect(getProfileSlug(null)).toBe("");
    expect(getProfileSlug(undefined)).toBe("");
  });
});
