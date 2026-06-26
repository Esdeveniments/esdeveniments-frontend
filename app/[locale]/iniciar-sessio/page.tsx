import { redirect } from "next/navigation";

// Sign-in is handled by Logto's hosted pages. This locale-prefixed route stays
// as the public entry point (navbar, deep links) and forwards into the OIDC
// flow, preserving any ?redirect= target.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const params = await searchParams;
  const redirectParam =
    typeof params.redirect === "string" ? params.redirect : undefined;
  const safe =
    redirectParam &&
    redirectParam.startsWith("/") &&
    !redirectParam.startsWith("//")
      ? redirectParam
      : undefined;

  redirect(
    safe
      ? `/api/auth/sign-in?redirect=${encodeURIComponent(safe)}`
      : "/api/auth/sign-in",
  );
}
