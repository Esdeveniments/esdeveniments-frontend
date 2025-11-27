import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";

process.env.HMAC_SECRET = "test-secret";

configure({
  testIdAttribute: "data-testid",
});
