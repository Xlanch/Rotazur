import type { HotelOption } from "./types";
import { hasMapCoordinates } from "./map-data";

import destinations from "./data/destinations.json";

const COUNTRIES: Record<string, string> = Object.fromEntries(destinations.map(city => [city.id, city.countryCode]));

/** City results must not silently become a country-wide catalogue. Bali is an island destination. */
export function hotelSearchRadiusKm(cityId: string): number { return cityId === "bali" ? 150 : 50; }

export function bookingCountryCode(cityId: string): string | null {
  return Object.hasOwn(COUNTRIES, cityId) ? COUNTRIES[cityId] : null;
}

export function bookingLocationCountryMatches(link: string, cityId: string): boolean {
  const country = bookingCountryCode(cityId);
  if (!country) return false;
  try {
    const url = new URL(link);
    return url.protocol === "https:" && ["www.booking.com", "booking.com"].includes(url.hostname)
      && !url.port && !url.username && !url.password && new RegExp(`^/hotel/${country}/[^/]+\\.html$`, "i").test(url.pathname);
  } catch { return false; }
}

/** A valid number alone is not proof that it belongs to this hotel. Require a joined source record. */
export function hotelLocationRecord(hotel?: HotelOption | null): NonNullable<HotelOption["hotelLocation"]> | null {
  const location = hotel?.hotelLocation;
  if (!hotel || hotel.source !== "booking-serpapi" || hotel.locationSource !== "booking-serpapi" || !location
    || location.source !== "booking-serpapi" || !Number.isSafeInteger(location.propertyId) || location.propertyId <= 0
    || hotel.id !== `booking-${location.propertyId}` || (hotel.bookingQuote?.hotelId ?? hotel.bookingCatalog?.hotelId) !== location.propertyId
    || !hasMapCoordinates(location) || hotel.lat !== location.lat || hotel.lon !== location.lon
    || typeof location.address !== "string" || !location.address.trim() || location.address.length > 500
    || typeof location.cityId !== "string" || typeof location.checkedAt !== "string" || !Number.isFinite(Date.parse(location.checkedAt))
    || !bookingLocationCountryMatches(hotel.bookingUrl || "", location.cityId)
    || new URL(hotel.bookingUrl!).pathname !== location.propertyPath) return null;
  return location;
}
