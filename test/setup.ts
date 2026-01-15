import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("next-intl", () => import("./mocks/next-intl"));
vi.mock("next-intl/server", () => import("./mocks/next-intl-server"));

process.env.HMAC_SECRET = "test-secret";

configure({
  testIdAttribute: "data-testid",
});

/**
 * Polyfill Blob.prototype.arrayBuffer for jsdom
 * jsdom's Blob doesn't implement arrayBuffer(), which breaks file content validation in tests
 */
if (typeof Blob !== "undefined" && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function (): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}