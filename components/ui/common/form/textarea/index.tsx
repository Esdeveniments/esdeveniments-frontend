import { TextAreaProps } from "types/props";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

export default function TextArea({ id, value, onChange, error, onBlur }: TextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const characterCount = value?.length || 0;
  const maxLength = 1000;
  const t = useTranslations("Components.TextArea");

  // Auto-expand textarea height based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(300, textarea.scrollHeight)}px`;
    }
  }, [value]);

  return (
    <div className="w-full">
      <div className="flex-between">
        <label htmlFor={id} className="form-label">
          {t("label")}
        </label>
      </div>
      <div className="mt-2">
        <textarea
          ref={textareaRef}
          id={id}
          name={id}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={`w-full min-h-[300px] p-3 border rounded-xl border-border focus:border-foreground-strong resize-vertical ${error ? "input-error" : ""
            }`}
          placeholder={t("placeholder")}
          maxLength={maxLength}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        {error && (
          <p id={`${id}-error`} className="helper-text-error" role="alert">
            {error}
          </p>
        )}
        <div className="flex-between mt-1">
          <p className="text-sm text-foreground/80">
            {t("helperEdit")}
          </p>
          <span
            className={`text-sm ${characterCount > maxLength * 0.9
              ? "text-orange-500"
              : "text-foreground/70"
              }`}
          >
            {characterCount}/{maxLength}
          </span>
        </div>
      </div>
    </div>
  );
}
