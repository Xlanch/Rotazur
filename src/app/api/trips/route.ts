import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { isSameOriginRequest, readJsonObject, RequestError } from "@/lib/request-security";
import { normalizeTripRecord } from "@/lib/trip-record";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
    }

    const stmt = db.prepare(`
      SELECT id, city_id, city_name, city_flag, country, start_date, end_date, total_cost_try, travelers, data_json, created_at
      FROM saved_trips
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);

    const rows = stmt.all(user.id) as Array<{
      id: string;
      city_id: string;
      city_name: string;
      city_flag: string;
      country: string;
      start_date: string;
      end_date: string;
      total_cost_try: number;
      travelers: number;
      data_json: string;
      created_at: string;
    }>;

    const trips = rows.map((r) => {
      let parsed: Record<string, unknown> = {};
      try {
        const extra = JSON.parse(r.data_json);
        if (extra && typeof extra === "object" && !Array.isArray(extra)) {
          for (const key of ["budgetTry", "url", "snapshot", "savedAt"]) {
            if (Object.hasOwn(extra, key)) parsed[key] = extra[key];
          }
        }
      } catch {}
      return {
        ...parsed,
        id: r.id,
        cityId: r.city_id,
        cityName: r.city_name,
        cityFlag: r.city_flag,
        country: r.country,
        startDate: r.start_date,
        endDate: r.end_date,
        totalCostTry: r.total_cost_try,
        travelers: r.travelers,
        createdAt: r.created_at,
      };
    });

    return NextResponse.json({ trips }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err: unknown) {
    console.error("Get trips error:", err);
    return NextResponse.json({ error: "Rotalar yüklenirken bir hata oluştu." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
    }

    if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
    const rate = checkRateLimit(`trips:${user.id}`, 60, 10 * 60_000);
    if (!rate.allowed) return NextResponse.json({ error: "Çok sık kayıt isteği. Lütfen daha sonra tekrar deneyin." }, { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil(rate.resetInMs / 1000))) } });
    const record = normalizeTripRecord(await readJsonObject(req, 512 * 1024));
    const tripId = record.id ?? crypto.randomUUID();
    const existing = db.prepare("SELECT user_id FROM saved_trips WHERE id = ?").get(tripId) as { user_id: string } | undefined;
    if (existing && existing.user_id !== user.id) return NextResponse.json({ error: "Plan bulunamadı." }, { status: 404 });
    const stmt = db.prepare(`
      INSERT INTO saved_trips (id, user_id, city_id, city_name, city_flag, country, start_date, end_date, total_cost_try, travelers, data_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET city_id = excluded.city_id, city_name = excluded.city_name,
        city_flag = excluded.city_flag, country = excluded.country, start_date = excluded.start_date,
        end_date = excluded.end_date, total_cost_try = excluded.total_cost_try, travelers = excluded.travelers,
        data_json = excluded.data_json WHERE saved_trips.user_id = excluded.user_id
    `);

    const result = stmt.run(
      tripId,
      user.id,
      record.city.id,
      record.city.name,
      record.city.flag,
      record.city.country,
      record.startDate,
      record.endDate,
      record.totalCostTry,
      record.travelers,
      JSON.stringify(record.extra)
    );
    if (!result.changes) return NextResponse.json({ error: "Plan bulunamadı." }, { status: 404 });

    return NextResponse.json({ success: true, tripId });
  } catch (err: unknown) {
    if (err instanceof RequestError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("Save trip error:", err);
    return NextResponse.json({ error: "Rota kaydedilirken bir hata oluştu." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
    }

    if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Geçersiz istek kaynağı." }, { status: 403 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID belirtilmedi." }, { status: 400 });
    }

    const stmt = db.prepare("DELETE FROM saved_trips WHERE id = ? AND user_id = ?");
    const result = stmt.run(id, user.id);
    if (!result.changes) return NextResponse.json({ error: "Plan bulunamadı." }, { status: 404 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("Delete trip error:", err);
    return NextResponse.json({ error: "Rota silinirken bir hata oluştu." }, { status: 500 });
  }
}
