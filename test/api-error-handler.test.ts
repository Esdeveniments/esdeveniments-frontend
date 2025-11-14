import { describe, it, expect } from "vitest";
import { getSanitizedErrorMessage } from "@utils/api-error-handler";

describe("getSanitizedErrorMessage", () => {
  it("returns error message for Error instances", () => {
    const error = new Error("Something went wrong");
    expect(getSanitizedErrorMessage(error)).toBe("Something went wrong");
  });

  it("returns the string for string inputs", () => {
    expect(getSanitizedErrorMessage("String error")).toBe("String error");
    expect(getSanitizedErrorMessage("")).toBe("");
  });

  it("returns 'Unknown error' for non-Error, non-string inputs", () => {
    expect(getSanitizedErrorMessage(null)).toBe("Unknown error");
    expect(getSanitizedErrorMessage(undefined)).toBe("Unknown error");
    expect(getSanitizedErrorMessage(123)).toBe("Unknown error");
    expect(getSanitizedErrorMessage({})).toBe("Unknown error");
    expect(getSanitizedErrorMessage([])).toBe("Unknown error");
    expect(getSanitizedErrorMessage(true)).toBe("Unknown error");
  });

  it("handles Error instances with empty messages", () => {
    const error = new Error("");
    expect(getSanitizedErrorMessage(error)).toBe("");
  });

  it("handles Error instances with complex messages", () => {
    const error = new Error("Error: HTTP 500 - Internal Server Error");
    expect(getSanitizedErrorMessage(error)).toBe(
      "Error: HTTP 500 - Internal Server Error"
    );
  });

  it("handles custom Error subclasses", () => {
    class CustomError extends Error {
      constructor(message: string) {
        super(message);
        this.name = "CustomError";
      }
    }
    const error = new CustomError("Custom error message");
    expect(getSanitizedErrorMessage(error)).toBe("Custom error message");
  });
});

