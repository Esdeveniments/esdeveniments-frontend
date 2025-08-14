import { promises as fs } from "fs";
import path from "path";

export interface DbUser { id: string; name: string; email: string; role?: "user" | "organizer" | "admin" }
export interface DbSession { token: string; userId: string; createdAt: number; expiresAt: number }
export interface MagicToken { token: string; email: string; createdAt: number; expiresAt: number; used: boolean }
export interface DeleteRequest { slug: string; userId: string; reason?: string; createdAt: number }
export interface DbShape {
  users: DbUser[];
  sessions: DbSession[];
  ownership: Record<string, string[]>; // userId -> slugs
  favorites: Record<string, string[]>; // userId -> slugs
  coowners: Record<string, string[]>; // slug -> userIds
  magicTokens: MagicToken[];
  deleteRequests: DeleteRequest[];
  oauthStates: { state: string; createdAt: number }[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

async function ensureDb(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
  try {
    await fs.access(DB_FILE);
  } catch {
    const initial: DbShape = {
      users: [],
      sessions: [],
      ownership: {},
      favorites: {},
      coowners: {},
      magicTokens: [],
      deleteRequests: [],
      oauthStates: [],
    };
    await fs.writeFile(DB_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

export async function readDb(): Promise<DbShape> {
  await ensureDb();
  const raw = await fs.readFile(DB_FILE, "utf8");
  return JSON.parse(raw) as DbShape;
}

export async function writeDb(db: DbShape): Promise<void> {
  await ensureDb();
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

export async function saveOauthState(state: string): Promise<void> {
  const db = await readDb();
  db.oauthStates.push({ state, createdAt: Date.now() });
  await writeDb(db);
}

export async function consumeOauthState(state: string): Promise<boolean> {
  const db = await readDb();
  const idx = db.oauthStates.findIndex((s) => s.state === state && Date.now() - s.createdAt < 15 * 60 * 1000);
  if (idx === -1) return false;
  db.oauthStates.splice(idx, 1);
  await writeDb(db);
  return true;
}

export async function findOrCreateUser(name: string, email: string): Promise<DbUser> {
  const db = await readDb();
  let user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    user = { id: crypto.randomUUID(), name, email, role: "user" };
    db.users.push(user);
    await writeDb(db);
  }
  return user;
}

export async function getUserBySessionToken(token: string | undefined | null): Promise<DbUser | null> {
  if (!token) return null;
  const db = await readDb();
  const now = Date.now();
  const session = db.sessions.find((s) => s.token === token && s.expiresAt > now);
  if (!session) return null;
  const user = db.users.find((u) => u.id === session.userId) || null;
  return user || null;
}

export async function createSession(userId: string, ttlMs: number = 1000 * 60 * 60 * 24 * 7): Promise<string> {
  const db = await readDb();
  const token = crypto.randomUUID();
  const now = Date.now();
  db.sessions.push({ token, userId, createdAt: now, expiresAt: now + ttlMs });
  await writeDb(db);
  return token;
}

export async function deleteSession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  const db = await readDb();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  await writeDb(db);
}

export async function listSessions(userId: string): Promise<DbSession[]> {
  const db = await readDb();
  const now = Date.now();
  return db.sessions.filter((s) => s.userId === userId && s.expiresAt > now);
}

export async function revokeSession(userId: string, token: string): Promise<void> {
  const db = await readDb();
  db.sessions = db.sessions.filter((s) => !(s.userId === userId && s.token === token));
  await writeDb(db);
}

export async function addOwnership(userId: string, slug: string): Promise<void> {
  const db = await readDb();
  const list = db.ownership[userId] || [];
  if (!list.includes(slug)) {
    list.push(slug);
    db.ownership[userId] = list;
    await writeDb(db);
  }
}

export async function removeOwnership(userId: string, slug: string): Promise<void> {
  const db = await readDb();
  const list = db.ownership[userId] || [];
  db.ownership[userId] = list.filter((s) => s !== slug);
  await writeDb(db);
}

export async function getOwnership(userId: string): Promise<string[]> {
  const db = await readDb();
  return db.ownership[userId] || [];
}

export async function addCoOwner(slug: string, userId: string): Promise<void> {
  const db = await readDb();
  const list = db.coowners[slug] || [];
  if (!list.includes(userId)) {
    list.push(userId);
    db.coowners[slug] = list;
    await writeDb(db);
  }
}

export async function getCoOwners(slug: string): Promise<string[]> {
  const db = await readDb();
  return db.coowners[slug] || [];
}

export async function toggleFavoriteDb(userId: string, slug: string): Promise<boolean> {
  const db = await readDb();
  const list = db.favorites[userId] || [];
  const idx = list.indexOf(slug);
  if (idx >= 0) {
    list.splice(idx, 1);
    db.favorites[userId] = list;
    await writeDb(db);
    return false;
  }
  list.push(slug);
  db.favorites[userId] = list;
  await writeDb(db);
  return true;
}

export async function getFavorites(userId: string): Promise<string[]> {
  const db = await readDb();
  return db.favorites[userId] || [];
}

export async function createMagicToken(email: string, ttlMs: number = 1000 * 60 * 15): Promise<MagicToken> {
  const db = await readDb();
  const token = crypto.randomUUID();
  const now = Date.now();
  const entry: MagicToken = { token, email, createdAt: now, expiresAt: now + ttlMs, used: false };
  db.magicTokens.push(entry);
  await writeDb(db);
  return entry;
}

export async function useMagicToken(token: string): Promise<string | null> {
  const db = await readDb();
  const now = Date.now();
  const entry = db.magicTokens.find((t) => t.token === token);
  if (!entry || entry.used || entry.expiresAt <= now) return null;
  entry.used = true;
  await writeDb(db);
  return entry.email;
}

export async function addDeleteRequest(slug: string, userId: string, reason?: string): Promise<void> {
  const db = await readDb();
  db.deleteRequests.push({ slug, userId, reason, createdAt: Date.now() });
  await writeDb(db);
}