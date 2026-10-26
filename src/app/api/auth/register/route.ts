import { NextResponse } from "next/server";

// Registration is completed only by /send-code followed by /verify-code.
export async function POST() {
  return NextResponse.json(
    { error: "Kayıt için e-posta doğrulaması gereklidir. Kayıt formundan doğrulama kodu isteyin." },
    { status: 403 },
  );
}
