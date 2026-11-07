import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ImageServer from "@components/ui/common/image/ImageServer";
import ClientImage from "@components/ui/common/image/ClientImage";

// Cards pass alt="" (the title link names the card). The placeholder shown for a
// missing or unusable image must then stay silent too, or the title is read twice.
describe("decorative card image (alt=\"\")", () => {
  it("server placeholder has no image role", () => {
    const { container } = render(<ImageServer title="Concert" alt="" />);
    expect(container.querySelector('[role="img"]')).toBeNull();
    expect(container.querySelector("[aria-label]")).toBeNull();
  });

  it("client placeholder (unusable URL) has no image role", () => {
    const { container } = render(<ClientImage title="Concert" image="   " alt="" />);
    expect(container.querySelector('[role="img"]')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
  });

  it("other callers keep the labelled placeholder", () => {
    const server = render(<ImageServer title="Concert" />);
    expect(server.container.querySelector('[role="img"][aria-label="Concert"]')).not.toBeNull();
    server.unmount();

    const client = render(<ClientImage title="Concert" image="   " />);
    expect(client.container.querySelector('[role="img"][aria-label="Concert"]')).not.toBeNull();
  });
});
