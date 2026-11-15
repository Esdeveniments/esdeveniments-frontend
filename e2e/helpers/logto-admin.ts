import { request as playwrightRequest, type APIRequestContext } from "@playwright/test";

/**
 * Logto Management API access for removing the accounts the sign-up spec
 * creates. Uses the `e2e-test-cleanup` machine-to-machine app of the
 * preproduction tenant (role "Logto Management API access"). The backend keeps
 * its own user row: it has no delete endpoint yet.
 *
 * @see https://docs.logto.io/integrate-logto/interact-with-management-api
 */

// The Management API resource of a self-hosted (OSS) Logto tenant.
const MANAGEMENT_API_RESOURCE = "https://default.logto.app/api";

type LogtoUser = { id: string; primaryEmail: string | null; createdAt: number };

export function isLogtoAdminConfigured(): boolean {
  return Boolean(
    process.env.LOGTO_ENDPOINT &&
      process.env.E2E_LOGTO_M2M_APP_ID &&
      process.env.E2E_LOGTO_M2M_APP_SECRET,
  );
}

async function adminContext(): Promise<APIRequestContext> {
  const endpoint = process.env.LOGTO_ENDPOINT!.replace(/\/$/, "");
  const auth = await playwrightRequest.newContext();
  try {
    const response = await auth.post(`${endpoint}/oidc/token`, {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.E2E_LOGTO_M2M_APP_ID}:${process.env.E2E_LOGTO_M2M_APP_SECRET}`,
        ).toString("base64")}`,
      },
      form: { grant_type: "client_credentials", resource: MANAGEMENT_API_RESOURCE, scope: "all" },
    });
    if (!response.ok()) throw new Error(`Logto token request returned ${response.status()}`);
    const { access_token: token } = (await response.json()) as { access_token: string };
    return playwrightRequest.newContext({
      baseURL: `${endpoint}/api/`,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
  } finally {
    await auth.dispose();
  }
}

/**
 * Delete Logto users whose email contains `fragment`, optionally only those
 * created before `createdBefore` (ms). Returns how many were deleted.
 */
export async function deleteLogtoUsers(
  fragment: string,
  { createdBefore = Infinity }: { createdBefore?: number } = {},
): Promise<number> {
  const api = await adminContext();
  try {
    const response = await api.get("users", {
      params: { search: `%${fragment}%`, page_size: 100 },
    });
    if (!response.ok()) throw new Error(`Logto user search returned ${response.status()}`);
    const users = ((await response.json()) as LogtoUser[]).filter(
      (user) => user.primaryEmail?.includes(fragment) && user.createdAt < createdBefore,
    );
    for (const user of users) {
      const deleted = await api.delete(`users/${user.id}`);
      if (!deleted.ok()) throw new Error(`Deleting Logto user returned ${deleted.status()}`);
    }
    return users.length;
  } finally {
    await api.dispose();
  }
}
