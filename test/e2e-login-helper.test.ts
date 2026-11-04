import { describe, expect, it } from "vitest";
import {
  isLoginCompleteUrl,
  isPasskeySetupUrl,
} from "../e2e/helpers/login";

describe("E2E Logto login URL helpers", () => {
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
