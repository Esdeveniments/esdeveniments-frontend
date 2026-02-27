"use client";

import { Link } from "@i18n/routing";
import { usePathname } from "next/navigation";
import { useAuth } from "@components/hooks/useAuth";
import { useTranslations } from "next-intl";
import type { RequireAuthProps } from "types/props";

export default function RequireAuth({
  children,
  fallbackMessage,
}: RequireAuthProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const t = useTranslations("Auth");
  const pathname = usePathname();

  if (isLoading) {
    return <div className="animate-pulse h-64 bg-border/40 rounded-lg" />;
  }

  if (!isAuthenticated) {
    return (
      <div
        className="card-bordered card-body max-w-md mx-auto text-center stack"
        data-testid="require-auth-prompt"
      >
        <h2 className="heading-2 text-foreground">{t("guard.title")}</h2>
        <p className="body-normal text-foreground/80">
          {fallbackMessage || t("guard.description")}
        </p>
        <Link
          href={`/iniciar-sessio?redirect=${encodeURIComponent(pathname)}` as `/${string}`}
          className="btn-primary inline-block"
        >
          {t("guard.loginButton")}
        </Link>
        <p className="body-small text-foreground/60">
          {t("guard.noAccount")}{" "}
          <Link
            href={`/registre?redirect=${encodeURIComponent(pathname)}` as `/${string}`}
            className="text-primary font-semibold hover:underline"
          >
            {t("guard.registerLink")}
          </Link>
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
