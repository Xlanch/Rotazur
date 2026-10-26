import "server-only";
import type { City, HotelOption } from "../types";
import { fetchJson, haversineKm } from "../server-utils";
import { nightsBetween } from "../travel-utils";
import { bookingPropertyUrl, type BookingSearchContext } from "../booking-context";
import { bookingLocationCountryMatches, hotelSearchRadiusKm } from "../hotel-location";
import { hasMapCoordinates } from "../map-data";

export function bookingSearchConfigured(): boolean {
  const key = process.env.SERPAPI_KEY?.trim();
  return process.env.HOTEL_PRICE_PROVIDER === "booking-serpapi" && !!key && !/YOUR_|PLACEHOLDER|_HERE/i.test(key);
}

const amount = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100_000_000;
const money = (value: number) => Math.round(value * 100) / 100;
const text = (value: unknown, max = 500) => typeof value === "string" ? value.slice(0, max) : "";
function propertyImage(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2000) return;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && !url.username && !url.password && !url.port
      && (url.hostname === "bstatic.com" || url.hostname.endsWith(".bstatic.com"))) return url.href;
  } catch { /* Unverified image is omitted. */ }
}

export function normalizeBookingResults(raw: unknown, city: City, start: string, end: string, adults: number, rooms: number, context: BookingSearchContext = {}): HotelOption[] {
  const response = raw as Record<string, any>;
  const params = response?.search_parameters;
  if (!params || params.engine !== "booking" || params.check_in_date !== start || params.check_out_date !== end
    || Number(params.adults) !== adults || Number(params.rooms) !== rooms || params.currency !== "TRY"
    || (params.children !== undefined && Number(params.children) !== 0) || params.children_ages || params.flex_window
    || (params.device !== undefined && params.device !== (context.device || "desktop"))) throw new Error("Otel arama koşulları doğrulanamadı.");
  if (response.error || response.search_metadata?.status !== "Success" || !Array.isArray(response.properties)) throw new Error("Otel sonuçları doğrulanamadı.");
  const destination = response.search_information?.destination;
  if (typeof destination === "string") {
    const normalize = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ı/g, "i").replace(/[^a-z0-9]+/g, " ").trim();
    const matched = normalize(destination);
    const aliases = [city.name, city.wiki.replaceAll("_", " "), city.bookingQuery || ""].map(s => normalize(s.replace(/\([^)]*\)/g, "").split(",")[0])).filter(Boolean);
    const region = /\b(lake|canton|county|airport|havaalani|havalimani|golu|kontluk|kanton|emirligi)\b/.test(matched);
    if (!aliases.some(a => (` ${matched} `).includes(` ${a} `)) || (region && city.id !== "bali")) throw new Error("Otel aramasının hedef şehri doğrulanamadı.");
  }
  const stamp = Date.parse(String(response.search_metadata.processed_at || response.search_metadata.created_at || "").replace(" UTC", "Z").replace(" ", "T"));
  if (!Number.isFinite(stamp) || stamp > Date.now() + 60_000 || stamp < Date.now() - 10 * 60_000) throw new Error("Otel fiyatı güncel olarak doğrulanamadı.");
  const checkedAt = new Date(stamp).toISOString();
  const nights = nightsBetween(start, end), seen = new Set<number>();
  return response.properties.flatMap((p: any): HotelOption[] => {
    if (!p || p.sold_out || !Number.isSafeInteger(p.property_id) || p.property_id <= 0 || seen.has(p.property_id)
      || !text(p.name) || p.currency !== "TRY" || !amount(p.extracted_price) || p.extracted_price <= 0
      || (p.check_in_date && p.check_in_date !== start) || (p.check_out_date && p.check_out_date !== end)) return [];
    const position = { lat: p.gps_coordinates?.latitude, lon: p.gps_coordinates?.longitude };
    if (!hasMapCoordinates(position) || haversineKm(position.lat, position.lon, city.lat, city.lon) > hotelSearchRadiusKm(city.id)) return [];
    const url = bookingPropertyUrl(p.link, { checkin: start, checkout: end, adults, rooms }, process.env.BOOKING_AFFILIATE_ID?.trim());
    if (!url || !bookingLocationCountryMatches(url, city.id)) return [];
    const taxes = p.extracted_taxes_and_fees === undefined ? null : p.extracted_taxes_and_fees;
    if (taxes !== null && !amount(taxes)) return [];
    const stay = money(p.extracted_price), knownTotal = money(stay + (taxes || 0));
    const stars = Number.isInteger(p.hotel_class) && p.hotel_class >= 1 && p.hotel_class <= 5 ? p.hotel_class : 0;
    const roomOffers: { name: string; quantity?: number; unitType?: string }[] = Array.isArray(p.rooms) ? p.rooms.slice(0, 9).flatMap((r: any) => {
      const name = text(r?.name, 150);
      if (!name) return [];
      return [{ name, quantity: Number.isInteger(r.quantity) && r.quantity > 0 && r.quantity <= 30 ? r.quantity : undefined,
        unitType: text(r.type, 150) || undefined }];
    }) : [];
    seen.add(p.property_id);
    return [{
      id: `booking-${p.property_id}`, name: text(p.name), stars, image: propertyImage(p.thumbnail || p.image),
      rating: amount(p.rating) && p.rating <= 10 ? p.rating : 0,
      reviews: Number.isSafeInteger(p.reviews) && p.reviews >= 0 ? p.reviews : 0,
      pricePerNightTry: knownTotal / nights, roomCount: rooms,
      capacityLabel: `${adults} yetişkin · ${rooms} oda araması`, roomType: roomOffers.map((r) => `${r.quantity ? `${r.quantity} × ` : ""}${r.name}`).join(" + ") || "Oda bilgisi sağlayıcıda",
      roomTypeTag: p.type === "Hostel" ? "hostel" : p.type === "Guesthouse" ? "guesthouse" : p.type === "Apartment" ? "apartment" : stars >= 4 ? "luxury" : "hotel",
      lat: position.lat, lon: position.lon,
      distanceKm: Math.round(haversineKm(position.lat, position.lon, city.lat, city.lon) * 10) / 10,
      locationSource: "booking-serpapi", neighborhood: text(p.location), amenities: p.meal_plan ? [text(p.meal_plan)] : [],
      hotelLocation: text(p.address, 500).trim() ? { source: "booking-serpapi", propertyId: p.property_id, cityId: city.id,
        lat: position.lat, lon: position.lon, address: text(p.address, 500).trim(), checkedAt, propertyPath: new URL(url).pathname } : undefined,
      source: "booking-serpapi", link: url, bookingUrl: url,
      bookingQuote: { hotelId: p.property_id, checkin: start, checkout: end, adults, rooms, currency: "TRY",
        displayTotalTry: stay, displayNightlyTry: amount(p.extracted_price_per_night) && p.extracted_price_per_night > 0 ? money(p.extracted_price_per_night) : undefined,
        excludedTaxesTry: taxes, knownTotalTry: knownTotal, checkedAt, device: context.device || "desktop", roomOffers,
        freeCancellation: typeof p.free_cancellation === "boolean" ? p.free_cancellation : undefined,
        freeCancellationUntil: typeof p.free_cancellation_until === "string" && Number.isFinite(Date.parse(p.free_cancellation_until)) ? p.free_cancellation_until : undefined,
        noPrepayment: typeof p.no_prepayment === "boolean" ? p.no_prepayment : undefined,
        mealPlan: text(p.meal_plan, 200) || undefined,
        deals: Array.isArray(p.deals) ? p.deals.filter((d: unknown) => typeof d === "string").slice(0, 10).map((d: string) => d.slice(0, 150)) : [],
        disclaimer: text(p.price_disclaimer, 1000) || (taxes === null ? "Ek ücret bilgisi sağlayıcıda doğrulanmalıdır." : undefined) },
    }];
  }).sort((a: HotelOption, b: HotelOption) => a.pricePerNightTry - b.pricePerNightTry).slice(0, 25);
}

export async function bookingHotels(city: City, start: string, end: string, adults: number, context: BookingSearchContext = {}): Promise<HotelOption[]> {
  if (!bookingSearchConfigured()) throw new Error("Canlı Booking araması yapılandırılmadı.");
  const rooms = Math.ceil(adults / 2);
  const query = new URLSearchParams({ engine: "booking", q: city.bookingQuery || city.wiki.replaceAll("_", " "),
    check_in_date: start, check_out_date: end, adults: String(adults), children: "0", rooms: String(rooms),
    currency: "TRY", hl: "tr", device: context.device || "desktop", sort_by: "price", limit: "25", no_cache: "true", api_key: process.env.SERPAPI_KEY!.trim() });
  const response = await fetchJson(`https://serpapi.com/search.json?${query}`, undefined, 25000);
  return normalizeBookingResults(response, city, start, end, adults, rooms, context);
}
