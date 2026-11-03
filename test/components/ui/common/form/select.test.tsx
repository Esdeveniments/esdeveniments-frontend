import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SelectComponent from "@components/ui/common/form/select";

const barcelona = { value: "bcn", label: "Barcelona" };
const girona = { value: "gir", label: "Girona" };
const options = [barcelona, girona];

function pickFirstOption(inputId: string) {
  const input = document.getElementById(inputId) as HTMLInputElement;
  fireEvent.keyDown(input, { key: "ArrowDown" });
  fireEvent.keyDown(input, { key: "Enter" });
}

describe("SelectComponent", () => {
  it("shows a new value from the parent and keeps the user's pick", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <SelectComponent id="town" title="Town" value={barcelona} onChange={onChange} options={options} />
    );
    expect(screen.getByText("Barcelona")).toBeInTheDocument();

    rerender(
      <SelectComponent id="town" title="Town" value={girona} onChange={onChange} options={options} />
    );
    expect(screen.getByText("Girona")).toBeInTheDocument();
    expect(screen.queryByText("Barcelona")).not.toBeInTheDocument();

    rerender(
      <SelectComponent id="town" title="Town" value={null} onChange={onChange} options={options} />
    );
    pickFirstOption("town-input");
    expect(onChange).toHaveBeenCalledWith(barcelona);
    expect(screen.getByText("Barcelona")).toBeInTheDocument();
  });
});
