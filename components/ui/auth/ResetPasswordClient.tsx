"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import PasswordInput from "@components/ui/auth/PasswordInput";
import AuthErrorAlert from "@components/ui/auth/AuthErrorAlert";
import type { ResetPasswordStatus } from "types/auth";
import type { ResetPasswordClientProps } from "types/props";

export default function ResetPasswordClient({ token }: ResetPasswordClientProps) {
  const t = useTranslations("Auth");
  const [status, setStatus] = useState<ResetPasswordStatus>("form");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <div className="card-bordered card-body stack text-center" data-testid="reset-no-token">
        <div className="text-4xl">⚠️</div>
        <h1 className="heading-2 text-foreground">
          {t("resetPassword.invalidToken")}
        </h1>
        <p className="body-normal text-foreground/80">
          {t("resetPassword.invalidTokenDescription")}
        </p>
        <Link href="/iniciar-sessio" className="btn-primary w-full text-center">
          {t("login.submit")}
        </Link>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="card-bordered card-body stack text-center" data-testid="reset-success">
        <div className="text-4xl">✅</div>
        <h1 className="heading-2 text-foreground">
          {t("resetPassword.successTitle")}
        </h1>
        <p className="body-normal text-foreground/80">
          {t("resetPassword.successDescription")}
        </p>
        <Link href="/iniciar-sessio" className="btn-primary w-full text-center">
          {t("login.submit")}
        </Link>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="card-bordered card-body stack text-center" data-testid="reset-error">
        <div className="text-4xl">❌</div>
        <h1 className="heading-2 text-foreground">
          {t("resetPassword.errorTitle")}
        </h1>
        <p className="body-normal text-foreground/80">
          {t("resetPassword.errorDescription")}
        </p>
        <Link href="/iniciar-sessio" className="btn-outline w-full text-center">
          {t("login.submit")}
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t("errors.weak-password"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("resetPassword.passwordMismatch"));
      return;
    }

    setStatus("submitting");
    try {
      const res = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
        signal: AbortSignal.timeout(10_000),
      });
      setStatus(res.ok ? "success" : "error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="card-bordered card-body stack"
      data-testid="reset-password-form"
    >
      <h1 className="heading-2 text-foreground">
        {t("resetPassword.title")}
      </h1>
      <p className="body-normal text-foreground/80">
        {t("resetPassword.subtitle")}
      </p>

      {error && <AuthErrorAlert message={error} />}

      <label className="label" htmlFor="reset-password">
        {t("resetPassword.newPassword")}
      </label>
      <PasswordInput
        id="reset-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        required
        minLength={8}
      />

      <label className="label" htmlFor="reset-confirm-password">
        {t("resetPassword.confirmPassword")}
      </label>
      <PasswordInput
        id="reset-confirm-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        autoComplete="new-password"
        required
        minLength={8}
      />

      <p className="body-small text-foreground/40">{t("register.passwordHint")}</p>

      <button
        type="submit"
        disabled={status === "submitting"}
        className="btn-primary w-full"
      >
        {status === "submitting" ? "..." : t("resetPassword.submit")}
      </button>
    </form>
  );
}
