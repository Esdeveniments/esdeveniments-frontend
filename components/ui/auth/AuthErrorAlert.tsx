"use client";

import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import type { AuthErrorAlertProps } from "types/props";

/**
 * The shared red-tinted error/alert box used across the auth forms.
 *
 * - Renders the localized message + an inline alert icon (clear visual
 *   hierarchy on top of color, per WCAG: don't rely on color alone).
 * - Passes the inline-recovery affordances through `children` so the
 *   forms can drop in a "Forgot password?" button, a resend button, or
 *   nothing.
 * - `role="alert"` so screen readers announce the message as soon as it
 *   appears.
 */
export default function AuthErrorAlert({
  message,
  children,
  testId,
}: AuthErrorAlertProps) {
  return (
    <div
      className="bg-error/10 text-error body-small rounded-lg px-4 py-3 flex items-start gap-3 border border-error/30"
      role="alert"
      data-testid={testId}
    >
      <ExclamationCircleIcon
        className="h-5 w-5 shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <p className="font-medium">{message}</p>
        {children}
      </div>
    </div>
  );
}
