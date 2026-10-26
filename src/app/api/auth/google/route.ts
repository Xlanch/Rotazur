import { NextResponse } from "next/server";

// Fail closed until a real Google OAuth flow verifies issuer, audience and identity.
// Client-supplied email/name fields must never create an authenticated session.
export async function POST() {
  return NextResponse.json(
    { error: "Google ile giriş henüz yapılandırılmadı. E-posta ve şifrenizle giriş yapabilirsiniz." },
    { status: 503 },
  );
}
