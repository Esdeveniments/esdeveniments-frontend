"use client";

import { useState, type ReactNode } from "react";
import { useAuth } from "@components/hooks/useAuth";
import { Link } from "@i18n/routing";
import { useTranslations } from "next-intl";

export default function FavoriteAuthGate({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const t = useTranslations("Auth");
  const [showPrompt, setShowPrompt] = useState(false);

  if (isLoading || isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setShowPrompt(true);
          setTimeout(() => setShowPrompt(false), 4000);
        }}
      >
        {children}
      </div>
      {showPrompt && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 card-bordered card-body shadow-md bg-background z-50 rounded-lg text-center"
          role="tooltip"
          data-testid="favorite-auth-prompt"
        >
          <p className="body-small text-foreground mb-1">
            {t("favoritePrompt")}
          </p>
          <Link
            href="/iniciar-sessio"
            className="body-small text-primary font-semibold hover:underline"
          >
            {t("guard.loginButton")}
          </Link>
        </div>
      )}
    </div>
  );
}
