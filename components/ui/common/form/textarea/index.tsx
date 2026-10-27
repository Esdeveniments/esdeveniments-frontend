import { TextAreaProps } from "types/props";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

const MAX_LENGTH = 1000;
const MIN_HEIGHT_PX = 160;

export default function TextArea({ id, value, onChange, error, onBlur }: TextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const characterCount = value?.length || 0;
  const showCounter = characterCount >= MAX_LENGTH * 0.8;
  const t = useTranslations("Components.TextArea");

  // Auto-expand textarea height based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(MIN_HEIGHT_PX, textarea.scrollHeight)}px`;
    }
  }, [value]);

  return (
    <div className="w-full">
      <label htmlFor={id} className="form-label">
        {t("label")}
      </label>
      <textarea
        ref={textareaRef}
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        className={`input h-auto min-h-[160px] py-3 mt-2 resize-y ${error ? "input-error" : ""}`}
        placeholder={t("placeholder")}
        maxLength={MAX_LENGTH}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {(error || showCounter) && (
        <div className="flex justify-between gap-2">
          {error ? (
            <p id={`${id}-error`} className="helper-text-error" role="alert">
              {error}
            </p>
          ) : (
            <span />
          )}
          {showCounter && (
            <span
              className={`body-small mt-1 tabular-nums ${characterCount >= MAX_LENGTH * 0.95 ? "text-error-dark" : "text-muted-foreground"}`}
            >
              {characterCount}/{MAX_LENGTH}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
