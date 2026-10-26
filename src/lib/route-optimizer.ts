import type { PlanActivity, HotelOption } from "./types";
import { hasCoordinates, timeMinutes } from "./travel-utils";
import { hotelCoordinates } from "./hotel-data";

/** İki koordinat arası kuş uçuşu mesafe (kilometre cinsinden) */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Dünya yarıçapı km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Koordinatları olan bir durak listesinin toplam yürüyüş mesafesini hesaplar */
export function calculateTotalDistance(
  stops: { lat?: number; lon?: number }[],
  origin?: { lat?: number; lon?: number }
): number {
  const validStops: { lat: number; lon: number }[] = [];
  if (origin && Number.isFinite(origin.lat) && Number.isFinite(origin.lon)) {
    validStops.push({ lat: origin.lat!, lon: origin.lon! });
  }
  for (const s of stops) {
    if (Number.isFinite(s.lat) && Number.isFinite(s.lon)) validStops.push({ lat: s.lat!, lon: s.lon! });
  }

  let total = 0;
  for (let i = 0; i < validStops.length - 1; i++) {
    total += haversineDistance(
      validStops[i].lat,
      validStops[i].lon,
      validStops[i + 1].lat,
      validStops[i + 1].lon
    );
  }
  return total;
}

/**
 * 2-Opt ve Nearest-Neighbor Gezgin Satıcı (TSP) Algoritması:
 * Kullanıcının gün içindeki duraklarını en az yürüyecek şekilde akıllı sıralar.
 */
function optimizeCoordinateBlock(
  activities: PlanActivity[],
  hotel?: HotelOption | null
): {
  optimized: PlanActivity[];
  originalKm: number;
  optimizedKm: number;
  savedKm: number;
  savedPercent: number;
} {
  if (activities.length <= 2) {
    const km = calculateTotalDistance(activities, hotel || undefined);
    return {
      optimized: activities,
      originalKm: Math.round(km * 10) / 10,
      optimizedKm: Math.round(km * 10) / 10,
      savedKm: 0,
      savedPercent: 0,
    };
  }

  const originalKm = calculateTotalDistance(activities, hotel || undefined);

  // Koordinatı olan ve olmayan aktiviteleri ayır
  const withCoords = activities.filter((a) => Number.isFinite(a.lat) && Number.isFinite(a.lon));
  const withoutCoords = activities.filter((a) => !Number.isFinite(a.lat) || !Number.isFinite(a.lon));

  if (withCoords.length <= 1) {
    return {
      optimized: activities,
      originalKm: Math.round(originalKm * 10) / 10,
      optimizedKm: Math.round(originalKm * 10) / 10,
      savedKm: 0,
      savedPercent: 0,
    };
  }

  // 1. Adım: En Yakın Komşu (Nearest Neighbor) ile Başlangıç Turu Oluştur
  const unvisited = [...withCoords];
  const route: PlanActivity[] = [];

  // Başlangıç noktası: Otel varsa otele en yakın duraktan başla, yoksa ilk durak
  let currentLat = hotel?.lat ?? unvisited[0].lat!;
  let currentLon = hotel?.lon ?? unvisited[0].lon!;

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minD = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = haversineDistance(
        currentLat,
        currentLon,
        unvisited[i].lat!,
        unvisited[i].lon!
      );
      if (d < minD) {
        minD = d;
        nearestIdx = i;
      }
    }

    const nextStop = unvisited.splice(nearestIdx, 1)[0];
    route.push(nextStop);
    currentLat = nextStop.lat!;
    currentLon = nextStop.lon!;
  }

  // 2. Adım: 2-Opt İyileştirme (Kesişen yolları düzelt)
  let improved = true;
  let iterations = 0;
  const maxIterations = 50;

  while (improved && iterations < maxIterations) {
    improved = false;
    iterations++;

    for (let i = 0; i < route.length - 1; i++) {
      for (let k = i + 1; k < route.length; k++) {
        const currentDist =
          (i > 0
            ? haversineDistance(route[i - 1].lat!, route[i - 1].lon!, route[i].lat!, route[i].lon!)
            : (hotel ? haversineDistance(hotel.lat, hotel.lon, route[i].lat!, route[i].lon!) : 0)) +
          (k < route.length - 1
            ? haversineDistance(route[k].lat!, route[k].lon!, route[k + 1].lat!, route[k + 1].lon!)
            : 0);

        const newDist =
          (i > 0
            ? haversineDistance(route[i - 1].lat!, route[i - 1].lon!, route[k].lat!, route[k].lon!)
            : (hotel ? haversineDistance(hotel.lat, hotel.lon, route[k].lat!, route[k].lon!) : 0)) +
          (k < route.length - 1
            ? haversineDistance(route[i].lat!, route[i].lon!, route[k + 1].lat!, route[k + 1].lon!)
            : 0);

        if (newDist + 0.001 < currentDist) {
          // 2-opt swap
          const reversed = route.slice(i, k + 1).reverse();
          route.splice(i, k - i + 1, ...reversed);
          improved = true;
        }
      }
    }
  }

  // Yeniden saatleri dinamik ve mantıklı aralıklarla düzenle (09:30, 11:30, 14:00, 16:30, 19:00...)
  const baseTimes = ["09:30", "11:30", "13:30", "15:30", "17:30", "19:30", "21:00"];
  const updatedRoute = route.map((act, idx) => ({
    ...act,
    time: baseTimes[idx] || act.time,
  }));

  // Koordinatı olmayan aktiviteleri sona ekle
  const fullOptimized = [...updatedRoute, ...withoutCoords];
  const optimizedKm = calculateTotalDistance(fullOptimized, hotel || undefined);
  const savedKm = Math.max(0, originalKm - optimizedKm);
  const savedPercent = originalKm > 0 ? Math.round((savedKm / originalKm) * 100) : 0;

  return {
    optimized: fullOptimized,
    originalKm: Math.round(originalKm * 10) / 10,
    optimizedKm: Math.round(optimizedKm * 10) / 10,
    savedKm: Math.round(savedKm * 10) / 10,
    savedPercent,
  };
}

/** Keep flights, check-in, meals and their time slots fixed while shortening free visit blocks. */
export function optimizeDayActivities(activities: PlanActivity[], hotel?: HotelOption | null) {
  if (hotel && !hotelCoordinates(hotel)) hotel = null;
  const originalKm = calculateTotalDistance(activities, hotel ?? undefined);
  let optimized = [...activities];
  const movable = (activity: PlanActivity) => (activity.kind === "gezi" || activity.kind === "serbest")
    && Number.isFinite(activity.lat) && Number.isFinite(activity.lon) && timeMinutes(activity.time) !== null;
  for (let start = 0; start < activities.length; start++) {
    if (!movable(activities[start])) continue;
    let end = start;
    while (end + 1 < activities.length && movable(activities[end + 1])) end++;
    const block = activities.slice(start, end + 1);
    if (block.length > 1) {
      const previous = optimized[start - 1];
      const anchor = previous?.lat !== undefined && previous.lon !== undefined
        ? { ...hotel, lat: previous.lat, lon: previous.lon } as HotelOption : hotel;
      const candidate = optimizeCoordinateBlock(block, anchor).optimized.map((activity, index) => ({ ...activity, time: block[index].time }));
      const fitsSlots = candidate.every((activity, index) => {
        const next = block[index + 1] ?? activities[end + 1];
        const nextTime = next ? timeMinutes(next.time) : null;
        return !activity.durationMin || nextTime === null || timeMinutes(activity.time)! + activity.durationMin <= nextTime;
      });
      if (fitsSlots) optimized.splice(start, block.length, ...candidate);
    }
    start = end;
  }
  let optimizedKm = calculateTotalDistance(optimized, hotel ?? undefined);
  if (optimizedKm > originalKm) { optimized = activities; optimizedKm = originalKm; }
  const savedKm = Math.max(0, originalKm - optimizedKm);
  return {
    optimized, originalKm: Math.round(originalKm * 10) / 10,
    optimizedKm: Math.round(optimizedKm * 10) / 10, savedKm: Math.round(savedKm * 10) / 10,
    savedPercent: originalKm ? Math.round(savedKm / originalKm * 100) : 0,
  };
}

/**
 * Google Haritalar Rota Bağlantısı (Directions URL) Üretici:
 * Google Haritalar Universal URL formatında tüm durakları birbirine bağlar.
 */
interface MapsRouteInput {
  origin?: { lat: number; lon: number; name?: string };
  destination?: { lat: number; lon: number; name?: string };
  waypoints: { lat?: number; lon?: number; title: string }[];
  travelMode?: "walking" | "transit" | "driving";
  cityName: string;
}
type RoutePoint = { lat: number; lon: number; name: string };
const coordinates = (point: { lat: number; lon: number }) => `${point.lat.toFixed(6)},${point.lon.toFixed(6)}`;

export function distinctNavigationStops<T extends { lat?: number; lon?: number }>(stops: T[], origin?: { lat?: number; lon?: number } | null) {
  let previous = hasCoordinates(origin) ? coordinates(origin) : "";
  return stops.filter((stop) => {
    if (!hasCoordinates(stop)) return false;
    const position = coordinates(stop);
    if (position === previous) return false;
    previous = position;
    return true;
  });
}

function routePoints({ origin, destination, waypoints }: MapsRouteInput): RoutePoint[] {
  const points: RoutePoint[] = [];
  const append = (point: { lat?: number; lon?: number }, name: string) => {
    if (!hasCoordinates(point)) return;
    points.push({ ...point, name });
  };
  if (origin) append(origin, origin.name || "Başlangıç");
  waypoints.forEach((stop, index) => append(stop, stop.title || `Durak ${index + 1}`));
  if (destination) append(destination, destination.name || "Varış");
  return distinctNavigationStops(points);
}

function routeUrl(points: RoutePoint[], cityName: string, travelMode: NonNullable<MapsRouteInput["travelMode"]>): string {
  if (points.length < 2) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(points.length ? coordinates(points[0]) : cityName)}`;
  const middle = points.slice(1, -1);
  if (middle.length > 9 || (travelMode === "transit" && middle.length)) throw new Error("Rota bölümler halinde açılmalıdır.");
  const params = new URLSearchParams({
    api: "1",
    origin: coordinates(points[0]),
    destination: coordinates(points[points.length - 1]),
    travelmode: travelMode,
  });
  if (middle.length) params.set("waypoints", middle.map(coordinates).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function buildGoogleMapsRouteUrl(input: MapsRouteInput): string {
  return routeUrl(routePoints(input), input.cityName, input.travelMode || "walking");
}

/** At most 3 intermediate stops on mobile; transit links cover one leg each. */
export function buildGoogleMapsRouteSegments(input: MapsRouteInput) {
  const points = routePoints(input), mode = input.travelMode || "walking";
  const edges = mode === "transit" ? 1 : 4;
  const segments: { url: string; from: string; to: string }[] = [];
  for (let start = 0; start < points.length - 1; start += edges) {
    const part = points.slice(start, start + edges + 1);
    segments.push({ url: routeUrl(part, input.cityName, mode), from: part[0].name, to: part[part.length - 1].name });
  }
  return segments.length ? segments : [{ url: routeUrl(points, input.cityName, mode), from: points[0]?.name || input.cityName, to: points[0]?.name || input.cityName }];
}

/** Apple Maps Yol Tarifi Bağlantısı */
export function buildAppleMapsRouteUrl({
  origin,
  destination,
  travelMode = "w", // w = walking, r = transit, d = drive
}: {
  origin?: { lat: number; lon: number };
  destination?: { lat: number; lon: number };
  travelMode?: "w" | "r" | "d";
}): string {
  if (!hasCoordinates(origin) || !hasCoordinates(destination)) return "https://maps.apple.com/";
  return `https://maps.apple.com/?saddr=${origin.lat},${origin.lon}&daddr=${destination.lat},${destination.lon}&dirflg=${travelMode}`;
}
