"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type {
  PressFeedbackHandlers,
  PressFeedbackOptions,
  PressFeedbackResult,
} from "types/ui";

export function usePressFeedback(
  options: PressFeedbackOptions = {}
): PressFeedbackResult {
  const { disabled = false } = options;
  const [isPressed, setIsPressed] = useState(false);
  const keyboardActiveRef = useRef(false);

  const release = useCallback(() => {
    setIsPressed(false);
    keyboardActiveRef.current = false;
  }, []);

  const handlePointerDown = useCallback<PressFeedbackHandlers["onPointerDown"]>(
    (event) => {
      if (disabled) return;
      if (event.button !== 0) return;
      setIsPressed(true);
    },
    [disabled]
  );

  const handlePointerUp = useCallback<PressFeedbackHandlers["onPointerUp"]>(
    () => {
      if (disabled) return;
      release();
    },
    [disabled, release]
  );

  const handlePointerLeave =
    useCallback<PressFeedbackHandlers["onPointerLeave"]>(
      () => {
        if (disabled) return;
        release();
      },
      [disabled, release]
    );

  const handleBlur = useCallback<PressFeedbackHandlers["onBlur"]>(() => {
    if (disabled) return;
    release();
  }, [disabled, release]);

  const handleKeyDown = useCallback<PressFeedbackHandlers["onKeyDown"]>(
    (event) => {
      if (disabled) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      keyboardActiveRef.current = true;
      setIsPressed(true);
    },
    [disabled]
  );

  const handleKeyUp = useCallback<PressFeedbackHandlers["onKeyUp"]>(
    (event) => {
      if (disabled) return;
      if (!keyboardActiveRef.current) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      release();
    },
    [disabled, release]
  );

  const handlers = useMemo<PressFeedbackHandlers>(
    () => ({
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerUp,
      onPointerLeave: handlePointerLeave,
      onKeyDown: handleKeyDown,
      onKeyUp: handleKeyUp,
      onBlur: handleBlur,
    }),
    [
      handlePointerDown,
      handlePointerUp,
      handlePointerLeave,
      handleKeyDown,
      handleKeyUp,
      handleBlur,
    ]
  );

  return {
    isPressed,
    handlers,
  };
}
