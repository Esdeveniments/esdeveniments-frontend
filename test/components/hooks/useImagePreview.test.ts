import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useImagePreview } from "components/hooks/useImagePreview";

class FakeReader extends EventTarget {
  static instances: FakeReader[] = [];
  result: string | null = null;
  abort = vi.fn();
  constructor() {
    super();
    FakeReader.instances.push(this);
  }
  readAsDataURL() {}
  finish(result: string) {
    this.result = result;
    this.dispatchEvent(new Event("load"));
  }
  fail() {
    this.dispatchEvent(new Event("error"));
  }
}

const file = (name: string) => new File(["x"], name, { type: "image/png" });

describe("useImagePreview", () => {
  beforeEach(() => {
    FakeReader.instances = [];
    vi.stubGlobal("FileReader", FakeReader);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("starts with the initial value", () => {
    const { result } = renderHook(() => useImagePreview("https://x/old.jpg"));
    expect(result.current[0]).toBe("https://x/old.jpg");
  });

  it("ignores the result of a superseded read", () => {
    const { result } = renderHook(() => useImagePreview(null));
    act(() => result.current[1](file("a.png")));
    act(() => result.current[1](file("b.png")));
    const [first, second] = FakeReader.instances;
    expect(first.abort).toHaveBeenCalled();
    act(() => first.finish("data:stale"));
    expect(result.current[0]).toBeNull();
    act(() => second.finish("data:fresh"));
    expect(result.current[0]).toBe("data:fresh");
  });

  it("clears the preview when the file is removed", () => {
    const { result } = renderHook(() => useImagePreview("data:old"));
    act(() => result.current[1](null));
    expect(result.current[0]).toBeNull();
  });

  it("aborts the pending read and ignores its result after unmount", () => {
    const { result, unmount } = renderHook(() => useImagePreview(null));
    act(() => result.current[1](file("a.png")));
    const [reader] = FakeReader.instances;
    unmount();
    expect(reader.abort).toHaveBeenCalled();
    expect(() => reader.finish("data:late")).not.toThrow();
  });

  it("clears the preview when the current read fails", () => {
    const { result } = renderHook(() => useImagePreview("data:old"));
    act(() => result.current[1](file("a.png")));
    act(() => FakeReader.instances[0].fail());
    expect(result.current[0]).toBeNull();
  });

  it("ignores the error of a superseded read", () => {
    const { result } = renderHook(() => useImagePreview(null));
    act(() => result.current[1](file("a.png")));
    act(() => result.current[1](file("b.png")));
    act(() => FakeReader.instances[1].finish("data:fresh"));
    act(() => FakeReader.instances[0].fail());
    expect(result.current[0]).toBe("data:fresh");
  });
});
