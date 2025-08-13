"use client";

import { Session, User } from "types/user";

const STORAGE_KEY = "events-auth-session";

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: Session = JSON.parse(raw);
    if (!parsed?.user?.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(session: Session): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function isAuthenticated(): boolean {
  return !!getSession();
}

export function mockSignup(name: string, email: string): Session {
  const user: User = {
    id: crypto.randomUUID(),
    name,
    email,
  };
  const session: Session = { user, issuedAt: Date.now() };
  setSession(session);
  return session;
}

export function mockLogin(email: string): Session | null {
  // For mock: if a session exists and email matches, reuse; else create a new user with placeholder name
  const existing = getSession();
  if (existing && existing.user.email === email) return existing;
  const user: User = { id: crypto.randomUUID(), name: email.split("@")[0], email };
  const session: Session = { user, issuedAt: Date.now() };
  setSession(session);
  return session;
}