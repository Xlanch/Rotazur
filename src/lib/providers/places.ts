import type { CheapPlace, City } from "../types";
import { cached, fetchJson } from "../server-utils";

interface OverpassEl {
  id: number;
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

function categorize(t: Record<string, string>): CheapPlace["category"] | null {
  if (t.amenity === "marketplace" || t.shop === "supermarket" || t.shop === "greengrocer") return "pazar";
  if (t.shop === "second_hand" || t.shop === "mall" || t.shop === "department_store" || t.shop === "clothes") return "alisveris";
  if (t.amenity === "cafe") return "kafe";
  if (t.amenity === "fast_food" || t.amenity === "food_court" || t.amenity === "restaurant") return "yemek";
  return null;
}

/** OpenStreetMap Overpass — ücretsiz, anahtarsız: ucuz yemek, pazarlar, ikinci el / outlet */
async function overpassPlaces(city: City): Promise<CheapPlace[]> {
  const r = 1600;
  const q = `[out:json][timeout:20];
(
  nwr(around:${r},${city.lat},${city.lon})["amenity"~"^(fast_food|food_court|marketplace)$"]["name"];
  nwr(around:${r},${city.lat},${city.lon})["amenity"="restaurant"]["cuisine"~"kebab|pizza|burger|street|local|regional|sandwich"]["name"];
  nwr(around:${r},${city.lat},${city.lon})["amenity"="cafe"]["name"];
  nwr(around:${r * 1.5},${city.lat},${city.lon})["shop"~"^(second_hand|mall|department_store|greengrocer)$"]["name"];
);
out center 150;`;
  const mirrors = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
  let data: { elements: OverpassEl[] } | null = null;
  for (const m of mirrors) {
    try {
      data = await fetchJson(m, {
        method: "POST",
        body: "data=" + encodeURIComponent(q),
        headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "RotaPlanlayicisi/0.1" },
      }, 15000);
      break;
    } catch {
      /* sonraki ayna */
    }
  }
  if (!data) return [];
  const out: CheapPlace[] = [];
  const counts: Record<string, number> = {};
  for (const el of data.elements) {
    const t = el.tags ?? {};
    const cat = categorize(t);
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (!cat || lat == null || lon == null || !t.name) continue;
    counts[cat] = (counts[cat] ?? 0) + 1;
    if (counts[cat] > 14) continue;
    out.push({
      id: `${el.type}${el.id}`,
      name: t.name,
      category: cat,
      lat,
      lon,
      detail: t.cuisine?.replace(/_/g, " ").replace(/;/g, ", ") ?? t.shop?.replace(/_/g, " ") ?? undefined,
    });
  }
  return out;
}

/** Google Places API (New) — GOOGLE_PLACES_KEY varsa ucuz ve yüksek puanlı yerler */
async function googlePlaces(city: City): Promise<CheapPlace[]> {
  const queries: [string, CheapPlace["category"]][] = [
    [`cheap eats in ${city.wiki}`, "yemek"],
    [`local market in ${city.wiki}`, "pazar"],
    [`outlet or second hand shop in ${city.wiki}`, "alisveris"],
    [`cafe in ${city.wiki}`, "kafe"],
  ];
  const results = await Promise.all(
    queries.map(async ([textQuery, category]) => {
      const data = await fetchJson<{
        places?: { id: string; displayName?: { text: string }; location: { latitude: number; longitude: number }; rating?: number; formattedAddress?: string }[];
      }>("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_PLACES_KEY!,
          "X-Goog-FieldMask": "places.id,places.displayName,places.location,places.rating,places.formattedAddress",
        },
        body: JSON.stringify({
          textQuery,
          languageCode: "tr",
          maxResultCount: 10,
          ...(category === "yemek" || category === "kafe" ? { priceLevels: ["PRICE_LEVEL_INEXPENSIVE"] } : {}),
        }),
      });
      return (data.places ?? []).map<CheapPlace>((p) => ({
        id: p.id,
        name: p.displayName?.text ?? "",
        category,
        lat: p.location.latitude,
        lon: p.location.longitude,
        rating: p.rating,
        detail: p.formattedAddress,
      }));
    }),
  );
  return results.flat();
}

export async function getCheapPlaces(city: City): Promise<{ places: CheapPlace[]; source: "google" | "osm" | "yok" }> {
  if (process.env.GOOGLE_PLACES_KEY) {
    try {
      const places = await cached(`gp:${city.id}`, 24 * 3600_000, () => googlePlaces(city));
      if (places.length) return { places, source: "google" };
    } catch (e) {
      console.warn("[places] Google Places hatası:", (e as Error).message);
    }
  }
  const places = await cached(`osm:${city.id}`, 24 * 3600_000, () => overpassPlaces(city));
  return { places, source: places.length ? "osm" : "yok" };
}
