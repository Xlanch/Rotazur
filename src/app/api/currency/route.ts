import { NextResponse } from "next/server";
import { getRates } from "@/lib/providers/currency";

export const revalidate = 3600; // 1 saat önbellek

export async function GET() {
  try {
    const rates = await getRates();
    return NextResponse.json(rates);
  } catch (err: unknown) {
    console.error("Currency API error:", err);
    return NextResponse.json(
      { error: "Kurlar alınamadı" },
      { status: 500 }
    );
  }
}
