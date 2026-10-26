import type { Attraction, City, FlightOption, HotelOption, Interest, PlanActivity, PlanDay, PlanResponse, SearchInput } from "../types";
import { addDays, formatMinutes, haversineKm, timeMinutes } from "../travel-utils";
import { flightDate } from "../flight-utils";
import { hotelCoordinates } from "../hotel-data";

const DAY_TITLES = ["Varış & ilk keşif", "Şehrin kalbi", "Kültür günü", "Saklı köşeler", "Yerel hayat", "Manzara ve lezzet", "Serbest keşif"];

function scoreAttraction(a: Attraction, interests: Interest[], tight: boolean) {
  const match = a.tags.filter((t) => interests.includes(t)).length;
  return 1 + match * 2 - (tight && a.priceEur > 0 ? 1.2 : 0) - (a.priceEur > 25 ? 0.3 : 0);
}

const hhmm = formatMinutes;
const toMin = (value: string) => timeMinutes(value) ?? Number.POSITIVE_INFINITY;

export interface ItineraryArgs {
  city: City;
  start: string;
  nights: number;
  travelers: number;
  interests: Interest[];
  flight: FlightOption | null;
  hotel: HotelOption | null;
  dailyFood: number;
  eur: number;
  tight: boolean;
}

/** Rebuild the same schedule when a browser-side flight/hotel/package selection changes. */
export function buildSelectedItinerary(data: PlanResponse, input: SearchInput, flight: FlightOption | null, hotel: HotelOption | null, dailyFood: number) {
  const fixed = (flight?.priceTry ?? 0) * input.travelers + (hotel?.pricePerNightTry ?? 0) * data.nights
    + (dailyFood + data.dailyTransportTry) * (data.nights + 1) * input.travelers
    + data.airportTransferTry * input.travelers;
  return buildItinerary({
    city: { ...data.city, attractions: data.attractions }, start: input.startDate,
    nights: data.nights, travelers: input.travelers, interests: input.interests,
    flight, hotel, dailyFood, eur: data.rates.EUR, tight: input.budget - fixed < input.budget * 0.08,
  });
}

/** Kural tabanlı plan üretici (Gemini anahtarı yoksa veya hata verirse) */
export function buildItinerary(a: ItineraryArgs): PlanDay[] {
  const { city, travelers, eur } = a;
  const days = a.nights + 1;
  const pool = [...city.attractions].sort(
    (x, y) => scoreAttraction(y, a.interests, a.tight) - scoreAttraction(x, a.interests, a.tight),
  );
  const used = new Set<string>();
  const breakfastIncluded = a.hotel?.amenities.some((m) => m.toLowerCase().includes("kahvaltı")) ?? false;
  const hotelPos: { lat?: number; lon?: number } = hotelCoordinates(a.hotel) || {};

  const takeCluster = (maxHours: number, maxCount: number, freeOnly = false) => {
    const picked: Attraction[] = [];
    const first = pool.find((p) => !used.has(p.id) && p.hours <= maxHours && (!freeOnly || p.priceEur === 0));
    if (!first) return picked;
    picked.push(first);
    used.add(first.id);
    let hours = first.hours;
    while (picked.length < maxCount) {
      const last = picked[picked.length - 1];
      const next = pool
        .filter((p) => !used.has(p.id) && (!freeOnly || p.priceEur === 0) && hours + p.hours <= maxHours)
        .sort((x, y) => haversineKm(last.lat, last.lon, x.lat, x.lon) - haversineKm(last.lat, last.lon, y.lat, y.lon))[0];
      if (!next) break;
      picked.push(next);
      used.add(next.id);
      hours += next.hours;
    }
    return picked;
  };

  const isBudgetFood = a.tight || a.dailyFood <= 22 * eur;

  const meal = (time: string, kind: "kahvalti" | "ogle" | "aksam", near?: Attraction): PlanActivity => {
    const share = kind === "kahvalti" ? 0.2 : kind === "ogle" ? 0.35 : 0.45;
    
    let title = "";
    let desc = "";

    if (kind === "kahvalti") {
      if (breakfastIncluded) {
        title = "Otelde kahvaltı";
        desc = "Otel fiyatına dahil kahvaltı ile güne masrafsız başla.";
      } else if (isBudgetFood) {
        title = "Fırında ekonomik kahvaltı & kahve";
        desc = "Yerel fırından taze kruvasan / börek / simit ve kahve ile bütçe dostu başlangıç.";
      } else {
        title = "Kafede kahvaltı & kahve";
        desc = "Keyifli bir yerel kafede güne başlangıç.";
      }
    } else if (kind === "ogle") {
      if (isBudgetFood) {
        title = "Sokak lezzeti / Hızlı öğle molası";
        desc = `${near ? near.name + " civarında" : "Yakınlarda"} bütçe dostu dilim pizza, döner, falafel veya yerel büfe. 'Ucuz Mekânlar' sekmesine göz atabilirsiniz.`;
      } else {
        title = "Öğle yemeği & yerel tatlar";
        desc = `${near ? near.name + " çevresinde" : "Yakınlarda"} günün menüsünü (fiks menü) sunan uygun bir yerel bistro/lokanta.`;
      }
    } else {
      if (isBudgetFood) {
        title = "Yerel esnaf lokantası / Trattoria";
        desc = "Turistik caddelerden 1-2 sokak içerideki yerel lokantalar hem daha otantik hem %35 daha uygundur.";
      } else {
        title = "Akşam yemeği";
        desc = "Şehrin geleneksel mutfağından öne çıkan lezzetleri tatmak için sevilen bir yerel restoran.";
      }
    }

    return {
      time,
      title,
      description: desc,
      costTry: kind === "kahvalti" && breakfastIncluded ? 0 : Math.round(a.dailyFood * share * travelers),
      lat: near?.lat,
      lon: near?.lon,
      kind: "yemek",
      mealSlot: kind,
    };
  };

  const visit = (p: Attraction, time: string): PlanActivity => ({
    time,
    title: p.name,
    description: p.description + (p.priceEur > 0 ? "" : " Ücretsiz."),
    costTry: Math.round(p.priceEur * eur * travelers),
    lat: p.lat,
    lon: p.lon,
    kind: "gezi",
    durationMin: Math.round(p.hours * 60),
  });

  const result: PlanDay[] = [];
  const arrivalDate = flightDate(a.flight?.outbound.arrival) ?? a.start;
  const carry = new Map<number, PlanActivity[]>();
  const returnMinutes = timeMinutes(a.flight?.inbound?.departure);
  for (let d = 0; d < days; d++) {
    const date = addDays(a.start, d);
    const acts: PlanActivity[] = [...(carry.get(d) ?? [])];
    const isFirst = d === 0;
    const isLast = d === days - 1;

    const isArrival = date === arrivalDate;
    if (date < arrivalDate) {
      acts.push({
        time: a.flight ? (timeMinutes(a.flight.outbound.departure) === null ? "Saat bekleniyor" : hhmm(timeMinutes(a.flight.outbound.departure)!)) : "Saat bekleniyor",
        title: "Yolculuk günü",
        description: "Varış sonraki gün olduğu için bu güne şehir içi aktivite planlanmadı.",
        costTry: 0, kind: "ulasim",
      });
    } else if (isArrival && !isLast) {
      const arr = timeMinutes(a.flight?.outbound.arrival);
      if (arr === null) {
        acts.push({
          time: "Saat bekleniyor", title: `${city.name}'a varış (${city.iata})`,
          description: "Sağlayıcı varış saatini paylaşmadı. İlk günün saatli programını biletiniz doğrulandıktan sonra kesinleştirin.",
          costTry: 0, kind: "ulasim",
        });
        acts.push({
          time: "Saat bekleniyor", title: a.hotel ? `Check-in: ${a.hotel.name}` : "Otele giriş",
          description: "Otele giriş saati doğrulanmış varış saatinize göre ayarlanmalıdır.",
          costTry: 0, lat: hotelPos.lat, lon: hotelPos.lon, kind: "otel",
        });
      } else {
        acts.push({
          time: hhmm(arr), title: `${city.name}'a varış (${city.iata})`,
          description: "Havalimanından şehir merkezine transfer için zaman ayırın.",
          costTry: 0, kind: "ulasim",
        });
        const checkIn: PlanActivity = {
          time: hhmm((arr + 75) % 1440), title: a.hotel ? `Check-in: ${a.hotel.name}` : "Otele giriş",
          description: "Eşyaları bırak, biraz dinlen.", costTry: 0,
          lat: hotelPos.lat, lon: hotelPos.lon, kind: "otel",
        };
        if (arr + 75 < 1440) acts.push(checkIn);
        else carry.set(d + 1, [...(carry.get(d + 1) ?? []), checkIn]);
        if (arr <= 14 * 60) acts.push(meal(hhmm(arr + 90), "ogle"));
        let t = arr <= 14 * 60 ? arr + 160 : arr + 120;
        if (t < 17 * 60) {
          const cluster = takeCluster(Math.max(0, (18 * 60 - t) / 60), 2, true);
          for (const place of cluster) {
            acts.push(visit(place, hhmm(t)));
            t += Math.round(place.hours * 60) + 30;
          }
        }
        const dinnerTime = Math.max(t, 19 * 60);
        if (dinnerTime < 23 * 60) acts.push(meal(hhmm(dinnerTime), "aksam"));
      }
    } else if (isLast) {
      const dep = returnMinutes;
      if (dep !== null) {
        const transferTime = dep - 180;
        if (transferTime > 9 * 60 + 45) acts.push(meal("09:00", "kahvalti"));
        let t = 10 * 60;
        const cluster = takeCluster(Math.max(0, (transferTime - t) / 60), 2, a.tight);
        for (const place of cluster) {
          const finish = t + Math.round(place.hours * 60);
          if (finish > transferTime) break;
          acts.push(visit(place, hhmm(t)));
          t = finish + 30;
        }
        if (transferTime >= 13 * 60 + 30 && t <= transferTime - 60) {
          acts.push(meal(hhmm(Math.max(t, 12 * 60 + 30)), "ogle"));
        }
        if (transferTime >= 0) acts.push({
          time: hhmm(transferTime), title: "Havalimanına transfer",
          description: "Uçuştan en az 2 saat önce havalimanında ol.",
          costTry: 0, kind: "ulasim",
        });
      } else {
        acts.push({
          time: "Saat bekleniyor", title: "Havalimanına transfer",
          description: "Dönüş saati sağlayıcı tarafından doğrulanmadı; transfer saatinizi biletinize göre belirleyin.",
          costTry: 0, kind: "ulasim",
        });
      }
      acts.push({
        time: dep === null ? "Saat bekleniyor" : hhmm(dep), title: "Dönüş uçuşu",
        description: a.flight ? `${a.flight.airline} ile eve dönüş.` : "Bilet saatinizi doğrulayın.",
        costTry: 0, kind: "ulasim",
      });
    } else {
      acts.push(meal("08:45", "kahvalti"));
      const c = takeCluster(7, 4);
      let t = 9 * 60 + 45;
      if (!c.length) {
        acts.push({
          time: hhmm(t),
          title: "Serbest gün: mahalle keşfi",
          description: "Turist rotası dışındaki mahallelerde yürüyüş, yerel pazar ve parklar.",
          costTry: 0,
          kind: "serbest",
        });
        acts.push(meal("13:30", "ogle"));
      } else {
        let hadLunch = false;
        for (const p of c) {
          const duration = Math.round(p.hours * 60);
          if (!hadLunch && (t >= 12 * 60 || t + duration > 13 * 60)) {
            t = Math.max(t, 12 * 60);
            acts.push(meal(hhmm(t), "ogle", p));
            t += 75;
            hadLunch = true;
          }
          if (t + duration > 19 * 60) { used.delete(p.id); continue; }
          acts.push(visit(p, hhmm(t)));
          t += duration + 30;
        }
        if (!hadLunch) {
          t = Math.max(t, 12 * 60 + 30);
          acts.push(meal(hhmm(t), "ogle", c[0]));
          t += 75;
        }
      }
      acts.push(meal(hhmm(Math.max(t + 30, 19 * 60 + 30)), "aksam", c[c.length - 1]));
    }

    if (d === days - 2 && returnMinutes !== null && returnMinutes < 180) {
      const transfer = 1440 + returnMinutes - 180;
      // An overnight transfer takes precedence over any late flexible activity.
      for (let index = acts.length - 1; index >= 0; index--) {
        if (toMin(acts[index].time) >= transfer) acts.splice(index, 1);
      }
      acts.push({ time: hhmm(transfer), title: "Havalimanına transfer",
        description: "Gece yarısından sonraki dönüş uçuşu için önceki akşam yola çıkış.",
        costTry: 0, kind: "ulasim" });
    }
    acts.sort((x, y) => toMin(x.time) - toMin(y.time));
    result.push({
      day: d + 1,
      date,
      title: date < arrivalDate ? "Yolculuk günü" : isArrival ? DAY_TITLES[0] : isLast ? "Son dokunuşlar & dönüş" : DAY_TITLES[d % DAY_TITLES.length] || "Keşif",
      activities: acts,
    });
  }
  return result;
}
