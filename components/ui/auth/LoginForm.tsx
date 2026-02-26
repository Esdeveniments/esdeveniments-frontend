"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@i18n/routing";
import { useAuth } from "@components/hooks/useAuth";
import type { LoginFormProps } from "types/props";
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

  const showPassword = supportedMethods.includes("credentials");
  const isMagicLink = supportedMethods.includes("magic-link") && !showPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await login({ email, password: showPassword ? password : undefined });
      if (result.success) {
        router.push((redirectTo || "/") as `/${string}`);
      } else if (result.error) {
        setError(result.error);
      }
      if (isMagicLink && result.success) {
        setMagicLinkSent(true);
      }
    } finally {
      setSubmitting(false);
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

      <div aria-live="polite" aria-atomic="true">
        {error && (
          <div className="bg-destructive/10 text-destructive body-small rounded-lg px-4 py-3" role="alert">
            {t(`errors.${error}`)}
          </div>
        )}
      </div>

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
        <Link href="/registre" className="text-primary font-semibold hover:underline">
          {t("login.registerLink")}
        </Link>
      </p>
    </form>
  );
}
