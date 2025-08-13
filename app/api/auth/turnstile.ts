import { NextRequest } from "next/server";

export async function verifyTurnstile(req: NextRequest, cfToken?: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true; // if not configured, pass-through in dev
  const token = cfToken ?? (await req.json().catch(() => ({ cfToken: null }))).cfToken;
  if (!token) return false;
  const form = new URLSearchParams();
  form.append("secret", secret);
  form.append("response", token);
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined;
  if (ip) form.append("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return false;
  }
}