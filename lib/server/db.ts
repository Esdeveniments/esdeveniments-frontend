import { promises as fs } from "fs";
import path from "path";

export interface DbUser { id: string; name: string; email: string }
export interface DbSession { token: string; userId: string; createdAt: number }
export interface DbShape {
  users: DbUser[];
  sessions: DbSession[];
  ownership: Record<string, string[]>; // userId -> slugs
  favorites: Record<string, string[]>; // userId -> slugs
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
    const initial: DbShape = { users: [], sessions: [], ownership: {}, favorites: {} };
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

export async function findOrCreateUser(name: string, email: string): Promise<DbUser> {
  const db = await readDb();
  let user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    user = { id: crypto.randomUUID(), name, email };
    db.users.push(user);
    await writeDb(db);
  }
  return user;
}

export async function getUserBySessionToken(token: string | undefined | null): Promise<DbUser | null> {
  if (!token) return null;
  const db = await readDb();
  const session = db.sessions.find((s) => s.token === token);
  if (!session) return null;
  const user = db.users.find((u) => u.id === session.userId) || null;
  return user || null;
}

export async function createSession(userId: string): Promise<string> {
  const db = await readDb();
  const token = crypto.randomUUID();
  db.sessions.push({ token, userId, createdAt: Date.now() });
  await writeDb(db);
  return token;
}

export async function deleteSession(token: string | undefined | null): Promise<void> {
  if (!token) return;
  const db = await readDb();
  db.sessions = db.sessions.filter((s) => s.token !== token);
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