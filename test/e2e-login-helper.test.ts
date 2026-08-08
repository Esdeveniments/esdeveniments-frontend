import { describe, expect, it, vi } from "vitest";
import {
  getPasskeySkipControl,
  isLoginCompleteUrl,
  isPasskeySetupUrl,
  PASSKEY_NAV_CONTROL_SELECTOR,
} from "../e2e/helpers/login";

describe("E2E Logto login URL helpers", () => {
  it("uses a role-based selector for Logto's passkey navigation controls", () => {
    expect(PASSKEY_NAV_CONTROL_SELECTOR).toBe('[role="button"]');
  });

  it("requires Back and Skip controls and targets Skip", async () => {
    const control = { waitFor: vi.fn().mockResolvedValue(undefined) };
    const first = vi.fn(() => control);
    const nth = vi.fn(() => control);
    const controls = {
      count: vi.fn().mockResolvedValue(2),
      first,
      nth,
    };
    const page = {
      locator: (selector: string) => {
        expect(selector).toBe('[role="button"]');
        return controls;
      },
    };

    await expect(getPasskeySkipControl(page as never)).resolves.toBe(control);
    expect(first).toHaveBeenCalledOnce();
    expect(nth).toHaveBeenCalledWith(1);
  });

  it("fails closed if Logto changes the navigation control structure", async () => {
    const controls = {
      count: vi.fn().mockResolvedValue(1),
      first: () => ({ waitFor: vi.fn().mockResolvedValue(undefined) }),
      nth: () => ({ waitFor: vi.fn().mockResolvedValue(undefined) }),
    };
    const page = {
      locator: () => controls,
    };

    await expect(getPasskeySkipControl(page as never)).rejects.toThrow(
      "expected 2, found 1",
    );
  });

  describe("isPasskeySetupUrl", () => {
    it("recognizes Logto's create-passkey page with query parameters", () => {
      expect(
        isPasskeySetupUrl(
          new URL("https://auth-preproduction.example.com/create-passkey?app_id=test"),
        ),
      ).toBe(true);
    });

    it("does not match similarly named paths", () => {
      expect(
        isPasskeySetupUrl(
          new URL("https://auth-preproduction.example.com/create-passkey-help"),
        ),
      ).toBe(false);
    });
  });

  describe("isLoginCompleteUrl", () => {
    it("accepts the app callback URL", () => {
      expect(
        isLoginCompleteUrl(
          new URL("http://localhost:3000/en/publica"),
          "http://localhost:3000",
        ),
      ).toBe(true);
    });

    it("requires the captured app origin and rejects login/error routes", () => {
      const incompleteUrls = [
        [
          "http://another-host:3000/en/publica?auth_success=1",
          "http://localhost:3000",
        ],
        [
          "http://localhost:3000/en/iniciar-sessio",
          "http://localhost:3000",
        ],
        [
          "http://localhost:3000/?auth_error=exchange",
          "http://localhost:3000",
        ],
        [
          "https://auth-preproduction.example.com/create-passkey?app_id=test",
          "http://localhost:3000",
        ],
      ] as const;

      for (const [url, appOrigin] of incompleteUrls) {
        expect(isLoginCompleteUrl(new URL(url), appOrigin)).toBe(false);
      }
    });
  });
});
