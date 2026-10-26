import { CITIES, getCity, getOrigin, publicCity } from "../cities";
import { getRates } from "../providers/currency";
import { estimateFlightTry, searchFlights } from "../providers/flights";
import { searchHotels } from "../providers/hotels";
import { buildCityBudgetGuide, getCityRestaurants } from "../providers/restaurants";
import { getWeather } from "../providers/weather";
import { addDays, nightsBetween } from "../server-utils";
import type { DiscoverItem, HotelOption, PlanResponse, SearchInput } from "../types";
import { COMFORT, computeBudget, computePlanBudget, roomsFor } from "./budget";
import { enhanceWithGemini } from "./gemini";
import { buildItinerary } from "./itinerary";
import { todayIso } from "../travel-utils";
import { hotelTotal } from "../hotel-data";
import type { BookingSearchContext } from "../booking-context";

const TRANSFER_EUR = 8; // kişi başı havalimanı gidiş-dönüş toplu taşıma

export async function discover(input: SearchInput): Promise<DiscoverItem[]> {
  const rates = await getRates();
  const origin = getOrigin(input.origin);
  const nights = nightsBetween(input.startDate, input.endDate);
  const rooms = roomsFor(input.travelers);
  const cm = COMFORT[input.comfort];

  return CITIES.map((city) => {
    const flight = (estimateFlightTry(city, origin, input.startDate, rates.EUR) + estimateFlightTry(city, origin, input.endDate, rates.EUR)) / 2;
    const paid = city.attractions
      .filter((x) => x.tags.some((t) => input.interests.includes(t)) || input.interests.length === 0)
      .slice(0, Math.min(nights + 1, 4));
    const activitiesTotal = paid.reduce((s, x) => s + x.priceEur, 0) * rates.EUR * input.travelers;
    const dailyFood = Math.round(city.foodEur * cm.food * rates.EUR);

    const hotelMultiplier = input.travelers === 1 ? 0.88 : (rooms * 0.95);
    const estimate = computeBudget({
      flightPerPerson: flight,
      hotelPerNight: Math.round(city.hotelEur * cm.hotel * rates.EUR * hotelMultiplier),
      nights,
      rooms,
      travelers: input.travelers,
      dailyFood,
      dailyTransport: city.transportEur * rates.EUR,
      activitiesTotal,
      budget: input.budget,
      airportTransferPerPerson: TRANSFER_EUR * rates.EUR,
    });
    const tagHits = new Set(city.attractions.flatMap((x) => x.tags).filter((t) => input.interests.includes(t))).size;
    const matchScore = input.interests.length
      ? Math.round(((tagHits + city.tags.filter((t) => input.interests.includes(t)).length) / (input.interests.length * 2)) * 100)
      : 70;
    return { city: publicCity(city), estimate, fits: estimate.remaining >= 0, matchScore: Math.min(100, matchScore) };
  }).sort((a, b) => Number(b.fits) - Number(a.fits) || b.matchScore - a.matchScore || a.estimate.total - b.estimate.total);
}

function pickHotel(hotels: HotelOption[], cap: number, comfort: SearchInput["comfort"]) {
  const sorted = [...hotels].sort((a, b) => a.pricePerNightTry - b.pricePerNightTry);
  const within = sorted.filter((h) => h.pricePerNightTry <= cap);
  if (!within.length) return sorted[0] ?? null;
  if (comfort === "tasarruflu") return within.find((h) => h.rating >= 7) ?? within[0];
  if (comfort === "konforlu") return [...within].sort((a, b) => b.rating + b.stars * 0.4 - (a.rating + a.stars * 0.4))[0];
  // dengeli: puan / fiyat dengesi
  const median = sorted[Math.floor(sorted.length / 2)].pricePerNightTry;
  return [...within]
    .filter((h) => h.pricePerNightTry <= median * 1.15)
    .sort((a, b) => b.rating / Math.sqrt(b.pricePerNightTry) - a.rating / Math.sqrt(a.pricePerNightTry))[0] ?? within[0];
}

export async function buildPlan(input: SearchInput, hotelContext: BookingSearchContext = {}): Promise<PlanResponse> {
  const city = getCity(input.destination ?? "");
  if (!city) throw new Error("Geçersiz şehir");
  const origin = getOrigin(input.origin);
  const nights = nightsBetween(input.startDate, input.endDate);
  const rooms = roomsFor(input.travelers);
  const rates = await getRates();
  const cm = COMFORT[input.comfort];

  const [fl, ht, weather] = await Promise.all([
    searchFlights(city, origin, input.startDate, input.endDate, rates.EUR, input.travelers),
    searchHotels(city, input.startDate, input.endDate, input.travelers, rates.EUR, hotelContext),
    getWeather(city.lat, city.lon, input.startDate, input.endDate),
  ]);

  const dailyTransport = Math.round(city.transportEur * rates.EUR);
  const transfer = TRANSFER_EUR * rates.EUR;
  const flight = fl.flights[0] ?? null;
  const flightCost = (flight?.priceTry ?? 0) * input.travelers;

  const totalDays = nights + 1;
  const mealGuide = buildCityBudgetGuide({
    city, nights, rooms, travelers: input.travelers, eurRate: rates.EUR,
    flights: fl.flights, hotels: ht.hotels, activitiesTotalTry: 0,
  });
  const dailyFood = mealGuide.mealCosts[input.comfort].dailyTotalTry;
  const fixed = dailyFood * totalDays * input.travelers + (dailyTransport * totalDays + transfer) * input.travelers;
  const activityReserve = Math.max(input.budget * 0.08, 0);
  const hotelCap = (input.budget - flightCost - fixed - activityReserve) / nights;
  const hotel = pickHotel(ht.hotels, hotelCap, input.comfort);

  const preRemaining = input.budget - flightCost - fixed - (hotel?.pricePerNightTry ?? 0) * nights;
  const tight = preRemaining < activityReserve;

  let days = buildItinerary({
    city, start: input.startDate, nights, travelers: input.travelers, interests: input.interests,
    flight, hotel, dailyFood, eur: rates.EUR, tight,
  });

  let tips: string[] = [];
  let aiGenerated = false;
  const ai = await enhanceWithGemini({
    city, draft: days, interests: input.interests, travelers: input.travelers,
    activityBudgetTry: Math.max(preRemaining, 0), eur: rates.EUR,
  });
  if (ai) {
    days = ai.days;
    tips = ai.tips;
    aiGenerated = true;
  }

  
  const activitiesTotal = days.flatMap((d) => d.activities).filter((x) => x.kind === "gezi" || x.kind === "serbest").reduce((s, x) => s + x.costTry, 0);
  const budget = computePlanBudget({
    flightPerPerson: flight?.priceTry ?? 0,
    hotelPerNight: hotel?.pricePerNightTry ?? 0,
    hotelTotalTry: hotel?.bookingQuote ? hotelTotal(hotel, nights) : undefined,
    nights, rooms, travelers: input.travelers, dailyFood, dailyTransport,
    days, budget: input.budget, airportTransferPerPerson: transfer,
  });

  // Esnek tarih şeridi (±3 gün, aynı gece sayısı)
  const ratio = flight && flight.source !== "ornek"
    ? flight.priceTry / ((estimateFlightTry(city, origin, input.startDate, rates.EUR) + estimateFlightTry(city, origin, input.endDate, rates.EUR)) / 2)
    : 1;
  const flexDates = [-3, -2, -1, 0, 1, 2, 3].map((o) => {
    const s = addDays(input.startDate, o);
    const e = addDays(input.endDate, o);
    const p = o === 0 && flight
      ? flight.priceTry
      : Math.round(((estimateFlightTry(city, origin, s, rates.EUR) + estimateFlightTry(city, origin, e, rates.EUR)) / 2) * ratio / 10) * 10;
    return { date: s, endDate: e, priceTry: p };
  }).filter((option) => option.date >= todayIso());

  // Kural tabanlı ipuçları
  const ruleTips: string[] = [`🛂 ${city.visa}.`];
  if (budget.remaining < 0) {
    const cheapestDay = [...flexDates].sort((a, b) => a.priceTry - b.priceTry)[0];
    const saving = ((flight?.priceTry ?? 0) - cheapestDay.priceTry) * input.travelers;
    if (saving > 200) ruleTips.push(`📅 ${cheapestDay.date} için bütçe modelinde yaklaşık ${Math.round(saving).toLocaleString("tr-TR")} ₺ fark görünüyor. Bu tarih ayrı sorgulanmalıdır; gerçek fiyat veya tasarruf doğrulanmış değildir.`);
    if (input.comfort !== "tasarruflu") ruleTips.push("💡 Konfor seviyesini 'Tasarruflu' yaparak konaklama ve yemekte ciddi tasarruf sağlayabilirsin.");
    if (nights > 2) ruleTips.push("🌙 Bir gece kısaltmak bütçeyi dengeleyebilir.");
  } else if (budget.remaining > input.budget * 0.2) {
    ruleTips.push("✨ Bütçende pay kaldı — daha iyi bir otel seçebilir ya da günübirlik bir tura katılabilirsin.");
  }
  ruleTips.push("🚇 Çok gezeceksen günlük/haftalık toplu taşıma kartı tek biletten genelde daha ucuz.");
  if (city.attractions.some((x) => x.priceEur > 15)) ruleTips.push("🎟️ Popüler müzelerin biletlerini önceden online al; hem sıra beklemezsin hem bazen indirimli.");

  const sortedHotels = [...ht.hotels].sort((a, b) => a.pricePerNightTry - b.pricePerNightTry);
  const restaurants = getCityRestaurants(city, rates.EUR);
  const budgetGuide = buildCityBudgetGuide({
    city,
    nights,
    rooms,
    travelers: input.travelers,
    eurRate: rates.EUR,
    flights: fl.flights,
    hotels: sortedHotels,
    activitiesTotalTry: activitiesTotal,
  });

  return {
    city: publicCity(city),
    input,
    nights,
    rooms: hotel?.roomCount ?? rooms,
    rates,
    flights: fl.flights,
    hotels: sortedHotels,
    restaurants,
    budgetGuide,
    selectedFlightId: flight?.id ?? null,
    selectedHotelId: hotel?.id ?? null,
    dailyFoodTry: dailyFood,
    dailyTransportTry: dailyTransport,
    airportTransferTry: transfer,
    attractions: city.attractions,
    budget,
    flexDates,
    days,
    tips: [...ruleTips, ...tips],
    aiGenerated,
    weather,
    sources: {
      "Uçuşlar": fl.live ? "canli" : "ornek",
      "Oteller": ht.live ? "canli" : "ornek",
      "Restoranlar": "ornek",
      "Döviz kuru": rates.live ? "canli" : "ornek",
      "Hava durumu": weather ? "canli" : "ornek",
      "Yapay zekâ planı": aiGenerated ? "canli" : "ornek",
    },
  };
}
