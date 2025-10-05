import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import Grid from "./Grid";
import { ListEvent } from "types/api/event";

const mockEvents = [
  { id: "1", title: "Event 1", isAd: false },
  { id: "2", title: "Event 2", isAd: false },
] as ListEvent[];

const mockChildren = (event: any, index: number) => (
  <div key={event.id} data-testid={`event-${index}`}>
    {event.title}
  </div>
);

describe("Grid", () => {
  it("renders events using children function", () => {
    render(<Grid events={mockEvents}>{mockChildren}</Grid>);
    expect(screen.getByTestId("event-0")).toHaveTextContent("Event 1");
    expect(screen.getByTestId("event-1")).toHaveTextContent("Event 2");
  });

  it("applies default className", () => {
    const { container } = render(
      <Grid events={mockEvents}>{mockChildren}</Grid>,
    );
    const section = container.firstChild as HTMLElement;
    expect(section).toHaveClass(
      "grid",
      "grid-cols-1",
      "md:grid-cols-2",
      "lg:grid-cols-3",
      "gap-component-md",
    );
  });

  it("applies custom className", () => {
    const { container } = render(
      <Grid events={mockEvents} className="custom-class">
        {mockChildren}
      </Grid>,
    );
    const section = container.firstChild as HTMLElement;
    expect(section).toHaveClass("custom-class");
  });

  it("renders nothing when no events", () => {
    const { container } = render(<Grid events={[]}>{mockChildren}</Grid>);
    expect((container.firstChild as Element)?.children).toHaveLength(0);
  });

  describe("accessibility", () => {
    it("passes axe-core accessibility checks", async () => {
      const { container } = render(
        <Grid events={mockEvents}>{mockChildren}</Grid>,
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
