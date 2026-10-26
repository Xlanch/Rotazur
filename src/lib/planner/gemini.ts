import type { City, PlanDay } from "../types";
import { fetchJson } from "../server-utils";

interface GeminiArgs {
  city: City;
  draft: PlanDay[];
  interests: string[];
  travelers: number;
  activityBudgetTry: number;
  eur: number;
}

/**
 * Kural tabanlı taslağı Gemini ile zenginleştirir: daha doğal açıklamalar,
 * yerel ipuçları ve ilgi alanlarına göre ek öneriler. Bütçe sınırlarını korur.
 */
export async function enhanceWithGemini(a: GeminiArgs): Promise<{ days: PlanDay[]; tips: string[] } | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const prompt = `Sen deneyimli ve bütçe bilinçli bir Türk seyahat planlayıcısısın.
Aşağıdaki ${a.city.name} (${a.city.country}) gezi taslağını Türkçe olarak iyileştir.
- Yolcu sayısı: ${a.travelers}. İlgi alanları: ${a.interests.join(", ") || "genel"}.
- Aktivitelere (giriş ücretleri) ayrılabilecek toplam üst sınır: ${Math.round(a.activityBudgetTry)} TRY.
- 1 EUR = ${a.eur.toFixed(2)} TRY. Tüm costTry değerleri TÜM yolcular için toplam TRY olmalı.
- Uçuş/varış/dönüş/check-in saatlerini ve günlerin sayısını DEĞİŞTİRME.
- Açıklamaları kısa, samimi ve pratik yaz (1-2 cümle), para tasarrufu ipuçları ekle.
- Aktivite ekleme veya çıkarma. Sırayı, isimleri, saatleri, maliyetleri ve koordinatları değiştirme; sadece açıklamaları ve gün başlıklarını iyileştir.
- kind değerleri: "ulasim" | "gezi" | "yemek" | "otel" | "serbest".
- Ayrıca 4-6 maddelik, bu şehre özgü bütçe ipuçları ("tips") ver.

Taslak (JSON):
${JSON.stringify(a.draft)}

Sadece şu şemada JSON döndür:
{"days":[{"day":1,"date":"YYYY-MM-DD","title":"...","activities":[{"time":"HH:MM","title":"...","description":"...","costTry":0,"lat":0,"lon":0,"kind":"gezi"}]}],"tips":["..."]}`;

  try {
    const data = await fetchJson<{ candidates?: { content?: { parts?: { text?: string }[] } }[] }>(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
        }),
      },
      45000,
    );
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
    const parsed = JSON.parse(text) as { days?: PlanDay[]; tips?: string[] };
    if (!Array.isArray(parsed.days) || parsed.days.length !== a.draft.length) return null;
    const days: PlanDay[] = [];
    for (const [index, draft] of a.draft.entries()) {
      const suggested = parsed.days[index];
      if (!Array.isArray(suggested?.activities) || suggested.activities.length !== draft.activities.length) return null;
      days.push({
        ...draft,
        title: typeof suggested.title === "string" ? suggested.title.slice(0, 160) : draft.title,
        activities: draft.activities.map((activity, position) => ({
          ...activity,
          // Only prose is accepted. Prices, coordinates, order and fixed times remain authoritative.
          description: typeof suggested.activities[position]?.description === "string"
            ? suggested.activities[position].description.slice(0, 1200) : activity.description,
        })),
      });
    }
    if (days.some((d) => d.activities.length === 0)) return null;
    return { days, tips: (Array.isArray(parsed.tips) ? parsed.tips : []).slice(0, 6).map((tip) => String(tip).slice(0, 500)) };
  } catch (e) {
    console.warn("[gemini] plan zenginleştirme başarısız:", (e as Error).message);
    return null;
  }
}
