"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@i18n/routing";
import { useAuth } from "@components/hooks/useAuth";
import PasswordInput from "@components/ui/auth/PasswordInput";
import AuthErrorAlert from "@components/ui/auth/AuthErrorAlert";
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

  // Editing the email or password makes any previous error and any "we sent
  // a reset link to <email>" confirmation stale — clear them so the user
  // sees a fresh state on the next submit attempt. Standard pattern (Linear,
  // Stripe, Clerk): clear form-level errors the moment the offending field
  // is touched.
  const clearStaleFeedback = () => {
    if (error) setError(null);
    if (affordance.kind !== "idle") setAffordance({ kind: "idle" });
  };

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

  // Best-effort recovery: posts the typed email to a backend endpoint and
  // shows a localized confirmation inline. We treat any non-network result
  // as "sent" to avoid revealing account existence (the same don't-reveal
  // principle that drives the 4xx → invalid-credentials fallback).
  const sendRecoveryAction = async (
    endpoint: string,
    type: "forgot" | "verification"
  ) => {
    if (!email) return;
    setAffordance({ kind: "pending" });
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(10_000),
      });
      setAffordance({ kind: "sent", type });
    } catch {
      setError("network-error");
      setAffordance({ kind: "idle" });
    }
  };

  const requestPasswordReset = () =>
    sendRecoveryAction("/api/auth/password/forgot", "forgot");
  const requestVerificationResend = () =>
    sendRecoveryAction("/api/auth/verification/resend", "verification");

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
        <AuthErrorAlert message={t(`errors.${error}`)} testId="login-error">
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
        </AuthErrorAlert>
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
        onChange={(e) => {
          setEmail(e.target.value);
          clearStaleFeedback();
        }}
        className="rounded-input"
      />

      {showPassword && (
        <>
          <label className="label" htmlFor="login-password">
            {t("fields.password")}
          </label>
          <PasswordInput
            id="login-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              clearStaleFeedback();
            }}
            autoComplete="current-password"
            required
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
