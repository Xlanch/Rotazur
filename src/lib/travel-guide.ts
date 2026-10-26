import type { Comfort, FlightOption, HotelOption, PlanResponse, SearchInput } from "./types";
import { fmtCur, fmtMoney, fmtDate, type CurrencyCode } from "./format";
import { hotelTotal } from "./hotel-data";
import { timeMinutes } from "./travel-utils";

export function guideActivityTime(time?: string): string {
  return typeof time === "string" && timeMinutes(time) !== null ? time : "Saat doğrulanmalı";
}

export interface TravelGuideOptions {
  data: PlanResponse; input: SearchInput; budgetTier: Comfort; totalTry: number;
  selectedFlight?: FlightOption; selectedHotel?: HotelOption;
  cur: CurrencyCode; rates: Partial<Record<CurrencyCode, number>>;
  includeFlightHotel: boolean; includeFood: boolean; includeTips: boolean; includeBudget: boolean;
  locale?: string; translate?: (text: string) => string;
}

/** Mirrors the visible guide and keeps selected group prices and unconfirmed times intact. */
export function buildTravelGuideText(options: TravelGuideOptions): string {
  const { data, input, totalTry, budgetTier, cur, rates, includeFlightHotel, includeFood, includeTips, includeBudget } = options;
  const { city } = data;
  const price = (amount: number) => fmtCur(amount, cur, rates, options.locale);
  const flight = options.selectedFlight || data.flights[0];
  const hotel = options.selectedHotel || data.hotels[0];
  const lines = [
    `✈️ ROTAZUR SEYAHAT REHBERİ: ${city.name.toUpperCase()} (${city.country})`,
    `📅 Tarihler: ${input.startDate} — ${input.endDate} (${data.days.length} Gün, ${input.travelers} Kişi)`,
    `💰 Tahmini Toplam Bütçe: ${price(totalTry)} · ${budgetTier.toUpperCase()} Mod`, "",
  ];
  if (includeFlightHotel && flight) lines.push(`🛫 UÇUŞ: ${input.origin} ➔ ${city.iata} (${flight.airline})`, `   Gidiş-Dönüş: ${price(flight.priceTry * input.travelers)}`, "");
  if (includeFlightHotel && hotel) lines.push(`🏨 OTEL: ${hotel.name} (${hotel.stars}★)`,
    `   Konum: ${hotel.neighborhood || "Sağlayıcıda doğrulanmalı"} · ${data.nights} gece · Toplam: ${hotel.bookingQuote ? fmtMoney(hotelTotal(hotel, data.nights), "TRY", undefined, options.locale) : price(hotelTotal(hotel, data.nights))}`,
    ...(hotel.bookingQuote ? [`   Booking arama kaydı: ${hotel.bookingQuote.checkedAt}. Bilinen vergiler dahildir; kesin fiyat ve aynı oda/ödeme koşulları Booking’de doğrulanır.`] : []), "");
  lines.push("📍 GÜNLÜK GEZİ PLANI:");
  for (const day of data.days) {
    lines.push("", `--- GÜN ${day.day} (${fmtDate(day.date, undefined, options.locale)}) ---`);
    for (const item of day.activities) lines.push(`• ${guideActivityTime(item.time)} - ${item.title}${item.costTry > 0 ? ` (${price(item.costTry)})` : ""}`, `  ${item.description}`);
  }
  if (includeFood && data.restaurants?.length) {
    lines.push("", "🍽️ RESTORAN ÖNERİLERİ:");
    for (const restaurant of data.restaurants.slice(0, 6)) lines.push(`• ${restaurant.name} · ${restaurant.neighborhood} · Kişi başı ~${price(restaurant.avgPricePerPersonTry)}`);
  }
  if (includeBudget && data.budget) {
    const budget = data.budget;
    lines.push("", "💰 TAHMİNİ BÜTÇE DAĞILIMI:", `Uçuş: ${price(budget.flight)} · Otel: ${price(budget.hotel)} · Yemek: ${price(budget.food)} · Ulaşım & Etkinlik: ${price(budget.transport + budget.activities)}`);
  }
  if (includeTips) lines.push("", `🚨 Acil Durum Hattı: ${city.emergencyPhone || "Yerel resmi kaynaklardan doğrulayın"} | Vize: ${city.visa}`);
  lines.push("", "Rates By Exchange Rate API: https://www.exchangerate-api.com · Frankfurter: https://frankfurter.dev/", "🔗 Planı Oluşturan: Rotazur (rotazur.com)");
  const text = lines.join("\n");
  return options.translate ? options.translate(text) : text;
}
