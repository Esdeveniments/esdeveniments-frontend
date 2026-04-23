import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePressFeedback } from "components/hooks/usePressFeedback";

function createPointerEvent(
  _type: string,
  button = 0,
): React.PointerEvent<HTMLElement> {
  return { button } as unknown as React.PointerEvent<HTMLElement>;
}

function createKeyboardEvent(key: string): React.KeyboardEvent<HTMLElement> {
  return { key } as unknown as React.KeyboardEvent<HTMLElement>;
}

function createFocusEvent(): React.FocusEvent<HTMLElement> {
  return {} as unknown as React.FocusEvent<HTMLElement>;
}

describe("usePressFeedback", () => {
  it("returns initial isPressed as false", () => {
    const { result } = renderHook(() => usePressFeedback());
    expect(result.current.isPressed).toBe(false);
  });

  it("sets isPressed on primary pointer down", () => {
    const { result } = renderHook(() => usePressFeedback());

    act(() => {
      result.current.handlers.onPointerDown(
        createPointerEvent("pointerdown", 0),
      );
    });

    expect(result.current.isPressed).toBe(true);
  });

  it("ignores non-primary button pointer down", () => {
    const { result } = renderHook(() => usePressFeedback());

    act(() => {
      result.current.handlers.onPointerDown(
        createPointerEvent("pointerdown", 2),
      );
    });

    expect(result.current.isPressed).toBe(false);
  });

  it("releases on pointer up", () => {
    const { result } = renderHook(() => usePressFeedback());

    act(() => {
      result.current.handlers.onPointerDown(
        createPointerEvent("pointerdown", 0),
      );
    });
    expect(result.current.isPressed).toBe(true);

    act(() => {
      result.current.handlers.onPointerUp(createPointerEvent("pointerup"));
    });
    expect(result.current.isPressed).toBe(false);
  });

  it("releases on pointer leave", () => {
    const { result } = renderHook(() => usePressFeedback());

    act(() => {
      result.current.handlers.onPointerDown(
        createPointerEvent("pointerdown", 0),
      );
    });

    act(() => {
      result.current.handlers.onPointerLeave(
        createPointerEvent("pointerleave"),
      );
    });

    expect(result.current.isPressed).toBe(false);
  });

  it("releases on blur", () => {
    const { result } = renderHook(() => usePressFeedback());

    act(() => {
      result.current.handlers.onPointerDown(
        createPointerEvent("pointerdown", 0),
      );
    });

    act(() => {
      result.current.handlers.onBlur(createFocusEvent());
    });

    expect(result.current.isPressed).toBe(false);
  });

  it("handles Enter key press and release", () => {
    const { result } = renderHook(() => usePressFeedback());

    act(() => {
      result.current.handlers.onKeyDown(createKeyboardEvent("Enter"));
    });
    expect(result.current.isPressed).toBe(true);

    act(() => {
      result.current.handlers.onKeyUp(createKeyboardEvent("Enter"));
    });
    expect(result.current.isPressed).toBe(false);
  });

  it("handles Space key press and release", () => {
    const { result } = renderHook(() => usePressFeedback());

    act(() => {
      result.current.handlers.onKeyDown(createKeyboardEvent(" "));
    });
    expect(result.current.isPressed).toBe(true);

    act(() => {
      result.current.handlers.onKeyUp(createKeyboardEvent(" "));
    });
    expect(result.current.isPressed).toBe(false);
  });

  it("ignores non-Enter/Space key presses", () => {
    const { result } = renderHook(() => usePressFeedback());

    act(() => {
      result.current.handlers.onKeyDown(createKeyboardEvent("Tab"));
    });
    expect(result.current.isPressed).toBe(false);
  });

  it("does nothing when disabled", () => {
    const { result } = renderHook(() => usePressFeedback({ disabled: true }));

    act(() => {
      result.current.handlers.onPointerDown(
        createPointerEvent("pointerdown", 0),
      );
    });
    expect(result.current.isPressed).toBe(false);

    act(() => {
      result.current.handlers.onKeyDown(createKeyboardEvent("Enter"));
    });
    expect(result.current.isPressed).toBe(false);
  });

  it("returns all six handler functions", () => {
    const { result } = renderHook(() => usePressFeedback());

    expect(typeof result.current.handlers.onPointerDown).toBe("function");
    expect(typeof result.current.handlers.onPointerUp).toBe("function");
    expect(typeof result.current.handlers.onPointerLeave).toBe("function");
    expect(typeof result.current.handlers.onKeyDown).toBe("function");
    expect(typeof result.current.handlers.onKeyUp).toBe("function");
    expect(typeof result.current.handlers.onBlur).toBe("function");
  });
});
