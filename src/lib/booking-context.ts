export type BookingDevice = "desktop" | "mobile" | "tablet";
export type BookingSearchContext = { device?: BookingDevice };

/** Match the visitor's platform; a desktop quote must not silently become a mobile offer. */
export function bookingDevice(userAgent: string | null): BookingDevice {
  const ua = (userAgent || "").slice(0, 2000);
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  return /Mobile|iPhone|iPod|Android/i.test(ua) ? "mobile" : "desktop";
}

type Stay = { checkin: string; checkout: string; adults: number; rooms: number };

/** Retain any actual offer identifiers supplied by Booking; never invent a room/rate lock. */
export function bookingPropertyUrl(raw: unknown, stay: Stay, affiliate?: string): string | null {
  let url: URL;
  try { if (typeof raw !== "string") return null; url = new URL(raw); } catch { return null; }
  if (url.protocol !== "https:" || !["www.booking.com", "booking.com"].includes(url.hostname)
    || url.port || url.username || url.password || !url.pathname.startsWith("/hotel/")) return null;
  for (const [key, expected] of Object.entries({ checkin: stay.checkin, checkout: stay.checkout,
    group_adults: String(stay.adults), no_rooms: String(stay.rooms), group_children: "0" })) {
    const values = url.searchParams.getAll(key);
    if ((key !== "group_children" && values.length === 0) || values.some((value) => value !== expected)) return null;
    url.searchParams.set(key, expected);
  }
  if (url.searchParams.has("age") || url.searchParams.has("children_ages")) return null;
  // Canonical full dates and occupancy above are the single source of truth.
  for (const key of ["checkin_year", "checkin_month", "checkin_monthday", "checkout_year", "checkout_month", "checkout_monthday",
    "flex_window", "flexible_date_search", "flexible_dates", "req_adults", "req_children", "req_age"]) url.searchParams.delete(key);
  url.searchParams.set("selected_currency", "TRY");
  url.searchParams.set("lang", "tr");
  url.searchParams.set("sb_price_type", "total");
  url.searchParams.set("type", "total");
  for (const key of ["aid", "sid", "session_token"]) url.searchParams.delete(key);
  if (affiliate && /^\d+$/.test(affiliate)) url.searchParams.set("aid", affiliate);
  return url.toString();
}
