export type Interest =
  | "tarih"
  | "muze"
  | "doga"
  | "yemek"
  | "alisveris"
  | "gece"
  | "fotograf"
  | "teknoloji";

export type Comfort = "tasarruflu" | "dengeli" | "konforlu";

export interface Attraction {
  sourceUrl?: string;
  id: string;
  name: string;
  description: string;
  lat: number;
  lon: number;
  /** Kişi başı giriş ücreti (EUR). 0 = ücretsiz */
  priceEur: number;
  /** Tahmini süre (saat) */
  hours: number;
  tags: Interest[];
}

export interface City {
  countryCode?: string;
  timeZone?: string;
  bookingQuery?: string;
  flightSyncEnabled?: boolean;
  guideSource?: string;
  bookingSource?: string;
  visaSource?: string;
  guideNote?: string;
  foodArea?: { name: string; lat: number; lon: number; sourceUrl: string };
  id: string;
  name: string;
  country: string;
  flag: string;
  iata: string;
  lat: number;
  lon: number;
  wiki: string;
  tagline: string;
  visa: string;
  visaType: "vizesiz" | "kimlik" | "schengen" | "vize";
  currencyCode?: string;
  emergencyPhone?: string;
  /** Kişi başı günlük yemek (EUR, "dengeli" seviye) */
  foodEur: number;
  /** Kişi başı günlük yerel ulaşım (EUR) */
  transportEur: number;
  /** 2 kişilik oda gecelik ortalama (EUR, "dengeli" seviye) */
  hotelEur: number;
  /** İstanbul çıkışlı gidiş-dönüş kişi başı ortalama (EUR) */
  flightEur: number;
  flightHours: number;
  tags: Interest[];
  attractions: Attraction[];
}

export interface SavedPlan {
  id: string;
  cityId: string;
  cityName: string;
  cityFlag: string;
  country: string;
  startDate: string;
  endDate: string;
  totalCostTry: number;
  budgetTry: number;
  travelers: number;
  savedAt: string;
  url: string;
  snapshot?: SavedPlanSnapshot;
  offlineReadyAt?: string;
}

/** The exact editable plan, independent of live providers and today's date. */
export interface SavedPlanSnapshot {
  version: 2;
  data: PlanResponse;
  budgetTier: Comfort;
  checkedActs: Record<string, boolean>;
  customActs: Record<number, PlanActivity[]>;
  cheapPlaces: CheapPlace[];
  activeDay: number;
}

export interface PriceAlert {
  id: string;
  cityId: string;
  cityName: string;
  targetPriceTry: number;
  currentPriceTry: number;
  email: string;
  createdAt: string;
}

export interface Origin {
  code: string;
  name: string;
  /** Fiyat çarpanı (İstanbul = 1) */
  factor: number;
}

export interface SearchInput {
  origin: string;
  destination?: string; // city id
  startDate: string; // YYYY-MM-DD
  endDate: string;
  travelers: number;
  budget: number; // TRY toplam
  comfort: Comfort;
  interests: Interest[];
}

export interface FlightSegment {
  from: string;
  to: string;
  departure: string; // ISO-ish "YYYY-MM-DD HH:mm"
  arrival: string;
  airline: string;
  flightNumber: string;
}

export interface FlightOption {
  priceKind?: "indicative" | "live";
  checkedAt?: string;
  foundAt?: string;
  expiresAt?: string;
  pricedAdults?: number;
  availabilityVerified?: boolean;
  id: string;
  airline: string;
  logo?: string;
  priceTry: number; // kişi başı gidiş-dönüş
  outbound: {
    departure: string;
    arrival: string;
    durationMin: number;
    stops: number;
    flightNumber?: string;
    from?: string;
    to?: string;
    stopsDetail?: string;
  };
  inbound?: {
    departure: string;
    arrival: string;
    durationMin: number;
    stops: number;
    flightNumber?: string;
    from?: string;
    to?: string;
    stopsDetail?: string;
  };
  source: "serpapi" | "ornek" | "amadeus" | "rapidapi" | "kiwi" | "travelpayouts";
  link?: string;
  baggage?: string;
  cabinClass?: string;
  googleFlightsUrl?: string;
  skyscannerUrl?: string;
  enuygunUrl?: string;
}

export interface HotelOption {
  bookingCatalog?: { hotelId: number; checkedAt: string; checkin: string; checkout: string; adults: number; rooms: number; device: "desktop" | "mobile" | "tablet" };
  id: string;
  name: string;
  stars: number;
  rating: number;
  reviews: number;
  pricePerNightTry: number; // Seçili grup için gece başı toplam tutar
  capacityLabel?: string;   // Örn: "2 Gezgin (1 Çift Kişilik Oda)" veya "4 Gezgin (2 Oda / Aile Odası)"
  roomCount?: number;       // Kaç oda rezerve edilecek (1 veya 2)
  lat: number;
  lon: number;
  distanceKm: number;
  image?: string;
  amenities: string[];
  source: "serpapi" | "booking-serpapi" | "ornek" | "amadeus" | "rapidapi" | "travelpayouts";
  locationSource?: "booking-serpapi" | "google-hotels" | "unverified";
  hotelLocation?: {
    source: "booking-serpapi";
    propertyId: number;
    cityId: string;
    lat: number;
    lon: number;
    address: string;
    checkedAt: string;
    propertyPath: string;
  };
  bookingQuote?: {
    kind?: "snapshot";
    hotelId: number;
    checkin: string;
    checkout: string;
    adults: number;
    rooms: number;
    currency: "TRY";
    displayTotalTry: number;
    displayNightlyTry?: number;
    excludedTaxesTry: number | null;
    knownTotalTry: number;
    checkedAt: string;
    disclaimer?: string;
    device?: "desktop" | "mobile" | "tablet";
    roomOffers?: { name: string; quantity?: number; unitType?: string }[];
    freeCancellation?: boolean;
    freeCancellationUntil?: string;
    noPrepayment?: boolean;
    mealPlan?: string;
    deals?: string[];
  };
  link?: string;
  neighborhood?: string;
  bookingUrl?: string;
  googleHotelsUrl?: string;
  agodaUrl?: string;
  tripUrl?: string;
  hotellookUrl?: string;
  roomType?: string;
  roomTypeTag?: "hostel" | "capsule" | "guesthouse" | "apartment" | "hotel" | "luxury";
}

export interface PlanActivity {
  id?: string;
  time: string;
  title: string;
  description: string;
  costTry: number; // toplam (tüm yolcular)
  lat?: number;
  lon?: number;
  kind: "ulasim" | "gezi" | "yemek" | "otel" | "serbest";
  /** Added meals replace this part of the daily food allowance instead of being counted twice. */
  mealSlot?: "kahvalti" | "ogle" | "aksam" | "atistirma";
  durationMin?: number;
}

export interface PlanDay {
  day: number;
  date: string;
  title: string;
  activities: PlanActivity[];
}

export interface BudgetBreakdown {
  flight: number;
  hotel: number;
  food: number;
  transport: number;
  activities: number;
  total: number;
  remaining: number;
}

export interface WeatherDay {
  date: string;
  max: number;
  min: number;
  code: number;
}

export interface Weather {
  kind: "tahmin" | "gecen-yil";
  source?: "MET Norway";
  days: WeatherDay[];
}

export interface RestaurantOption {
  id: string;
  name: string;
  tier: Comfort; // "tasarruflu" | "dengeli" | "konforlu"
  category: "sokak-lezzeti" | "yerel-lokanta" | "kafe-tatli" | "gurme";
  neighborhood: string;
  cuisine: string;
  signatureDish: string;
  avgPricePerPersonEur: number;
  avgPricePerPersonTry: number;
  rating: number;
  reviews: number;
  lat: number;
  lon: number;
  tip: string;
  googleMapsUrl: string;
  tripadvisorUrl: string;
}

export interface MealCostBreakdown {
  breakfastTry: number;
  breakfastDesc: string;
  lunchTry: number;
  lunchDesc: string;
  dinnerTry: number;
  dinnerDesc: string;
  coffeeSnackTry: number;
  coffeeSnackDesc: string;
  dailyTotalTry: number;
}

export interface BudgetCategoryAdvice {
  category: "ulasim" | "konaklama" | "yemek" | "muze" | "alisveris" | "ipuclari";
  title: string;
  icon: string;
  tasarruflu: string;
  dengeli: string;
  konforlu: string;
  extraTip: string;
}

export interface CityBudgetGuide {
  mealCosts: Record<Comfort, MealCostBreakdown>;
  tierTotalEstimates: Record<Comfort, {
    dailyPerPersonTry: number;
    totalTripTry: number;
    hotelPerNightTry: number;
    foodDailyTry: number;
    transportDailyTry: number;
    summary: string;
  }>;
  categoryAdvice: BudgetCategoryAdvice[];
  localDishesToTry: { name: string; desc: string; avgEur: number; avgTry: number }[];
  touristTrapsToAvoid: string[];
}

export interface PlanResponse {
  city: Omit<City, "attractions">;
  input: SearchInput;
  nights: number;
  rooms: number;
  rates: { EUR: number; USD: number; live: boolean };
  flights: FlightOption[];
  hotels: HotelOption[];
  restaurants: RestaurantOption[];
  budgetGuide: CityBudgetGuide;
  selectedFlightId: string | null;
  selectedHotelId: string | null;
  dailyFoodTry: number; // kişi başı
  dailyTransportTry: number; // kişi başı
  airportTransferTry: number; // kişi başı, gidiş-dönüş
  attractions: Attraction[];
  budget: BudgetBreakdown;
  flexDates: { date: string; endDate: string; priceTry: number }[];
  days: PlanDay[];
  tips: string[];
  aiGenerated: boolean;
  weather: Weather | null;
  sources: Record<string, "canli" | "ornek">;
}

export interface DiscoverItem {
  city: Omit<City, "attractions">;
  estimate: BudgetBreakdown;
  fits: boolean;
  matchScore: number;
}

export interface CheapPlace {
  id: string;
  name: string;
  category: "yemek" | "kafe" | "pazar" | "alisveris";
  lat: number;
  lon: number;
  detail?: string;
  rating?: number;
}
