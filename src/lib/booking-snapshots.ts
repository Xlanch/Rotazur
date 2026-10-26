import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { City, HotelOption } from "./types";
import type { BookingSearchContext } from "./booking-context";
import { bookingPropertyUrl } from "./booking-context";
import { isHotelQuote } from "./hotel-data";
import { bookingLocationCountryMatches, hotelSearchRadiusKm } from "./hotel-location";
import { haversineKm } from "./travel-utils";
import { hasMapCoordinates } from "./map-data";

const folder = () => path.join(process.cwd(), "data", "booking-snapshots");
export function bookingImportMode(): boolean {
  try {
    const file = path.join(folder(), "manifest.json");
    if (fs.statSync(file).size > 100_000) return false;
    const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
    return manifest.version === 1 && manifest.mode === "once";
  } catch { return false; }
}

/** Restore catalogue facts; only an exactly matching stay retains its archived price. */
export function importedBookingHotels(city: City, start: string, end: string, adults: number, eur: number, context: BookingSearchContext = {}): HotelOption[] {
  if (!/^[a-z0-9-]+$/.test(city.id)) return [];
  try {
    const file = path.join(folder(), city.id + ".json");
    if (fs.statSync(file).size > 2_000_000) return [];
    const record = JSON.parse(fs.readFileSync(file, "utf8"));
    if (record.version !== 1 || record.cityId !== city.id || !Array.isArray(record.hotels) || record.hotels.length > 25) return [];
    const rooms = Math.ceil(adults / 2), device = context.device || "desktop";
    return record.hotels.flatMap((hotel: HotelOption): HotelOption[] => {
      const q = hotel?.bookingQuote;
      if (!isHotelQuote(q) || hotel.source !== "booking-serpapi" || hotel.id !== `booking-${q.hotelId}`
        || !bookingLocationCountryMatches(hotel.bookingUrl || "", city.id) || !hasMapCoordinates(hotel)
        || haversineKm(city.lat, city.lon, hotel.lat, hotel.lon) > hotelSearchRadiusKm(city.id)
        || (hotel.hotelLocation && hotel.hotelLocation.cityId !== city.id)) return [];
      const exact = q.checkin === start && q.checkout === end && q.adults === adults && q.rooms === rooms && (q.device || "desktop") === device;
      const original = new URL(hotel.bookingUrl!);
      const requested = exact ? original : new URL(original.origin + original.pathname);
      if (!exact) for (const [key, value] of Object.entries({ checkin: start, checkout: end, group_adults: String(adults), no_rooms: String(rooms), group_children: "0" })) requested.searchParams.set(key, value);
      const link = bookingPropertyUrl(requested.href, { checkin: start, checkout: end, adults, rooms });
      if (!link) return [];
      const bookingCatalog: NonNullable<HotelOption["bookingCatalog"]> = { hotelId: q.hotelId, checkedAt: q.checkedAt,
        checkin: q.checkin, checkout: q.checkout, adults: q.adults, rooms: q.rooms, device: q.device || "desktop" };
      if (exact) return [{ ...hotel, link, bookingUrl: link, bookingCatalog, bookingQuote: { ...q, kind: "snapshot" } }];
      // Identity/address/GPS remain valid catalogue facts. Prices and room policies
      // for another search must never be carried into the requested reservation.
      return [{ ...hotel, link, bookingUrl: link, bookingCatalog, bookingQuote: undefined,
        agodaUrl: undefined, tripUrl: undefined, googleHotelsUrl: undefined, hotellookUrl: undefined,
        pricePerNightTry: Math.round(city.hotelEur * eur * rooms), roomCount: rooms,
        capacityLabel: `${adults} yetişkin · ${rooms} oda araması`, roomType: "Oda ve müsaitlik Booking’de kontrol edilmeli", amenities: [] }];
    });
  } catch { return []; }
}
