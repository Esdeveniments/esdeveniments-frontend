"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import { useAuth } from "@components/hooks/useAuth";
import PasswordInput from "@components/ui/auth/PasswordInput";
import type { RegisterFormProps } from "types/props";
import type { AuthErrorCode } from "types/auth";

export default function RegisterForm({ redirectTo }: RegisterFormProps) {
  const t = useTranslations("Auth");
  const { register, supportedMethods, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const showPassword = supportedMethods.includes("credentials");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (showPassword && password.length < 8) {
      setError("weak-password");
      return;
    }

    setSubmitting(true);
    try {
      const result = await register({
        email,
        password: showPassword ? password : undefined,
        name: name || undefined,
      });
      if (result.success) {
        setRegistered(true);
      } else if (result.error) {
        setError(result.error);
      }
    } catch {
      setError("unknown");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResent(false);
    try {
      const res = await fetch("/api/auth/verification/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) setResent(true);
    } catch {
      // silently fail — user can retry
    } finally {
      setResending(false);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-80 bg-border/40 rounded-lg" />;
  }

  if (registered) {
    return (
      <div className="card-bordered card-body stack" data-testid="register-success">
        <div className="flex-center">
          <div className="text-4xl">✉️</div>
        </div>
        <h1 className="heading-2 text-foreground text-center">
          {t("verification.checkEmailTitle")}
        </h1>
        <p className="body-normal text-foreground/80 text-center">
          {t("verification.checkEmailDescription", { email })}
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || resent}
          className="btn-outline w-full"
        >
          {resent
            ? t("verification.resent")
            : resending
              ? "..."
              : t("verification.resend")}
        </button>
        <p className="body-small text-foreground/60 text-center">
          <Link href={redirectTo ? `/iniciar-sessio?redirect=${encodeURIComponent(redirectTo)}` : "/iniciar-sessio"} className="text-primary font-semibold hover:underline">
            {t("register.loginLink")}
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-bordered card-body stack" data-testid="register-form">
      <h1 className="heading-2 text-foreground">{t("register.title")}</h1>
      <p className="body-normal text-foreground/80">{t("register.subtitle")}</p>

      {/* Form-level alert covers everything except weak-password — that one
          renders as a field-level error directly under the password input
          (2026 best practice: place validation errors next to the input). */}
      {error && error !== "weak-password" && (
        <div className="bg-error/10 text-error body-small rounded-lg px-4 py-3 border border-error/30" role="alert" data-testid="register-error">
          {t(`errors.${error}`)}
        </div>
      )}

      <label className="label" htmlFor="register-email">
        {t("fields.email")}
      </label>
      <input
        id="register-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (error) setError(null);
        }}
        className="rounded-input"
      />

      {showPassword && (
        <>
          <label className="label" htmlFor="register-password">
            {t("fields.password")}
          </label>
          <PasswordInput
            id="register-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            autoComplete="new-password"
            required
            minLength={8}
            ariaInvalid={error === "weak-password"}
            ariaDescribedby={
              error === "weak-password"
                ? "register-password-error"
                : "register-password-hint"
            }
          />
          {error === "weak-password" ? (
            <p
              id="register-password-error"
              className="body-small text-error"
              role="alert"
              data-testid="register-password-error"
            >
              {t("errors.weak-password")}
            </p>
          ) : (
            <p id="register-password-hint" className="body-small text-foreground/40">
              {t("register.passwordHint")}
            </p>
          )}
        </>
      )}

      <label className="label" htmlFor="register-name">
        {t("fields.name")}
      </label>
      <input
        id="register-name"
        type="text"
        autoComplete="name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          if (error) setError(null);
        }}
        className="rounded-input"
      />

      <button
        type="submit"
        disabled={submitting}
        className="btn-primary w-full"
        data-analytics-action="register"
      >
        {submitting ? "..." : t("register.submit")}
      </button>

      <p className="body-small text-foreground/60 text-center">
        {t("register.hasAccount")}{" "}
        <Link href={redirectTo ? `/iniciar-sessio?redirect=${encodeURIComponent(redirectTo)}` : "/iniciar-sessio"} className="text-primary font-semibold hover:underline">
          {t("register.loginLink")}
        </Link>
      </p>
    </form>
  );
}
