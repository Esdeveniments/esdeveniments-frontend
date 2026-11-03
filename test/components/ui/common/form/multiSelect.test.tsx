import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MultiSelectComponent from "@components/ui/common/form/multiSelect";

const barcelona = { value: "bcn", label: "Barcelona" };
const girona = { value: "gir", label: "Girona" };
const options = [barcelona, girona];

function pickFirstOption(inputId: string) {
  const input = document.getElementById(inputId) as HTMLInputElement;
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Enter" });
}

describe("MultiSelectComponent", () => {
  it("shows a new value from the parent and keeps the user's pick", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <MultiSelectComponent id="cats" title="Cats" value={[barcelona]} onChange={onChange} options={options} />
    );
    expect(screen.getByText("Barcelona")).toBeInTheDocument();

    rerender(
      <MultiSelectComponent id="cats" title="Cats" value={[girona]} onChange={onChange} options={options} />
    );
    expect(screen.getByText("Girona")).toBeInTheDocument();
    expect(screen.queryByText("Barcelona")).not.toBeInTheDocument();

    pickFirstOption("cats-input");
    expect(onChange).toHaveBeenCalledWith([girona, barcelona]);
    expect(screen.getByText("Barcelona")).toBeInTheDocument();
  });

  it("does not loop when rendered without a value", () => {
    render(<MultiSelectComponent id="empty" title="Empty" onChange={vi.fn()} options={options} />);
    expect(document.getElementById("empty-input")).toBeInTheDocument();
  });
});
