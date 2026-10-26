import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "./db";
export { hashPassword, verifyPassword } from "./passwords";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  provider: "credentials" | "google";
  createdAt: string;
}

export const SESSION_COOKIE_NAME = "rota_session";
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 gün

const sessionId = (token: string) => "sha256:" + crypto.createHash("sha256").update(token).digest("hex");

/**
 * Yeni kullanıcı oturumu (session) oluşturur ve token döndürür
 */
export function createSession(userId: string): { token: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at, auth_version)
    VALUES (?, ?, ?, 1)
  `);
  stmt.run(sessionId(token), userId, expiresAt.toISOString());

  return { token, expiresAt };
}

/**
 * Oturum token'ından kullanıcıyı getirir
 */
export function getSessionUser(token: string): AuthUser | null {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;

  const stmt = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_url, u.provider, u.created_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.auth_version = 1
      AND julianday(s.expires_at) > julianday('now')
  `);

  const row = stmt.get(sessionId(token)) as {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
    provider: string;
    created_at: string;
  } | undefined;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    avatarUrl: row.avatar_url,
    provider: (row.provider as "credentials" | "google") || "credentials",
    createdAt: row.created_at,
  };
}

/**
 * Oturumu sonlandırır
 */
export function deleteSession(token: string): void {
  if (!/^[a-f0-9]{64}$/.test(token)) return;
  const stmt = db.prepare(`DELETE FROM sessions WHERE id = ?`);
  stmt.run(sessionId(token));
}

/**
 * Sunucu tarafında (Server Components / API Route) aktif kullanıcıyı çeker
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return getSessionUser(token);
  } catch {
    return null;
  }
}
