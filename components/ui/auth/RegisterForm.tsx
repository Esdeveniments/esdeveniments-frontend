"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@i18n/routing";
import { useAuth } from "@components/hooks/useAuth";
import type { RegisterFormProps } from "types/props";
import type { AuthErrorCode } from "types/auth";

export default function RegisterForm({ redirectTo, suggestedName }: RegisterFormProps) {
  const t = useTranslations("Auth");
  const { register, supportedMethods, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState(suggestedName || "");
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        displayName: displayName || undefined,
      });
      if (result.success) {
        router.push((redirectTo || "/") as `/${string}`);
      } else if (result.error) {
        setError(result.error);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse h-80 bg-border/40 rounded-lg" />;
  }

  return (
    <form onSubmit={handleSubmit} className="card-bordered card-body stack" data-testid="register-form">
      <h1 className="heading-2 text-foreground">{t("register.title")}</h1>
      <p className="body-normal text-foreground/80">{t("register.subtitle")}</p>

      <div aria-live="polite" aria-atomic="true">
        {error && (
          <div className="bg-destructive/10 text-destructive body-small rounded-lg px-4 py-3" role="alert">
            {t(`errors.${error}`)}
          </div>
        )}
      </div>

      <label className="label" htmlFor="register-email">
        {t("fields.email")}
      </label>
      <input
        id="register-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-input"
      />

      {showPassword && (
        <>
          <label className="label" htmlFor="register-password">
            {t("fields.password")}
          </label>
          <input
            id="register-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-input"
          />
          <p className="body-small text-foreground/40">{t("register.passwordHint")}</p>
        </>
      )}

      <label className="label" htmlFor="register-name">
        {t("fields.displayName")}
      </label>
      <input
        id="register-name"
        type="text"
        autoComplete="name"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
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
        <Link href="/iniciar-sessio" className="text-primary font-semibold hover:underline">
          {t("register.loginLink")}
        </Link>
      </p>
    </form>
  );
}
