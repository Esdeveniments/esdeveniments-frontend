import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { FormData } from "types/event";

const compress = vi.hoisted(() => vi.fn());
vi.mock("@utils/image-optimizer", () => ({ compressImageIfNeeded: compress }));
vi.mock("@components/ui/common/form", async () => ({
  ImageUpload: (await import("@components/ui/common/form/imageUpload")).default,
  Input: () => null, Select: () => null, TextArea: () => null,
  MultiSelect: () => null, DatePicker: () => null,
}));
import EventForm from "@components/ui/EventForm";

const form: FormData = {
  title: "Concert de prova", description: "Descripcio del concert per provar el formulari.",
  startDate: "2099-10-25T18:00", endDate: "2099-10-25T20:00",
  startTime: null, endTime: null, location: "Teatre",
  town: { value: "2", label: "Barcelona" }, region: { value: "1", label: "Barcelones" },
  categories: [{ value: "3", label: "Musica" }], url: "",
};

afterEach(() => vi.useRealTimers());

describe("EventForm image preparation", () => {
  it("blocks Save, preview and explicit submit until the selected cover is ready", async () => {
    vi.useFakeTimers();
    const pending = Promise.withResolvers<File>();
    compress.mockReturnValueOnce(pending.promise);
    const onSubmit = vi.fn();
    const onImage = vi.fn();
    render(
      <EventForm form={form} onSubmit={onSubmit} submitLabel="Save" isEditMode
        cityOptions={[]} categoryOptions={[]} handleFormChange={vi.fn()}
        handleImageChange={onImage} handleTownChange={vi.fn()} handleCategoriesChange={vi.fn()}
        imageToUpload="https://example.com/old.jpg" onPreview={vi.fn()} canPreview />,
    );
    fireEvent.click(screen.getByTestId("next-button"));
    fireEvent.click(screen.getByTestId("next-button"));
    act(() => vi.advanceTimersByTime(300));
    const save = screen.getByTestId("publish-button");
    expect(save).toBeEnabled();
    const large = new File(["large"], "large.jpg", { type: "image/jpeg" });
    Object.defineProperty(large, "size", { value: 9 * 1024 * 1024 });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [large] } });
    expect(save).toBeDisabled();
    expect(screen.getByTestId("preview-button")).toBeDisabled();
    fireEvent.submit(screen.getByTestId("event-form"), { submitter: save });
    expect(onSubmit).not.toHaveBeenCalled();
    const ready = new File(["ready"], "ready.jpg", { type: "image/jpeg" });
    await act(async () => pending.resolve(ready));
    expect(onImage).toHaveBeenCalledWith(ready);
    expect(save).toBeEnabled();
    expect(screen.getByTestId("preview-button")).toBeEnabled();
    fireEvent.click(save);
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("clears the preparing flag when the uploader unmounts mid-compression", async () => {
    vi.useFakeTimers();
    const pending = Promise.withResolvers<File>();
    compress.mockReturnValueOnce(pending.promise);
    const onImage = vi.fn();
    render(
      <EventForm form={form} onSubmit={vi.fn()} submitLabel="Save" isEditMode
        cityOptions={[]} categoryOptions={[]} handleFormChange={vi.fn()}
        handleImageChange={onImage} handleTownChange={vi.fn()} handleCategoriesChange={vi.fn()}
        imageToUpload="https://example.com/old.jpg" onPreview={vi.fn()} canPreview />,
    );
    fireEvent.click(screen.getByTestId("next-button"));
    fireEvent.click(screen.getByTestId("next-button"));
    act(() => vi.advanceTimersByTime(300));
    const large = new File(["large"], "large.jpg", { type: "image/jpeg" });
    Object.defineProperty(large, "size", { value: 9 * 1024 * 1024 });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [large] } });
    expect(screen.getByTestId("publish-button")).toBeDisabled();
    fireEvent.click(screen.getAllByRole("button", { name: /, completat$/ })[0]);
    expect(document.querySelector('input[type="file"]')).toBeNull();
    await act(async () => pending.resolve(new File(["ready"], "ready.jpg", { type: "image/jpeg" })));
    expect(onImage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("next-button"));
    fireEvent.click(screen.getByTestId("next-button"));
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByTestId("publish-button")).toBeEnabled();
  });
});

describe("EventForm publish arming", () => {
  it("does not mark an unchanged progress step as edited", () => {
    const onStepChange = vi.fn();
    render(
      <EventForm form={form} onSubmit={vi.fn()} submitLabel="Save" isEditMode
        cityOptions={[]} categoryOptions={[]} handleFormChange={vi.fn()}
        handleImageChange={vi.fn()} handleTownChange={vi.fn()} handleCategoriesChange={vi.fn()}
        imageToUpload="https://example.com/old.jpg" initialStep={2} onStepChange={onStepChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /, pas actual$/ }));
    expect(onStepChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("prev-button"));
    expect(onStepChange).toHaveBeenCalledExactlyOnceWith(1);
  });
  it("marks the form armed only once it accepts a publish click", () => {
    vi.useFakeTimers();
    const onSubmit = vi.fn();
    render(
      <EventForm form={form} onSubmit={onSubmit} submitLabel="Save" isEditMode
        cityOptions={[]} categoryOptions={[]} handleFormChange={vi.fn()}
        handleImageChange={vi.fn()} handleTownChange={vi.fn()} handleCategoriesChange={vi.fn()}
        imageToUpload="https://example.com/old.jpg" />,
    );
    const formEl = screen.getByTestId("event-form");
    fireEvent.click(screen.getByTestId("next-button"));
    fireEvent.click(screen.getByTestId("next-button"));
    expect(formEl).toHaveAttribute("data-publish-armed", "false");
    fireEvent.click(screen.getByTestId("publish-button"));
    expect(onSubmit).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(300));
    expect(formEl).toHaveAttribute("data-publish-armed", "true");
    fireEvent.click(screen.getByTestId("publish-button"));
    expect(onSubmit).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByTestId("prev-button"));
    expect(formEl).toHaveAttribute("data-publish-armed", "false");
    fireEvent.click(screen.getByTestId("next-button"));
    expect(formEl).toHaveAttribute("data-publish-armed", "false");
    act(() => vi.advanceTimersByTime(300));
    expect(formEl).toHaveAttribute("data-publish-armed", "true");
  });
});
