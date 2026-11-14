import { expect, request as playwrightRequest, type APIRequestContext } from "@playwright/test";

/**
 * Disposable inbox for the sign-up spec, on the free mail.tm API
 * (https://mail.tm, docs: https://docs.mail.tm). No key; 8 requests per
 * second per IP, so calls are spaced and a 429 is retried after its
 * Retry-After. Keep the whole inbox behind these functions so it can move to
 * an inbox we run without touching the spec.
 */

const MAIL_TM = "https://api.mail.tm";
const MAX_ATTEMPTS = 5;

export type Inbox = {
  address: string;
  /** The 6-digit code from the first message the inbox receives. */
  waitForCode: () => Promise<string>;
  dispose: () => Promise<void>;
};

async function call<T>(
  api: APIRequestContext,
  method: "GET" | "POST" | "DELETE",
  path: string,
  options: { token?: string; data?: unknown } = {},
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const response = await api.fetch(`${MAIL_TM}${path}`, {
      method,
      headers: options.token ? { Authorization: `Bearer ${options.token}` } : {},
      data: options.data,
    });
    if (response.status() === 429 && attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(response.headers()["retry-after"]) || attempt;
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1_000));
      continue;
    }
    if (!response.ok()) {
      throw new Error(`mail.tm ${method} ${path} returned ${response.status()}`);
    }
    return (response.status() === 204 ? undefined : await response.json()) as T;
  }
}

export async function createInbox(prefix: string): Promise<Inbox> {
  const api = await playwrightRequest.newContext();
  const domains = await call<{ "hydra:member": { domain: string; isActive: boolean }[] }>(
    api,
    "GET",
    "/domains",
  );
  const domain = domains["hydra:member"].find((d) => d.isActive)?.domain;
  if (!domain) throw new Error("mail.tm has no active domain");

  const address = `${prefix}-${Date.now()}@${domain}`;
  const password = crypto.randomUUID();
  const account = await call<{ id: string }>(api, "POST", "/accounts", {
    data: { address, password },
  });
  const { token } = await call<{ token: string }>(api, "POST", "/token", {
    data: { address, password },
  });

  return {
    address,
    async waitForCode() {
      let code: string | undefined;
      await expect
        .poll(
          async () => {
            const list = await call<{ "hydra:member": { id: string }[] }>(api, "GET", "/messages", {
              token,
            });
            const latest = list["hydra:member"][0];
            if (!latest) return false;
            const message = await call<{ text?: string }>(api, "GET", `/messages/${latest.id}`, {
              token,
            });
            // Logto's email puts the code on a line of its own.
            code = message.text?.match(/^\s*(\d{6})\s*$/m)?.[1];
            return Boolean(code);
          },
          { message: `verification email for ${address}`, timeout: 90_000, intervals: [2_000, 3_000, 5_000] },
        )
        .toBe(true);
      return code!;
    },
    async dispose() {
      await call(api, "DELETE", `/accounts/${account.id}`, { token }).catch(() => {});
      await api.dispose();
    },
  };
}
