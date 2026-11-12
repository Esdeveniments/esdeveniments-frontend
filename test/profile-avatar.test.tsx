import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ProfileAvatar from "@components/ui/profile/ProfileAvatar";

const IMG_PROPS = ["complete", "naturalWidth", "currentSrc"] as const;

describe("ProfileAvatar", () => {
  it("falls back to the initial when the image failed before hydration", () => {
    // jsdom loads no images; fake one that already finished with an error.
    const values = { complete: true, naturalWidth: 0, currentSrc: "https://x/a.jpg" };
    const originals = IMG_PROPS.map(
      (prop) => [prop, Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, prop)] as const,
    );
    for (const prop of IMG_PROPS) {
      Object.defineProperty(HTMLImageElement.prototype, prop, {
        configurable: true,
        get: () => values[prop],
      });
    }

    try {
      const { container } = render(
        <ProfileAvatar avatarUrl="https://cdn.example.com/a.jpg" name="Masnou" size="sm" />,
      );
      expect(container.querySelector("img")).toBeNull();
      expect(container.textContent).toContain("M");
    } finally {
      for (const [prop, descriptor] of originals) {
        if (descriptor) Object.defineProperty(HTMLImageElement.prototype, prop, descriptor);
        else delete (HTMLImageElement.prototype as unknown as Record<string, unknown>)[prop];
      }
    }
  });
});
