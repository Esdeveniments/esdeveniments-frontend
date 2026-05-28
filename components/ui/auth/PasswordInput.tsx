"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import type { PasswordInputProps } from "types/props";

/**
 * Password input with an accessible show/hide eye toggle.
 *
 * Visibility is local state — each instance starts hidden, and the toggle
 * has aria-pressed + a localized aria-label so screen readers announce the
 * state correctly. We don't auto-hide after a timeout (Stripe / GitHub
 * don't either; surprise re-hiding mid-typing is worse than the security
 * win), and the rendered field still uses `type="password"` when hidden so
 * password managers behave correctly.
 */
export default function PasswordInput({
  id,
  value,
  onChange,
  autoComplete,
  required,
  minLength,
  ariaInvalid,
  ariaDescribedby,
  className,
  dataTestid,
}: PasswordInputProps) {
  const t = useTranslations("Auth.fields");
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedby}
        data-testid={dataTestid}
        className={`rounded-input w-full pr-12 ${className ?? ""}`.trim()}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("passwordHide") : t("passwordShow")}
        aria-pressed={visible}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-foreground/60 hover:text-foreground transition-interactive focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        data-testid={`${dataTestid ?? id}-toggle`}
      >
        {visible ? (
          <EyeSlashIcon className="h-5 w-5" aria-hidden="true" />
        ) : (
          <EyeIcon className="h-5 w-5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
