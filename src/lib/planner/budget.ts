import type { BudgetBreakdown, Comfort, FlightOption, HotelOption, PlanActivity, PlanDay } from "../types";

export const COMFORT: Record<Comfort, { label: string; food: number; hotel: number; desc: string }> = {
  tasarruflu: { label: "Tasarruflu", food: 0.72, hotel: 0.75, desc: "Ekonomik otel / hostel, sokak lezzetleri" },
  dengeli: { label: "Dengeli", food: 1.0, hotel: 1.0, desc: "3★ otel, yerel restoranlar" },
  konforlu: { label: "Konforlu", food: 1.70, hotel: 1.85, desc: "Daha geniş konaklama ve yemek bütçesi" },
};

export interface BudgetArgs {
  flightPerPerson: number;
  hotelPerNight: number;
  hotelTotalTry?: number;
  nights: number;
  rooms: number;
  travelers: number;
  dailyFood: number; // kişi başı
  dailyTransport: number; // kişi başı
  activitiesTotal: number;
  budget: number;
  airportTransferPerPerson?: number;
  extraFoodTotal?: number;
}

/** Saf fonksiyon: hem sunucuda hem tarayıcıda (uçuş/otel değiştirildiğinde) kullanılır */
export function computeBudget(a: BudgetArgs): BudgetBreakdown {
  const days = a.nights + 1;
  const money = (value: number) => Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  // Hotel providers already return the entire group's nightly price.
  const cents = (value: number) => Math.round(value * 100) / 100;
  const rawFlight = a.flightPerPerson * a.travelers;
  const flight = Number.isFinite(rawFlight) ? cents(Math.max(0, rawFlight)) : 0;
  const hotel = a.hotelTotalTry !== undefined && Number.isFinite(a.hotelTotalTry) && a.hotelTotalTry >= 0
    ? cents(a.hotelTotalTry) : money(a.hotelPerNight * a.nights);
  const food = money(a.dailyFood * days * a.travelers + (a.extraFoodTotal ?? 0));
  const transport = money((a.dailyTransport * days + (a.airportTransferPerPerson ?? 0)) * a.travelers);
  const activities = money(a.activitiesTotal);
  const total = flight + hotel + food + transport + activities;
  return {
    flight,
    hotel,
    food: Math.round(food),
    transport: Math.round(transport),
    activities: Math.round(activities),
    total: cents(total),
    remaining: cents(a.budget - total),
  };
}

export const roomsFor = (travelers: number) => Math.ceil(travelers / 2);

/** A restaurant assigned to a meal replaces the generic meal in that slot. */
export function mergeDayActivities(base: PlanActivity[], extra: PlanActivity[] = []): PlanActivity[] {
  const slots = new Map<NonNullable<PlanActivity["mealSlot"]>, PlanActivity>();
  for (const activity of extra) if (activity.kind === "yemek" && activity.mealSlot) slots.set(activity.mealSlot, activity);
  return [
    ...base.filter((activity) => !(activity.kind === "yemek" && activity.mealSlot && slots.has(activity.mealSlot))),
    ...extra.filter((activity) => !activity.mealSlot || activity.kind !== "yemek" || slots.get(activity.mealSlot) === activity),
  ].sort((a, b) => a.time.localeCompare(b.time));
}

export function computePlanBudget(a: Omit<BudgetArgs, "activitiesTotal" | "extraFoodTotal"> & {
  days: PlanDay[];
  extraActivities?: Record<number, PlanActivity[]>;
}): BudgetBreakdown {
  let activitiesTotal = 0;
  let extraFoodTotal = 0;
  for (const day of a.days) {
    const activities = mergeDayActivities(day.activities, a.extraActivities?.[day.day]);
    activitiesTotal += activities.filter((activity) => activity.kind === "gezi" || activity.kind === "serbest")
      .reduce((total, activity) => total + activity.costTry, 0);
    const meals = activities.filter((activity) => activity.kind === "yemek").reduce((total, activity) => total + activity.costTry, 0);
    extraFoodTotal += Math.max(0, meals - a.dailyFood * a.travelers);
  }
  return computeBudget({ ...a, activitiesTotal, extraFoodTotal });
}

export function selectTierOptions(flights: FlightOption[], hotels: HotelOption[], tier: Comfort) {
  const sortedFlights = [...flights].sort((a, b) => a.priceTry - b.priceTry);
  const sortedHotels = [...hotels].sort((a, b) => a.pricePerNightTry - b.pricePerNightTry);
  const directFlights = sortedFlights.filter((flight) => flight.outbound.stops === 0 && flight.inbound?.stops === 0);
  return {
    flight: tier === "tasarruflu" ? sortedFlights[0]
      : tier === "dengeli" ? sortedFlights[Math.min(1, sortedFlights.length - 1)]
      : directFlights[directFlights.length - 1] ?? sortedFlights[sortedFlights.length - 1],
    hotel: tier === "tasarruflu" ? sortedHotels[0]
      : tier === "dengeli" ? sortedHotels[Math.floor(sortedHotels.length / 2)]
      : sortedHotels[sortedHotels.length - 1],
  };
}
