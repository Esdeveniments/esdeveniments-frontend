import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import type { FormData } from "types/event";

vi.mock("@components/ui/common/form", async () => ({
  Input: (await import("@components/ui/common/form/input")).default,
  TextArea: (await import("@components/ui/common/form/textarea")).default,
  ImageUpload: () => null, Select: () => null, MultiSelect: () => null, DatePicker: () => null,
}));
import EventForm from "@components/ui/EventForm";

const empty: FormData = {
  title: "", description: "", startDate: "", endDate: "", startTime: null, endTime: null,
  location: "", town: null, region: null, categories: [], url: "",
};

function Harness({ initial }: { initial: FormData }) {
  const [form, setForm] = useState(initial);
  return (
    <EventForm form={form} onSubmit={vi.fn()} submitLabel="Publica" cityOptions={[]} categoryOptions={[]}
      handleFormChange={(name, value) => setForm((prev) => ({ ...prev, [name]: value }))}
      handleImageChange={vi.fn()} handleTownChange={vi.fn()} handleCategoriesChange={vi.fn()} imageToUpload={null} />
  );
}

describe("EventForm step validation", () => {
  it("keeps Next enabled and shows errors only after trying to continue", () => {
    render(<Harness initial={empty} />);
    const next = screen.getByTestId("next-button");

    expect(next).toBeEnabled();
    expect(screen.queryByText("Escriu un títol")).not.toBeInTheDocument();

    fireEvent.click(next);

    expect(screen.getByText("Pas 1 de 3")).toBeInTheDocument();
    expect(screen.getByText("Escriu un títol")).toBeInTheDocument();
    expect(screen.getByText("Escriu una descripció")).toBeInTheDocument();
    expect(document.activeElement).toBe(document.getElementById("title"));

    fireEvent.change(document.getElementById("title")!, { target: { value: "Concert" } });
    expect(screen.queryByText("Escriu un títol")).not.toBeInTheDocument();
  });

  it("rejects a link that is not a real address and accepts a valid one", () => {
    render(<Harness initial={{ ...empty, title: "Concert", description: "Una descripció", url: "hola" }} />);

    fireEvent.click(screen.getByTestId("next-button"));

    expect(screen.getByText("Pas 1 de 3")).toBeInTheDocument();
    expect(screen.getByText("Escriu un enllaç vàlid, com ara exemple.cat")).toBeInTheDocument();
    expect(document.activeElement).toBe(document.getElementById("url"));

    fireEvent.change(document.getElementById("url")!, { target: { value: "esdeveniments.cat" } });
    fireEvent.click(screen.getByTestId("next-button"));

    expect(screen.getByText("Pas 2 de 3")).toBeInTheDocument();
  });
});
