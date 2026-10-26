import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import { isSameOriginRequest } from "@/lib/request-security";

export async function POST(req: Request) {
  try {
    if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      deleteSession(token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  } catch (err: unknown) {
    console.error("Logout error:", err);
    return NextResponse.json({ error: "Çıkış yapılırken bir hata oluştu." }, { status: 500 });
  }
}
