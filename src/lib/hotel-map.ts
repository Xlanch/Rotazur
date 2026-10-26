import type { HotelOption } from "./types";
import type { MapMarker } from "../components/MapView";
import { hotelCoordinates } from "./hotel-data";

export const hotelMarkerId = (hotel: HotelOption) => `hotel:${hotel.id}`;

export function hotelMapMarkers(hotels: HotelOption[], selectedId?: string): MapMarker[] {
  const seen = new Set<string>();
  return hotels.flatMap((hotel) => {
    const point = hotelCoordinates(hotel);
    if (!point || seen.has(hotel.id)) return [];
    seen.add(hotel.id);
    return [{ id: hotelMarkerId(hotel), ...point, title: `🏨 ${hotel.name}`,
      subtitle: `${hotel.hotelLocation!.address} · Booking GPS kaydı`, color: "#ec4899", label: "H", small: hotel.id !== selectedId }];
  });
}
