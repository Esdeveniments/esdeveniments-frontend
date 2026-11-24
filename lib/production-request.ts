import "server-only";
import { headers } from "next/headers";
import { getSiteUrl } from "@config/index";
import {
  isProductionHost,
  isProductionSiteUrl,
} from "@utils/production-host";

/**
 * True only when both the configured site URL and the incoming request Host
 * match the production allowlist. Fails closed outside a request context and
 * on Coolify staging/PR previews (where NODE_ENV is "production" and
 * NEXT_PUBLIC_VERCEL_ENV is unset).
 */
export async function isProductionDeploymentRequest(): Promise<boolean> {
  if (!isProductionSiteUrl(getSiteUrl())) return false;
  try {
    return isProductionHost((await headers()).get("host"));
  } catch {
    return false;
  }
}
