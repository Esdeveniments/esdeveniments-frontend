import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Link } from "@i18n/routing";
import PressableAnchorClient from "@components/ui/primitives/PressableAnchorClient";
import PressableLink from "@components/ui/primitives/PressableLink";

// An AdSense vignette on a client-side link restores the old page's scroll
// position onto the new page, so in-app links opt out of vignettes.
describe("AdSense vignette opt-out on in-app links", () => {
  it("marks i18n Links", () => {
    render(<Link href="/barcelona">place</Link>);
    expect(screen.getByRole("link")).toHaveAttribute("data-google-vignette", "false");
  });

  it.each([
    ["PressableAnchorClient", PressableAnchorClient],
    ["PressableLink", PressableLink],
  ])("%s marks internal links and leaves external ones alone", (_, Component) => {
    render(
      <>
        <Component href="/e/some-event">internal</Component>
        <Component href="https://example.com">external</Component>
      </>,
    );
    expect(screen.getByText("internal").closest("a")).toHaveAttribute(
      "data-google-vignette",
      "false",
    );
    expect(screen.getByText("external").closest("a")).not.toHaveAttribute(
      "data-google-vignette",
    );
  });
});
