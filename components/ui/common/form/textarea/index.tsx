import { TextAreaProps } from "types/props";
import { useEffect, useRef, useState, useMemo } from "react";
import DOMPurify from "isomorphic-dompurify";
import { processDescription } from "utils/text-processing";
import { useTranslations } from "next-intl";

export default function TextArea({ id, value, onChange, error, onBlur }: TextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const characterCount = value?.length || 0;
  const maxLength = 1000;
  const t = useTranslations("Components.TextArea");

  // Auto-expand textarea height based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && !showPreview) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(300, textarea.scrollHeight)}px`;
    }
  }, [value, showPreview]);

  // Sanitize the processed description to prevent XSS attacks
  const sanitizedHtml = useMemo(
    () => DOMPurify.sanitize(processDescription(value || "")),
    [value]
  );

  return (
    <div className="w-full">
      <div className="flex-between">
        <label htmlFor={id} className="form-label">
          {t("label")}
        </label>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-sm text-primary hover:text-primary-dark focus:outline-none"
        >
          {showPreview ? t("edit") : t("preview")}
        </button>
      </div>
      <div className="mt-2">
        {showPreview ? (
          <div className="w-full min-h-[300px] p-3 border rounded-xl border-border bg-muted">
            <div
              className="break-words preview-content"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
            {!value && (
              <p className="text-foreground/70 italic">
                {t("emptyPreview")}
              </p>
            )}
            <style jsx>{`
              .preview-content :global(a) {
                color: #ff0037 !important;
                text-decoration: underline;
                font-weight: 500;
                transition: color 0.2s ease;
              }
              .preview-content :global(a:hover) {
                color: #cc002c !important;
                text-decoration: none;
              }
            `}</style>
          </div>
        ) : (
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
        )}
        {error && (
          <p id={`${id}-error`} className="helper-text-error" role="alert">
            {error}
          </p>
        )}
        <div className="flex-between mt-1">
          <p className="text-sm text-foreground/80">
            {showPreview ? t("helperPreview") : t("helperEdit")}
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
