import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";
import { vi } from "vitest";

vi.mock("next-intl", () => import("./mocks/next-intl"));
vi.mock("next-intl/server", () => import("./mocks/next-intl-server"));

process.env.HMAC_SECRET = "test-secret";

configure({
  testIdAttribute: "data-testid",
});
