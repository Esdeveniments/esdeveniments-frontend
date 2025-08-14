"use client";

import { User } from "types/user";

export async function apiSignup(name: string, email: string): Promise<User> {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  if (!res.ok) throw new Error("Signup failed");
  const data = await res.json();
  return data.user as User;
}

export async function apiLogin(email: string): Promise<User> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) throw new Error("Login failed");
  const data = await res.json();
  return data.user as User;
}

export async function apiLogout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user as User;
  } catch {
    return null;
  }
}