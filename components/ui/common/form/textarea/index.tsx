import { TextAreaProps } from "types/props";
import { useEffect, useRef, useState } from "react";
import DOMPurify from "isomorphic-dompurify";

// Same processing logic as Description component
function processDescription(description: string): string {
  if (!description) return "";

  const urlRegex = /(((https?:\/\/)|(www\.))[^\s]+)/g;
  let processed = description.replace(urlRegex, function (url) {
    let hyperlink = url;
    if (!hyperlink.match("^https?://")) {
      hyperlink = "http://" + hyperlink;
    }
    return `<a href="${hyperlink}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });

  processed = processed.replace(/\n/g, "<br>");
  return processed;
}

export default function TextArea({ id, value, onChange }: TextAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const characterCount = value?.length || 0;
  const maxLength = 1000;

  // Auto-expand textarea height based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea && !showPreview) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(300, textarea.scrollHeight)}px`;
    }
  }, [value, showPreview]);

  // Sanitize the processed description to prevent XSS attacks
  const sanitizedHtml = DOMPurify.sanitize(processDescription(value || ""));

  return (
    <div className="w-full">
      <div className="flex justify-between items-center">
        <label htmlFor={id} className="text-blackCorp font-bold">
          Descripció *
        </label>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-sm text-primary hover:text-primarydark focus:outline-none"
        >
          {showPreview ? "✏️ Editar" : "👁️ Previsualitzar"}
        </button>
      </div>
      <div className="mt-2">
        {showPreview ? (
          <div className="w-full min-h-[300px] p-3 border rounded-xl border-bColor bg-gray-50">
            <div
              className="break-words preview-content"
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
            {!value && (
              <p className="text-gray-500 italic">
                Escriu alguna cosa per veure la previsualització...
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
            className="w-full min-h-[300px] p-3 border rounded-xl border-bColor focus:border-darkCorp resize-vertical"
            placeholder="Descriu el teu esdeveniment... Pots escriure enllaços directament i es convertiran automàticament."
            maxLength={maxLength}
          />
        )}
        <div className="flex justify-between items-center mt-1">
          <p className="text-sm text-gray-600">
            {showPreview
              ? "Així és com veuran la descripció els visitants"
              : "Els enllaços es convertiran automàticament. Prem Enter per fer salts de línia."}
          </p>
          <span
            className={`text-sm ${
              characterCount > maxLength * 0.9
                ? "text-orange-500"
                : "text-gray-500"
            }`}
          >
            {characterCount}/{maxLength}
          </span>
        </div>
      </div>
    </div>
  );
}
