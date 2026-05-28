"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@i18n/routing";
import { ExclamationCircleIcon } from "@heroicons/react/24/outline";
import { useAuth } from "@components/hooks/useAuth";
import { contactEmail } from "@config/index";
import type {
  LoginFormProps,
  LoginRecoveryAffordance,
} from "types/props";
import type { AuthErrorCode } from "types/auth";

export default function LoginForm({ redirectTo }: LoginFormProps) {
  const t = useTranslations("Auth");
  const { login, supportedMethods, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [affordance, setAffordance] = useState<LoginRecoveryAffordance>({
    kind: "idle",
  });

  const showPassword = supportedMethods.includes("credentials");
  const isMagicLink = supportedMethods.includes("magic-link") && !showPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAffordance({ kind: "idle" });
    setSubmitting(true);

    try {
      const result = await login({ email, password: showPassword ? password : undefined });
      if (result.success) {
        if (isMagicLink) {
          setMagicLinkSent(true);
        } else {
          router.push((redirectTo || "/") as `/${string}`);
        }
      } else if (result.error) {
        setError(result.error);
      }
    } catch {
      setError("unknown");
    } finally {
      setSubmitting(false);
    }
  };

  // Best-effort password recovery: posts the typed email to the existing
  // forgot-password endpoint and surfaces a localized confirmation inline.
  // We treat any non-network result as "sent" to avoid revealing account
  // existence (matches the don't-reveal pattern used elsewhere).
  const requestPasswordReset = async () => {
    if (!email) return;
    setAffordance({ kind: "pending" });
    try {
      await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(10_000),
      });
      setAffordance({ kind: "sent", type: "forgot" });
    } catch {
      setError("network-error");
      setAffordance({ kind: "idle" });
    }
  };

  const requestVerificationResend = async () => {
    if (!email) return;
    setAffordance({ kind: "pending" });
    try {
      await fetch("/api/auth/verification/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(10_000),
      });
      setAffordance({ kind: "sent", type: "verification" });
    } catch {
      setError("network-error");
      setAffordance({ kind: "idle" });
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-border/40 rounded-lg" />;
  }

  if (magicLinkSent) {
    return (
      <div className="card-bordered card-body text-center">
        <p className="body-normal text-foreground">{t("login.magicLinkSent")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-bordered card-body stack" data-testid="login-form">
      <h1 className="heading-2 text-foreground">{t("login.title")}</h1>
      <p className="body-normal text-foreground/80">{t("login.subtitle")}</p>

      {error && (
        <div
          className="bg-error/10 text-error body-small rounded-lg px-4 py-3 flex items-start gap-3 border border-error/30"
          role="alert"
          data-testid="login-error"
        >
          <ExclamationCircleIcon
            className="h-5 w-5 shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            <p className="font-medium">{t(`errors.${error}`)}</p>

            {/* Inline recovery affordances — recoverable errors get an
                action, not just blame. Buttons require the email field. */}
            {error === "invalid-credentials" && affordance.kind !== "sent" && (
            <button
              type="button"
              onClick={requestPasswordReset}
              disabled={!email || affordance.kind === "pending"}
              className="text-primary font-semibold hover:underline disabled:opacity-50 text-left"
              data-testid="forgot-password-btn"
            >
              {t("actions.forgotPassword")}
            </button>
          )}

          {error === "email-not-verified" && affordance.kind !== "sent" && (
            <button
              type="button"
              onClick={requestVerificationResend}
              disabled={!email || affordance.kind === "pending"}
              className="text-primary font-semibold hover:underline disabled:opacity-50 text-left"
              data-testid="resend-verification-btn"
            >
              {t("actions.resendVerification")}
            </button>
          )}

          {error === "account-locked" && (
            <a
              href={`mailto:${contactEmail}`}
              className="text-primary font-semibold hover:underline"
              data-testid="contact-support-link"
            >
              {t("actions.contactSupport")}
            </a>
          )}

            {affordance.kind === "sent" && (
              <p className="text-foreground/80" data-testid="affordance-sent">
                {t(
                  affordance.type === "forgot"
                    ? "actions.forgotPasswordSent"
                    : "actions.verificationSent",
                  { email }
                )}
              </p>
            )}
          </div>
        </div>
      )}

      <label className="label" htmlFor="login-email">
        {t("fields.email")}
      </label>
      <input
        id="login-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-input"
      />

      {showPassword && (
        <>
          <label className="label" htmlFor="login-password">
            {t("fields.password")}
          </label>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-input"
          />
        </>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full"
        data-analytics-action="login"
      >
        {submitting ? "..." : t("login.submit")}
      </button>

      <p className="body-small text-foreground/60 text-center">
        {t("login.noAccount")}{" "}
        <Link href={redirectTo ? `/registre?redirect=${encodeURIComponent(redirectTo)}` : "/registre"} className="text-primary font-semibold hover:underline">
          {t("login.registerLink")}
        </Link>
      </p>
    </form>
  );
}
