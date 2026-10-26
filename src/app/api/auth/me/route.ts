import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err: unknown) {
    console.error("Me error:", err);
    return NextResponse.json({ user: null }, { status: 500, headers: { "Cache-Control": "private, no-store" } });
  }
}
