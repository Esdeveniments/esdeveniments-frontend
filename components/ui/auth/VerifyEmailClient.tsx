"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@i18n/routing";
import type { VerifyEmailStatus } from "types/auth";

export default function VerifyEmailClient({ token }: { token: string | null }) {
  const t = useTranslations("Auth");
  const [status, setStatus] = useState<VerifyEmailStatus>("loading");
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token || calledRef.current) return;
    calledRef.current = true;

    async function verify() {
      try {
        const res = await fetch(
          `/api/auth/verification/confirm?token=${encodeURIComponent(token!)}`,
          { signal: AbortSignal.timeout(10_000) }
        );
        setStatus(res.ok ? "success" : "error");
      } catch {
        setStatus("error");
      }
    }
    verify();
  }, [token]);

  if (!token) {
    return (
      <div className="card-bordered card-body stack text-center" data-testid="verify-no-token">
        <div className="text-4xl">⚠️</div>
        <h1 className="heading-2 text-foreground">
          {t("verification.invalidToken")}
        </h1>
        <p className="body-normal text-foreground/80">
          {t("verification.invalidTokenDescription")}
        </p>
        <Link href="/registre" className="btn-primary w-full text-center">
          {t("register.submit")}
        </Link>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="card-bordered card-body stack text-center" data-testid="verify-loading">
        <div className="animate-pulse h-40 bg-border/40 rounded-lg" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="card-bordered card-body stack text-center" data-testid="verify-error">
        <div className="text-4xl">❌</div>
        <h1 className="heading-2 text-foreground">
          {t("verification.errorTitle")}
        </h1>
        <p className="body-normal text-foreground/80">
          {t("verification.errorDescription")}
        </p>
        <Link href="/registre" className="btn-outline w-full text-center">
          {t("register.submit")}
        </Link>
      </div>
    );
  }

  return (
    <div className="card-bordered card-body stack text-center" data-testid="verify-success">
      <div className="text-4xl">✅</div>
      <h1 className="heading-2 text-foreground">
        {t("verification.successTitle")}
      </h1>
      <p className="body-normal text-foreground/80">
        {t("verification.successDescription")}
      </p>
      <Link href="/iniciar-sessio" className="btn-primary w-full text-center">
        {t("login.submit")}
      </Link>
    </div>
  );
}
