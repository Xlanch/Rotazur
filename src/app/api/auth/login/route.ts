import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { verifyLoginPasswordAsync, hashPasswordAsync, passwordNeedsUpgrade, checkUnknownPassword, PasswordBusyError } from "@/lib/passwords";
import { immediateTransaction } from "@/lib/db-transaction";
import { checkRateLimit } from "@/lib/rate-limit";
import { isSameOriginRequest, readJsonObject, RequestError } from "@/lib/request-security";
import { limitPublicRequest } from "@/lib/public-request";

export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req)) {
      return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
    }
    const limited = limitPublicRequest(req, "login", 30, 200, 15 * 60_000);
    if (limited) return limited;
    const body = await readJsonObject(req);
    const { email, password } = body;

    if (typeof email !== "string" || typeof password !== "string" || !email || !password || email.length > 254 || password.length > 1024) {
      return NextResponse.json({ error: "Lütfen e-posta ve şifrenizi girin." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!checkRateLimit(`login:${cleanEmail}`, 10, 15 * 60 * 1000).allowed) {
      return NextResponse.json({ error: "Çok fazla giriş denemesi. Lütfen daha sonra tekrar deneyin." }, { status: 429 });
    }

    const stmt = db.prepare(`
      SELECT id, name, email, password_hash, password_salt, avatar_url, provider
      FROM users
      WHERE email = ?
    `);

    const user = stmt.get(cleanEmail) as {
      id: string;
      name: string;
      email: string;
      password_hash: string | null;
      password_salt: string | null;
      avatar_url: string | null;
      provider: string;
    } | undefined;

    if (!user || !user.password_hash || !user.password_salt) {
      await checkUnknownPassword(password);
      return NextResponse.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });
    }

    const isValid = await verifyLoginPasswordAsync(password, user.password_salt, user.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });
    }

    const upgraded = passwordNeedsUpgrade(user.password_hash) ? await hashPasswordAsync(password) : null;
    const session = immediateTransaction(() => {
      // A reset or account removal during asynchronous hashing must win over
      // this login. Recheck the exact credentials before upgrading/issuing.
      const current = db.prepare("SELECT id FROM users WHERE id = ? AND password_hash = ? AND password_salt = ?")
        .get(user.id, user.password_hash, user.password_salt);
      if (!current) return null;
      if (upgraded) db.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?").run(upgraded.hash, upgraded.salt, user.id);
      return createSession(user.id);
    });
    if (!session) return NextResponse.json({ error: "E-posta veya şifre hatalı." }, { status: 401 });
    const { token, expiresAt } = session;

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatar_url,
        provider: user.provider,
      },
    });
    response.headers.set("Cache-Control", "private, no-store");

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return response;
  } catch (err: unknown) {
    if (err instanceof PasswordBusyError) return NextResponse.json({ error: "Sunucu meşgul. Lütfen birkaç saniye sonra tekrar deneyin." }, { status: 503, headers: { "Retry-After": "3", "Cache-Control": "private, no-store" } });
    if (err instanceof RequestError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Login error:", err);
    return NextResponse.json({ error: "Giriş yapılırken bir hata oluştu." }, { status: 500 });
  }
}
