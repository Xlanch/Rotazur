"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BellRing,
  Bookmark,
  Building2,
  Calendar,
  Check,
  CheckSquare,
  ChevronRight,
  Clock,
  Compass,
  DollarSign,
  ExternalLink,
  Info,
  Luggage,
  MapPin,
  Maximize2,
  Palmtree,
  Phone,
  Plane,
  Plus,
  Printer,
  RefreshCw,
  Share2,
  SlidersHorizontal,
  Sparkles,
  Square,
  Star,
  Tag,
  WifiOff,
  Ticket,
  Users,
  Utensils,
  Zap,
  Scale,
  Volume2,
  Camera,
  Navigation,
  CloudRain,
  Bell,
  FileText,
} from "lucide-react";
import { SearchForm } from "./SearchForm";
import { CityImage, useCityImages } from "./CityImage";
import { BudgetDonut, BUDGET_PARTS } from "./BudgetDonut";
import { PriceAlertModal } from "./PriceAlertModal";
import { PackingListModal } from "./PackingListModal";
import { ExpenseSplitterModal } from "./ExpenseSplitterModal";
import { SharePlanModal } from "./SharePlanModal";
import { TravelGuidePdfModal } from "./TravelGuidePdfModal";
import { OfflinePlanModal } from "./OfflinePlanModal";
import { CityCompareModal } from "./CityCompareModal";
import { CityAssistantWidget } from "./CityAssistantWidget";
import { SmartTravelTools } from "./SmartTravelTools";
import { CityDiscoveryHub } from "./CityDiscoveryHub";
import { SpontaneousAndDayTrips } from "./SpontaneousAndDayTrips";
import { LiveTravelWallet } from "./LiveTravelWallet";
import { GoogleMapsRouteModal } from "./GoogleMapsRouteModal";
import { StoryCardModal } from "./StoryCardModal";
import { PriceAlertsManagerModal } from "./PriceAlertsManagerModal";
import { CityWeatherWidget } from "./CityWeatherWidget";
import { VisaRequirementsCard } from "./VisaRequirementsCard";
import { optimizeDayActivities } from "@/lib/route-optimizer";
import { getConnectivityInfo, getPhotoSpots, type NearbyDayTrip, type PhotoSpot, type SpontaneousIdea } from "@/lib/providers/city-discovery";
import { useSavedPlans } from "@/lib/storage";
import { markPlanOfflineReady } from "@/lib/saved-plans";
import { prepareOfflineAccess } from "@/lib/offline";
import { tripScope } from "@/lib/trip-expenses";
import type { MapMarker } from "./MapView";
import { computePlanBudget, mergeDayActivities, selectTierOptions } from "@/lib/planner/budget";
import { buildSelectedItinerary } from "@/lib/planner/itinerary";
import { activityCheckKey, identifyDays, restoreActivityState, partitionOptimizedActivities } from "@/lib/activity-state";
import { CurrencyCode, fmtCur, fmtMoney, fmtDate, fmtDuration, tl, weatherIcon, timeOf } from "@/lib/format";
import { applyHotelCoordinates, hotelCoordinates, hotelTotal, hotelNightlyTotal, hotelQuoteIsFresh } from "@/lib/hotel-data";
import { hotelMapMarkers, hotelMarkerId } from "@/lib/hotel-map";
import { coordinateMapUrl, hasMapCoordinates } from "@/lib/map-data";
import { useCurrency } from "./CurrencyContext";
import { useLanguage } from "./LanguageContext";
import { toQuery } from "@/lib/search";
import type { CheapPlace, Comfort, FlightOption, HotelOption, PlanActivity, PlanResponse, RestaurantOption, SearchInput, SavedPlan } from "@/lib/types";

// SSR devre dışı bırakılmış Leaflet haritası
const MapView = dynamic(() => import("./MapView"), {
  ssr: false,
  loading: () => <Localize><div className="skeleton h-full w-full rounded-2xl" /></Localize>,
});

type Tab = "rota" | "ucuslar" | "oteller" | "mekanlar" | "butce" | "araclar" | "kesif";

export function PlanView({ input, initialPlan }: { input: SearchInput; initialPlan?: SavedPlan }) {
  const { tl, fmtDate, fmtCur, weatherIcon, timeOf, fmtDuration, fmtMoney, locale } = useLocaleFormat();
  const { t, translate } = useLanguage();
  const [data, setData] = useState<PlanResponse | null>(null);
  const lastSelection = useRef("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quoteClock, setQuoteClock] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setQuoteClock(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const [activeTab, setActiveTab] = useState<Tab>("rota");
  const [activeDay, setActiveDay] = useState<number>(1);
  const [editOpen, setEditOpen] = useState(false);
  const [mapFocus, setMapFocus] = useState<[number, number] | null>(null);
  const { currency: cur, setCurrency: setCur } = useCurrency();

  // 3 Çeşit Bütçe Seviyesi (Tasarruflu / Dengeli / Konforlu) ve Restoran Filtresi
  const [budgetTier, setBudgetTier] = useState<Comfort>(input.comfort);
  const [restTierFilter, setRestTierFilter] = useState<"all" | Comfort>("all");
  const [customDailyFoodTry, setCustomDailyFoodTry] = useState<number | null>(null);
  const [addedRestToast, setAddedRestToast] = useState<string | null>(null);

  // Seçili uçuş & otel (kullanıcı değiştirebilir ve bütçe canlı güncellenir)
  const [selectedFlight, setSelectedFlight] = useState<FlightOption | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<HotelOption | null>(null);

  // Otel filtreleme & sıralama
  const [hotelFilter, setHotelFilter] = useState<"all" | "hostel" | "guesthouse" | "hotel" | "luxury">("all");
  const [hotelSort, setHotelSort] = useState<"price" | "rating" | "dist">("price");

  // Ucuz mekânlar verisi
  const [cheapPlaces, setCheapPlaces] = useState<CheapPlace[]>([]);
  const [cheapFilter, setCheapFilter] = useState<string>("all");
  const [cheapLoading, setCheapLoading] = useState(false);

  const [copied, setCopied] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [packingOpen, setPackingOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);
  const [mapsModalOpen, setMapsModalOpen] = useState(false);
  const [storyModalOpen, setStoryModalOpen] = useState(false);
  const [alertsManagerOpen, setAlertsManagerOpen] = useState(false);
  const [optimizedToast, setOptimizedToast] = useState<string | null>(null);
  const [savedToast, setSavedToast] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const savedId = useRef(initialPlan?.id);
  const [checkedActs, setCheckedActs] = useState<Record<string, boolean>>({});
  const [customActs, setCustomActs] = useState<Record<number, PlanActivity[]>>({});
  const [showAddAct, setShowAddAct] = useState(false);
  const [newActTitle, setNewActTitle] = useState("");
  const [newActTime, setNewActTime] = useState("16:00");
  const [newActDesc, setNewActDesc] = useState("");
  const [newActError, setNewActError] = useState<string | null>(null);

  // Durakları En Az Yürüme Mesafesi İçin Akıllı Sıralama (TSP 2-Opt)
  const handleOptimizeDayRoute = (dayNum: number) => {
    if (!data) return;
    const currentDay = data.days.find((d) => d.day === dayNum);
    if (!currentDay) return;

    const baseActs = currentDay.activities;
    const custom = customActs[dayNum] || [];
    const allActs = mergeDayActivities(baseActs, custom);

    const result = optimizeDayActivities(allActs, selectedHotel);
    const partition = partitionOptimizedActivities(result.optimized, custom);

    // Kişisel eklemeleri ayrı tut; sonraki otel/uçuş seçimi bu kayıtları silmemeli.
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        days: prev.days.map((d) =>
          d.day === dayNum ? { ...d, activities: partition.base } : d
        ),
      };
    });
    setCustomActs((prev) => ({
      ...prev,
      [dayNum]: partition.custom,
    }));

    if (result.savedKm > 0) {
      setOptimizedToast(
        `⚡ Rota optimize edildi! ~${result.savedKm} km gereksiz yürüme mesafesi engellendi (%${result.savedPercent} kazanç).`
      );
    } else {
      setOptimizedToast(`⚡ Bu duraklar için daha kısa bir sıralama bulunamadı.`);
    }
    setTimeout(() => setOptimizedToast(null), 4500);
  };

  const { save: savePlan, isSaved, plans } = useSavedPlans();
  const imgs = useCityImages();

  const query = toQuery(input);

  // Sayfa açıldığında ve yükleme bittiğinde ekranı en üste al
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, []);

  useEffect(() => {
    if (!loading && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [loading]);

  // Plan verisini yükle
  useEffect(() => {
    if (initialPlan?.snapshot) {
      const snapshot = initialPlan.snapshot, res = snapshot.data;
      const restored = restoreActivityState(res.days, snapshot.customActs, snapshot.checkedActs);
      const fl = res.flights.find((f) => f.id === res.selectedFlightId) ?? null;
      const ht = res.hotels.find((h) => h.id === res.selectedHotelId) ?? null;
      lastSelection.current = [query, fl?.id ?? "", ht?.id ?? "", res.dailyFoodTry].join("|");
      savedId.current = initialPlan.id;
      setData({ ...res, days: applyHotelCoordinates(restored.days, ht) });
      setBudgetTier(snapshot.budgetTier);
      setCustomDailyFoodTry(res.dailyFoodTry);
      setCustomActs(restored.custom);
      setCheckedActs(restored.checked);
      setActiveDay(res.days.some((d) => d.day === snapshot.activeDay) ? snapshot.activeDay : 1);
      setSelectedFlight(fl);
      setSelectedHotel(ht);
      setCheapPlaces(snapshot.cheapPlaces);
      setError(null);
      setLoading(false);
      return;
    }
    savedId.current = undefined;
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/plan?${query}`, { signal: controller.signal })
      .then(async (r) => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}));
          throw new Error(err.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((res: PlanResponse) => {
        if (!active) return;
        setData({ ...res, days: identifyDays(res.days) });
        setBudgetTier(input.comfort);
        setCustomDailyFoodTry(res.dailyFoodTry);
        const fl = res.flights.find((f) => f.id === res.selectedFlightId) || res.flights[0] || null;
        const ht = res.hotels.find((h) => h.id === res.selectedHotelId) || res.hotels[0] || null;
        lastSelection.current = [query, fl?.id ?? "", ht?.id ?? "", res.dailyFoodTry].join("|");
        setCustomActs({});
        setCheckedActs({});
        setActiveDay(1);
        setSelectedFlight(fl);
        setSelectedHotel(ht);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message || "Plan yüklenirken bir hata oluştu");
        setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [query, input.comfort, initialPlan]);

  // Şehir ucuz mekânlarını çek
  useEffect(() => {
    if (initialPlan?.snapshot) return;
    if (!input.destination) return;
    const controller = new AbortController();
    setCheapPlaces([]);
    setMapFocus(null);
    setCheapLoading(true);
    fetch(`/api/places?city=${encodeURIComponent(input.destination)}`, { signal: controller.signal })
      .then((r) => { if (!r.ok) throw new Error("Mekanlar yüklenemedi."); return r.json(); })
      .then((d) => {
        if (controller.signal.aborted) return;
        setCheapPlaces(d.places || []);
        setCheapLoading(false);
      })
      .catch(() => { if (!controller.signal.aborted) setCheapLoading(false); });
    return () => controller.abort();
  }, [input.destination, initialPlan]);

  // 3 Çeşit Bütçe Paketini Tek Tıkla Uygulama (Otel + Uçuş + Günlük Yemek + Filtre)
  const applyBudgetTierPackage = (tier: Comfort) => {
    setBudgetTier(tier);
    if (!data) return;

    // Öğün bütçesini seçilen seviyeye güncelle
    const tierMealDaily = data.budgetGuide?.mealCosts?.[tier]?.dailyTotalTry;
    if (tierMealDaily) {
      setCustomDailyFoodTry(tierMealDaily);
    }

    const options = selectTierOptions(data.flights, data.hotels, tier);
    setSelectedHotel(options.hotel ?? null);
    setSelectedFlight(options.flight ?? null);
  };

  // Restoranı Aktif Günün Rotasına Ekleme
  const handleAddRestaurantToDay = (r: RestaurantOption) => {
    const defaultTime =
      r.category === "kafe-tatli" ? "16:30" : r.category === "gurme" ? "19:30" : "13:30";
    const newAct: PlanActivity = {
      id: crypto.randomUUID(),
      time: defaultTime,
      title: `🍽️ ${r.name} (${r.cuisine})`,
      description: `Önerilen Spesiyal: ${r.signatureDish} · ${r.tip} (${r.neighborhood})`,
      costTry: r.avgPricePerPersonTry * input.travelers,
      lat: r.lat,
      lon: r.lon,
      kind: "yemek",
      mealSlot: r.category === "kafe-tatli" ? "atistirma" : r.category === "gurme" ? "aksam" : "ogle",
    };
    setCustomActs((prev) => ({
      ...prev,
      [activeDay]: [...(prev[activeDay] || []), newAct],
    }));
    setAddedRestToast(`${r.name} → Gün ${activeDay} rotasına eklendi!`);
    setTimeout(() => setAddedRestToast(null), 3000);
  };

  // Fotoğraf Noktasını Aktif Günün Rotasına Ekleme
  const handleAddPhotoSpotToDay = (spot: PhotoSpot) => {
    if (!data) return;
    const defaultTime = spot.bestTime.includes("Sabah")
      ? "08:30"
      : spot.bestTime.includes("Altın")
      ? "18:00"
      : spot.bestTime.includes("Gece")
      ? "20:30"
      : "14:00";
    const newAct: PlanActivity = {
      id: crypto.randomUUID(),
      time: defaultTime,
      title: `📸 ${spot.name} (${spot.vibe})`,
      description: `${spot.bestTime} · Kadraj Tüyosu: ${spot.angleTip}`,
      costTry: Math.round(spot.costEur * data.rates.EUR * input.travelers),
      lat: spot.lat,
      lon: spot.lon,
      kind: "gezi",
    };
    setCustomActs((prev) => ({
      ...prev,
      [activeDay]: [...(prev[activeDay] || []), newAct],
    }));
    setAddedRestToast(`📸 ${spot.name} → Gün ${activeDay} rotasına eklendi!`);
    setTimeout(() => setAddedRestToast(null), 3000);
  };

  // Boş Vakit Önerisini Aktif Günün Rotasına Ekleme
  const handleAddIdeaToDay = (idea: SpontaneousIdea) => {
    if (!data) return;
    const newAct: PlanActivity = {
      id: crypto.randomUUID(),
      time: "15:30",
      title: `🧭 ${idea.title}`,
      description: `${idea.neighborhood} (${idea.duration}) · ${idea.description}`,
      costTry: Math.round(idea.costEur * data.rates.EUR * input.travelers),
      lat: idea.lat,
      lon: idea.lon,
      kind: idea.mood === "sokak-lezzeti" || idea.mood === "kahve" ? "yemek" : "gezi",
      mealSlot: idea.mood === "kahve" ? "atistirma" : idea.mood === "sokak-lezzeti" ? "ogle" : undefined,
    };
    setCustomActs((prev) => ({
      ...prev,
      [activeDay]: [...(prev[activeDay] || []), newAct],
    }));
    setAddedRestToast(`🧭 ${idea.title} → Gün ${activeDay} rotasına eklendi!`);
    setTimeout(() => setAddedRestToast(null), 3000);
  };

  // Günübirlik Yakın Şehir Rotasını Aktif Güne Ekleme
  const handleAddDayTripToDay = (trip: NearbyDayTrip) => {
    if (!data) return;
    const newAct: PlanActivity = {
      id: crypto.randomUUID(),
      time: "09:00",
      title: `🚆 Günübirlik Gezi: ${trip.destination}`,
      description: `${trip.transportType} (${trip.durationOneWay}) · ${trip.highlights} · İpucu: ${trip.proTip}`,
      costTry: Math.round(trip.roundTripEur * data.rates.EUR * input.travelers),
      kind: "gezi",
    };
    setCustomActs((prev) => ({
      ...prev,
      [activeDay]: [...(prev[activeDay] || []), newAct],
    }));
    setAddedRestToast(`🚆 ${trip.destination} günübirlik rotası → Gün ${activeDay}'e eklendi!`);
    setTimeout(() => setAddedRestToast(null), 3000);
  };

  const handleFocusMap = (coords: [number, number]) => {
    setMapFocus(coords);
    if (typeof window !== "undefined") {
      const mapEl = document.getElementById("live-map-card");
      if (mapEl && window.innerWidth < 1024) {
        mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const activeDailyFoodTry = customDailyFoodTry ?? data?.dailyFoodTry ?? 0;

  // Dinamik Bütçe Hesaplama (uçuş, otel veya bütçe seviyesi değiştiğinde otomatik güncellenir)
  const currentBudget = useMemo(() => {
    if (!data) return null;
    return computePlanBudget({
      flightPerPerson: selectedFlight?.priceTry ?? 0,
      hotelPerNight: selectedHotel?.pricePerNightTry ?? 0,
      hotelTotalTry: selectedHotel?.bookingQuote ? hotelTotal(selectedHotel, data.nights) : undefined,
      nights: data.nights, rooms: selectedHotel?.roomCount ?? data.rooms,
      travelers: input.travelers, dailyFood: activeDailyFoodTry,
      dailyTransport: data.dailyTransportTry, airportTransferPerPerson: data.airportTransferTry,
      days: data.days, extraActivities: customActs, budget: input.budget,
    });
  }, [data, selectedFlight, selectedHotel, input.travelers, input.budget, activeDailyFoodTry, customActs]);

  useEffect(() => {
    if (!data || loading) return;
    const signature = [query, selectedFlight?.id ?? "", selectedHotel?.id ?? "", activeDailyFoodTry].join("|");
    if (lastSelection.current === signature) return;
    lastSelection.current = signature;
    setData((previous) => previous ? {
      ...previous,
      days: identifyDays(buildSelectedItinerary(previous, input, selectedFlight, selectedHotel, activeDailyFoodTry)),
      rooms: selectedHotel?.roomCount ?? previous.rooms,
      aiGenerated: false,
    } : previous);
  }, [query, loading, data?.city.id, selectedFlight, selectedHotel, activeDailyFoodTry, input]);

  const packageEstimates = useMemo(() => {
    if (!data) return null;
    const result = {} as Record<Comfort, number>;
    for (const tier of ["tasarruflu", "dengeli", "konforlu"] as Comfort[]) {
      if (tier === budgetTier && currentBudget) { result[tier] = currentBudget.total; continue; }
      const options = selectTierOptions(data.flights, data.hotels, tier);
      const food = data.budgetGuide.mealCosts[tier].dailyTotalTry;
      result[tier] = computePlanBudget({
        flightPerPerson: options.flight?.priceTry ?? 0, hotelPerNight: options.hotel?.pricePerNightTry ?? 0,
        hotelTotalTry: options.hotel?.bookingQuote ? hotelTotal(options.hotel, data.nights) : undefined,
        nights: data.nights, rooms: options.hotel?.roomCount ?? data.rooms, travelers: input.travelers,
        dailyFood: food, dailyTransport: data.dailyTransportTry, airportTransferPerPerson: data.airportTransferTry,
        days: buildSelectedItinerary(data, input, options.flight ?? null, options.hotel ?? null, food),
        extraActivities: customActs, budget: input.budget,
      }).total;
    }
    return result;
  }, [data, input, budgetTier, currentBudget, customActs]);

  // Harita İşaretçileri (Seçili gün aktiviteleri + Otel + Restoranlar + Ucuz Mekânlar)
  const { markers, routeCoords } = useMemo(() => {
    if (!data) return { markers: [], routeCoords: [] };
    const list: MapMarker[] = [];
    const coords: [number, number][] = [];

    // Otel işareti
    list.push(...hotelMapMarkers(activeTab === "oteller" ? data.hotels : selectedHotel ? [selectedHotel] : [], selectedHotel?.id));

    // Seçili gün aktiviteleri (kullanıcı eklemeleri dahil)
    const curDay = data.days.find((d) => d.day === activeDay);
    if (curDay && activeTab !== "oteller") {
      const allDayActs = mergeDayActivities(curDay.activities, customActs[activeDay]);
      allDayActs.forEach((act, idx) => {
        const point = act.kind === "otel" ? hotelCoordinates(selectedHotel) : hasMapCoordinates(act) ? act : null;
        if (point) {
          coords.push([point.lat!, point.lon!]);
          if (act.kind === "otel") return; // The selected hotel already has one H marker.
          list.push({
            id: `act-${idx}`,
            lat: point.lat!,
            lon: point.lon!,
            title: act.title,
            subtitle: `${act.time} · ${act.costTry > 0 ? tl(act.costTry) : "Ücretsiz"}`,
            color: act.kind === "yemek" ? "#f97316" : "#7c4dff",
            label: String(idx + 1),
          });
        }
      });
    }

    // "Keşif" sekmesindeyse fotoğraf noktalarını haritada göster
    if (activeTab === "kesif") {
      const spots = getPhotoSpots(data.city);
      spots.forEach((sp) => {
        list.push({
          id: sp.id,
          lat: sp.lat,
          lon: sp.lon,
          title: `📸 ${sp.name}`,
          subtitle: `${sp.bestTime} · ${sp.vibe}`,
          color: "#f59e0b",
          label: "P",
        });
      });
    }

    // "Mekanlar" sekmesindeyse restoranları ve ucuz mekânları göster
    if (activeTab === "mekanlar") {
      const rests = (data.restaurants || []).filter(
        (r) => restTierFilter === "all" || r.tier === restTierFilter
      );
      rests.forEach((r) => {
        list.push({
          id: r.id,
          lat: r.lat,
          lon: r.lon,
          title: `🍽️ ${r.name}`,
          subtitle: `${r.cuisine} · Kişi başı ${tl(r.avgPricePerPersonTry)}`,
          color: r.tier === "tasarruflu" ? "#10b981" : r.tier === "dengeli" ? "#0ea5e9" : "#a855f7",
          label: "R",
        });
      });

      const filtered = cheapPlaces.filter((p) => cheapFilter === "all" || p.category === cheapFilter);
      filtered.slice(0, 25).forEach((p) => {
        list.push({
          id: p.id,
          lat: p.lat,
          lon: p.lon,
          title: p.name,
          subtitle: p.detail || p.category,
          color: "#10b981",
          small: true,
        });
      });
    }

    return { markers: list, routeCoords: coords };
  }, [data, activeDay, selectedHotel, activeTab, cheapPlaces, cheapFilter, restTierFilter, customActs]);

  // Filtrelenmiş ve sıralanmış otel listesi
  const filteredHotels = useMemo(() => {
    if (!data?.hotels) return [];
    let list = [...data.hotels];
    if (hotelFilter === "hostel") {
      list = list.filter((h) => h.roomTypeTag === "hostel" || h.roomTypeTag === "capsule" || h.stars <= 2);
    } else if (hotelFilter === "guesthouse") {
      list = list.filter((h) => h.roomTypeTag === "guesthouse" || h.roomTypeTag === "apartment");
    } else if (hotelFilter === "hotel") {
      list = list.filter((h) => h.roomTypeTag === "hotel" || (h.stars === 3 && h.roomTypeTag !== "apartment"));
    } else if (hotelFilter === "luxury") {
      list = list.filter((h) => h.roomTypeTag === "luxury" || h.stars >= 4);
    }
    if (hotelSort === "price") {
      list.sort((a, b) => a.pricePerNightTry - b.pricePerNightTry);
    } else if (hotelSort === "rating") {
      list.sort((a, b) => b.rating - a.rating);
    } else if (hotelSort === "dist") {
      list.sort((a, b) => a.distanceKm - b.distanceKm);
    }
    return list;
  }, [data?.hotels, hotelFilter, hotelSort]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(`${window.location.origin}/plan?${toQuery(input)}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") window.print();
  };

  const storeCurrentPlan = () => {
    if (!data || !currentBudget) throw new Error("Plan henüz hazır değil.");
    const saved = savePlan({
      version: 2,
      data: { ...data, input, selectedFlightId: selectedFlight?.id ?? null,
        selectedHotelId: selectedHotel?.id ?? null, dailyFoodTry: activeDailyFoodTry,
        rooms: selectedHotel?.roomCount ?? data.rooms, budget: currentBudget },
      budgetTier, checkedActs, customActs, cheapPlaces, activeDay,
    }, savedId.current);
    savedId.current = saved.id;
    setSaveError(null);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
    return saved;
  };

  const handleSave = () => {
    try { storeCurrentPlan(); }
    catch (err) { setSaveError(err instanceof Error ? err.message : "Plan kaydedilemedi."); }
  };

  const handleSaveOffline = async () => {
    const saved = storeCurrentPlan();
    await import("./MapView");
    await prepareOfflineAccess();
    const ready = markPlanOfflineReady(saved.id);
    if (!ready) throw new Error("Plan hazırlık sırasında silindi. Tekrar kaydedin.");
    return ready;
  };

  const toggleAct = (actKey: string) => {
    setCheckedActs((prev) => ({ ...prev, [actKey]: !prev[actKey] }));
  };

  const handleAddCustomAct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActTitle.trim()) return;
    const newAct: PlanActivity = {
      id: crypto.randomUUID(),
      time: newActTime || "16:00",
      title: newActTitle.trim(),
      description: newActDesc.trim() || "Kişisel planlanan aktivite / not",
      costTry: 0,
      kind: "serbest",
    };
    setCustomActs((prev) => ({
      ...prev,
      [activeDay]: [...(prev[activeDay] || []), newAct],
    }));
    setNewActTitle("");
    setNewActDesc("");
    setShowAddAct(false);
  };

  if (loading) {
    return (
      <Localize><main className="mx-auto flex min-h-[85vh] max-w-7xl flex-col items-center justify-center px-4 pt-20 pb-12 text-center sm:px-6">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="mb-6 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-500 to-aqua-500 text-white shadow-xl shadow-brand-500/30"
        >
          <Sparkles className="h-8 w-8" />
        </motion.div>
        <h2 className="text-2xl font-bold">Rotan Hazırlanıyor...</h2>
        <p className="mt-2 max-w-md text-sm text-black/55 dark:text-white/55">
          Uçuş fiyatları araştırılıyor, oteller karşılaştırılıyor ve bütçene uygun gün gün plan oluşturuluyor.
        </p>
        <div className="mt-8 grid w-full max-w-md gap-3">
          <div className="skeleton h-12 w-full" />
          <div className="skeleton h-32 w-full" />
          <div className="skeleton h-24 w-full" />
        </div>
      </main></Localize>
    );
  }

  if (error || !data) {
    return (
      <Localize><main className="mx-auto flex min-h-[85vh] max-w-4xl flex-col items-center justify-center px-4 pt-20 pb-12 text-center">
        <div className="glass w-full rounded-3xl p-8">
          <h2 className="text-2xl font-bold text-rose-500">Plan Oluşturulamadı</h2>
          <p className="mt-3 text-black/60 dark:text-white/60">{error || "Bilinmeyen bir hata oluştu"}</p>
          <Link href="/" className="btn-primary mt-6">
            <ArrowLeft className="h-4 w-4" /> Ana Sayfaya Dön
          </Link>
        </div>
      </main></Localize>
    );
  }

  const { city, nights, rates, weather, tips, sources, flexDates } = data;
  const connectivity = getConnectivityInfo(city);
  const budget = currentBudget || data.budget;
  const displayData: PlanResponse = { ...data, budget, days: data.days.map((day) => ({ ...day, activities: mergeDayActivities(day.activities, customActs[day.day]) })) };

  return (
    <Localize><main className="mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6">
      {/* Banner & Başlık */}
      <div className="relative overflow-hidden rounded-[32px] p-6 text-white sm:p-10">
        <CityImage
          src={imgs[city.id]}
          alt={city.name}
          className="absolute inset-0 -z-10 brightness-[0.45] transition duration-1000"
        />
        <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Link href="/" className="inline-flex items-center gap-1 font-semibold opacity-85 hover:underline">
                <ArrowLeft className="h-4 w-4" /> Rotalar
              </Link>
              <span>·</span>
              <span className="rounded-full bg-white/20 px-3 py-0.5 backdrop-blur">{city.flag} {city.country}</span>
              <span className="rounded-full bg-emerald-500/80 px-3 py-0.5 font-medium backdrop-blur">
                {city.visa.split(" (")[0]}
              </span>
              {data.aiGenerated && (
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/80 px-3 py-0.5 text-xs font-semibold backdrop-blur">
                  <Sparkles className="h-3 w-3" /> AI Zenginleştirildi
                </span>
              )}
            </div>

            <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-6xl">{city.name}</h1>
            <p className="mt-2 max-w-xl text-base opacity-90 sm:text-lg">{city.tagline}</p>

            <div className="mt-5 flex flex-wrap items-center gap-3 text-xs sm:text-sm">
              <span className="rounded-xl bg-black/40 px-3 py-1.5 backdrop-blur">
                🗓️ {fmtDate(input.startDate)} – {fmtDate(input.endDate)} ({nights} gece)
              </span>
              <span className="rounded-xl bg-black/40 px-3 py-1.5 backdrop-blur">
                👥 {input.travelers} Kişi ({data.rooms} Oda)
              </span>
              <span className="rounded-xl bg-black/40 px-3 py-1.5 backdrop-blur">
                💰 Bütçe: {fmtCur(input.budget, cur, rates)}
              </span>
              <span className="rounded-xl bg-black/40 px-3 py-1.5 backdrop-blur">
                💶 1 EUR = {rates.EUR.toFixed(2)} ₺ {rates.live && "(Canlı)"}
              </span>

              {/* Çoklu Para Birimi Seçici */}
              <div className="flex items-center gap-1 rounded-xl bg-black/50 p-1 backdrop-blur ring-1 ring-white/10">
                <button
                  type="button"
                  onClick={() => setCur("TRY")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    cur === "TRY"
                      ? "bg-white text-black shadow-md"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  ₺ TRY
                </button>
                <button
                  type="button"
                  onClick={() => setCur("EUR")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    cur === "EUR"
                      ? "bg-white text-black shadow-md"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  € EUR
                </button>
                <button
                  type="button"
                  onClick={() => setCur("USD")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                    cur === "USD"
                      ? "bg-white text-black shadow-md"
                      : "text-white/70 hover:text-white"
                  }`}
                >
                  $ USD
                </button>
              </div>
            </div>
          </div>

          {/* Aksiyon butonları */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSave}
              className={`btn-ghost rounded-2xl backdrop-blur transition ${
                savedToast || isSaved(input)
                  ? "bg-emerald-500/90 text-white shadow-lg"
                  : "bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              <Bookmark className={`h-4 w-4 ${savedToast || isSaved(input) ? "fill-current" : ""}`} />
              <span>{savedToast ? "Kaydedildi ✓" : isSaved(input) || savedId.current ? "Kaydı Güncelle" : "Planı Kaydet"}</span>
            </button>
            <button
              onClick={() => setSplitOpen(true)}
              className="btn-ghost rounded-2xl bg-white/15 text-white backdrop-blur hover:bg-white/25"
              title="Grup Masraf Bölüşme & Kasa Hesaplayıcı"
            >
              <Users className="h-4 w-4 text-fuchsia-300" />
              <span className="hidden sm:inline">Grup Kasası</span>
            </button>
            <button
              onClick={() => setCompareOpen(true)}
              className="btn-ghost rounded-2xl bg-white/15 text-white backdrop-blur hover:bg-white/25"
              title="Diğer Şehirlerle Yan Yana Kıyasla"
            >
              <Scale className="h-4 w-4 text-sky-300" />
              <span className="hidden sm:inline">Şehir Kıyasla</span>
            </button>
            <button
              onClick={() => setAlertOpen(true)}
              className="btn-ghost rounded-2xl bg-white/15 text-white backdrop-blur hover:bg-white/25"
              title="Fiyat Alarmı Kur"
            >
              <BellRing className="h-4 w-4 text-amber-300" />
              <span className="hidden sm:inline">Fiyat Alarmı</span>
            </button>
            <button
              onClick={() => setAlertsManagerOpen(true)}
              className="btn-ghost rounded-2xl bg-white/15 text-white backdrop-blur hover:bg-white/25"
              title="Kayıtlı Fiyat Alarmlarını Görüntüle & Yönet"
            >
              <Bell className="h-4 w-4 text-amber-300" />
              <span className="hidden sm:inline">Alarmlarım</span>
            </button>
            <button
              onClick={() => setPackingOpen(true)}
              className="btn-ghost rounded-2xl bg-white/15 text-white backdrop-blur hover:bg-white/25"
              title="Akıllı Bavul Hazırlama Listesi"
            >
              <Luggage className="h-4 w-4 text-emerald-300" />
              <span className="hidden sm:inline">Bavul Listesi</span>
            </button>
            <button
              onClick={() => setShareOpen(true)}
              className="btn-ghost rounded-2xl bg-emerald-500/80 text-white backdrop-blur hover:bg-emerald-500"
              title="Gmail / WhatsApp"
            >
              <Share2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t.shareRoute}</span>
            </button>
            <button
              onClick={() => setPdfModalOpen(true)}
              className="btn-ghost rounded-2xl bg-gradient-to-r from-sky-500/80 to-blue-600/80 text-white backdrop-blur hover:opacity-95 shadow-md shadow-sky-500/20"
              title="PDF"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{t.downloadPdf}</span>
            </button>
            <button
              onClick={() => setOfflineModalOpen(true)}
              className="btn-ghost rounded-2xl bg-amber-500/80 text-white backdrop-blur hover:bg-amber-500 shadow-md shadow-amber-500/20"
              title="Offline"
            >
              <WifiOff className="h-4 w-4" />
              <span className="hidden sm:inline">{t.offlinePack}</span>
            </button>
            <button
              onClick={() => setStoryModalOpen(true)}
              className="btn-ghost rounded-2xl bg-gradient-to-r from-pink-500/80 to-amber-500/80 text-white backdrop-blur hover:opacity-95 shadow-md shadow-pink-500/20"
              title="Instagram Story & Reels Gezi Kartı Üret (9:16 HD)"
            >
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Story Kartı</span>
            </button>
            <button
              onClick={() => setEditOpen(!editOpen)}
              className="btn-ghost rounded-2xl bg-white/15 text-white backdrop-blur hover:bg-white/25"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span className="hidden sm:inline">Düzenle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Arama düzenleme çekmecesi */}
      {initialPlan && <p className="mx-auto max-w-7xl px-4 pt-3 text-xs text-black/55 dark:text-white/55">Kayıtlı plan · Fiyatlar ve hava durumu kayıt anına aittir. Değişiklikleri saklamak için Kaydı Güncelle düğmesini kullanın.</p>}
      {saveError && <p role="alert" className="mx-auto max-w-7xl px-4 pt-3 text-sm text-rose-600 dark:text-rose-400">{saveError}</p>}
      <AnimatePresence>
        {editOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-6">
              <SearchForm initial={input} compact />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Esnek Tarih Fiyat Çubuğu (±3 Gün En Ucuz Gün) */}
      {flexDates && flexDates.length > 0 && (
        <div className="card mt-6 p-4">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-black/50 dark:text-white/50">
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Tahmini Esnek Tarih Fiyatları (±3 Gün)
            </span>
            <span>Farklı tarihler ayrıca sorgulanır</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {flexDates.map((fd) => {
              const isSelected = fd.date === input.startDate;
              return (
                <Link
                  key={fd.date}
                  href={`/plan?${toQuery({ ...input, startDate: fd.date, endDate: fd.endDate })}`}
                  className={`flex flex-col items-center rounded-xl p-2 text-center text-xs transition ${
                    isSelected
                      ? "bg-gradient-to-r from-brand-600 to-fuchsia-500 font-bold text-white shadow"
                      : "bg-black/[0.03] hover:bg-black/[0.06] dark:bg-white/[0.03] dark:hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="text-[11px] opacity-75">{fmtDate(fd.date)}</span>
                  <span className="mt-1 font-semibold">{tl(fd.priceTry)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Hava Durumu Şeridi */}
      {weather && weather.days.length > 0 && (
        <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-2 scroll-thin">
          <div className="shrink-0 text-xs font-semibold text-black/50 dark:text-white/50">
            Hava Durumu ({weather.kind === "tahmin" ? "Tahmin" : "Geçen yılın aynı tarihleri"}):
            {" "}<a href={weather.source === "MET Norway" ? "https://api.met.no/" : "https://open-meteo.com/"} target="_blank" rel="noopener noreferrer" className="underline">{weather.source || "Open-Meteo"}</a>
            {" · "}<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline">CC BY 4.0</a>
            {weather.source === "MET Norway" && <span> · Günlük özet</span>}
          </div>
          {weather.days.map((w) => {
            const wi = weatherIcon(w.code);
            return (
              <div
                key={w.date}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-black/5 bg-white/60 px-3 py-1.5 text-xs shadow-sm dark:border-white/5 dark:bg-white/5"
              >
                <span>{wi.icon}</span>
                <span className="font-medium">{fmtDate(w.date)}:</span>
                <span className="font-bold">{w.max}°C</span>
                <span className="text-black/40 dark:text-white/40">/ {w.min}°C</span>
              </div>
            );
          })}
        </div>
      )}

      {/* 3 Çeşit Bütçe Ayarlama & Akıllı Öneri Seçici Şeridi */}
      {data.budgetGuide && (
        <div className="card mt-6 border-brand-500/25 bg-gradient-to-r from-brand-500/[0.04] via-purple-500/[0.03] to-emerald-500/[0.04] p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                <Sparkles className="h-4 w-4" />
                <span>3 Çeşit Bütçe Modu & Akıllı Seyahat Rehberi</span>
              </div>
              <p className="mt-1 text-xs text-black/65 dark:text-white/65">
                Bütçe tarzınızı seçin: Restoranlar, günlük öğün fiyatları, otel/uçuş seçimi ve şehirdeki tüm öneriler anında güncellensin!
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {(
                [
                  {
                    id: "tasarruflu" as Comfort,
                    label: "💚 Tasarruflu",
                    sub: "Sokak Lezzeti & Ekonomik",
                    est: packageEstimates?.tasarruflu ?? data.budgetGuide.tierTotalEstimates.tasarruflu.totalTripTry,
                    food: data.budgetGuide.mealCosts.tasarruflu.dailyTotalTry,
                    activeCls: "border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30",
                  },
                  {
                    id: "dengeli" as Comfort,
                    label: "💙 Dengeli",
                    sub: "Fiyat / Performans & Konfor",
                    est: packageEstimates?.dengeli ?? data.budgetGuide.tierTotalEstimates.dengeli.totalTripTry,
                    food: data.budgetGuide.mealCosts.dengeli.dailyTotalTry,
                    activeCls: "border-sky-500 bg-sky-500/15 text-sky-900 dark:text-sky-200 ring-2 ring-sky-500/30",
                  },
                  {
                    id: "konforlu" as Comfort,
                    label: "💜 Konforlu",
                    sub: "Geniş yemek & konaklama bütçesi",
                    est: packageEstimates?.konforlu ?? data.budgetGuide.tierTotalEstimates.konforlu.totalTripTry,
                    food: data.budgetGuide.mealCosts.konforlu.dailyTotalTry,
                    activeCls: "border-purple-500 bg-purple-500/15 text-purple-900 dark:text-purple-200 ring-2 ring-purple-500/30",
                  },
                ] as const
              ).map((t) => {
                const isActive = budgetTier === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyBudgetTierPackage(t.id)}
                    className={`flex flex-col justify-between rounded-2xl border px-3.5 py-2.5 text-left transition ${
                      isActive
                        ? t.activeCls
                        : "border-black/10 bg-white/70 hover:border-brand-400 dark:border-white/10 dark:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold">{t.label}</span>
                      {isActive && (
                        <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-bold dark:bg-white/15">
                          Aktif Mod ✓
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-[11px] opacity-75">{t.sub}</div>
                    <div className="mt-1.5 flex items-baseline justify-between border-t border-black/5 pt-1.5 text-[11px] dark:border-white/5">
                      <span className="opacity-70">Tahmini Paket:</span>
                      <span className="font-black">{fmtCur(t.est, cur, rates)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {addedRestToast && (
            <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow">
              <span>✅ {addedRestToast}</span>
              <button type="button" onClick={() => setActiveTab("rota")} className="underline">
                Günlük Rotada Gör →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Navigasyon Sekmeleri */}
      <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-black/10 pb-3 dark:border-white/10">
        {[
          { id: "rota", label: t.dailyRoute, icon: Compass, count: data.days.length },
          { id: "ucuslar", label: t.flightHotel, icon: Plane, count: data.flights.length },
          { id: "oteller", label: t.bookHotel, icon: Building2, count: data.hotels.length },
          {
            id: "mekanlar",
            label: t.restaurants,
            icon: Utensils,
            count: (data.restaurants?.length || 0) + cheapPlaces.length,
          },
          { id: "butce", label: t.budgetSummary, icon: DollarSign },
          { id: "kesif", label: "Konuşma Kartı, Fotoğraf & Transfer", icon: Volume2 },
          { id: "araclar", label: "Kur, Müze Kartı & eSIM", icon: Ticket },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`chip ${active ? "chip-on font-semibold" : "text-black/70 dark:text-white/70"}`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[11px] ${
                    active ? "bg-white/20 text-white" : "bg-black/10 dark:bg-white/10"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* İki Kolonlu Ana Gövde */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1.55fr_1fr]">
        {/* SOL KOLON: Aktif Sekme İçeriği */}
        <div>
          {/* SEKME 1: GÜNLÜK ROTA */}
          {activeTab === "rota" && (
            <div>
              {/* Hava Tahmini & Ne Zaman Gidilmeli Rehberi */}
              <div className="mb-6">
                <CityWeatherWidget
                  cityId={data.city.id}
                  cityName={data.city.name}
                  country={data.city.country}
                />
              </div>

              {/* Vize, Pasaport & Sınır Giriş Rehberi Asistanı */}
              <div className="mb-6">
                <VisaRequirementsCard city={data.city} departureDate={input.startDate} />
              </div>

              {/* Gün Seçici */}
              <div className="flex gap-2 overflow-x-auto pb-2 scroll-thin">
                {data.days.map((d) => (
                  <button
                    key={d.day}
                    onClick={() => setActiveDay(d.day)}
                    className={`shrink-0 rounded-2xl px-4 py-3 text-left transition ${
                      activeDay === d.day
                        ? "bg-gradient-to-r from-brand-600 to-fuchsia-500 text-white shadow-lg shadow-brand-500/25"
                        : "card hover:border-brand-400"
                    }`}
                  >
                    <div className="text-xs font-semibold opacity-80 uppercase">{t.dayLabel} {d.day}</div>
                    <div className="text-sm font-bold">{fmtDate(d.date)}</div>
                  </button>
                ))}
              </div>

              {/* Seçili Günün Aktiviteleri (Zaman Çizelgesi / Timeline) */}
              {(() => {
                const day = data.days.find((d) => d.day === activeDay) || data.days[0];
                const dayCustom = customActs[activeDay] || [];
                const allActivities = mergeDayActivities(day.activities, dayCustom);

                return (
                  <div className="mt-6">
                    {/* Hava Durumu Akıllı Uyarısı */}
                    {(() => {
                      const dayWeather =
                        data.weather?.days.find((w) => w.date === day.date) ||
                        data.weather?.days[activeDay - 1];
                      if (dayWeather && dayWeather.code >= 51 && dayWeather.code <= 99) {
                        return (
                          <div className="mb-4 flex items-center justify-between rounded-2xl border border-sky-500/30 bg-sky-500/[0.08] p-3.5 text-xs text-sky-950 dark:text-sky-200">
                            <div className="flex items-center gap-2.5">
                              <CloudRain className="h-5 w-5 shrink-0 text-sky-500" />
                              <div>
                                <span className="font-extrabold">
                                  🌧️ Akıllı Hava Rehberi ({dayWeather.max}°C, Yağış İhtimali):
                                </span>
                                <span className="ml-1 opacity-90">
                                  Bu gün için yağış bekleniyor. Açık hava yürüyüşleri yerine kapalı müzeleri ve çarşıları bu güne denk getirmeniz önerilir.
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Rota Optimizasyon Toast Bildirimi */}
                    {optimizedToast && (
                      <div className="mb-4 flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-500/20">
                        <span>{optimizedToast}</span>
                        <button
                          type="button"
                          onClick={() => setOptimizedToast(null)}
                          className="opacity-80 hover:opacity-100"
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h2 className="text-2xl font-bold">{day.title}</h2>
                        <span className="text-xs text-black/50 dark:text-white/50">
                          {allActivities.length} aktivite
                        </span>
                      </div>

                      {/* Google Haritalar & Akıllı Sıralama Butonları */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setMapsModalOpen(true)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-500/25 dark:text-emerald-300"
                          title="Tüm Durakları Sırayla Google Haritalar'a Aktar"
                        >
                          <Navigation className="h-3.5 w-3.5" />
                          <span>Google Haritalar&apos;da Aç</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOptimizeDayRoute(activeDay)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500/15 px-3 py-1.5 text-xs font-bold text-brand-700 transition hover:bg-brand-500/25 dark:text-brand-300"
                          title="Günün duraklarını en az yürüyecek şekilde akıllı sırala"
                        >
                          <Zap className="h-3.5 w-3.5 text-amber-500" />
                          <span>Rotayı Akıllı Sırala</span>
                        </button>
                      </div>
                    </div>

                    <div className="relative border-l-2 border-brand-500/30 pl-6 space-y-6">
                      {allActivities.map((act, idx) => {
                        const actKey = activityCheckKey(activeDay, act);
                        const isDone = !!checkedActs[actKey];
                        const personal = !!act.id && (customActs[activeDay] || []).some(item => item.id === act.id);

                        return (
                          <div key={actKey} className="relative group">
                            {/* Pin İkonu / Tamamlandı Butonu */}
                            <button
                              onClick={() => setCheckedActs((prev) => ({ ...prev, [actKey]: !prev[actKey] }))}
                              aria-label={act.title + " tamamlandı"}
                              aria-pressed={isDone}
                              className={`absolute -left-[33px] top-1.5 grid h-6 w-6 place-items-center rounded-full text-xs font-bold shadow-md transition ${
                                isDone
                                  ? "bg-emerald-500 text-white ring-2 ring-emerald-300"
                                  : "bg-brand-500 text-white hover:scale-110"
                              }`}
                              title={isDone ? "Tamamlandı olarak işaretlendi (Geri al)" : "Tamamlandı olarak işaretle"}
                            >
                              {isDone ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                            </button>

                            <div
                              className={`card p-5 transition group-hover:border-brand-400 group-hover:shadow-md ${
                                isDone ? "opacity-60 bg-emerald-500/[0.03] border-emerald-500/30" : ""
                              }`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>{act.time}</span>
                                    <span className="opacity-50">·</span>
                                    <span>{act.kind}</span>
                                    {isDone && (
                                      <span className="text-emerald-500 font-semibold lowercase">
                                        (tamamlandı)
                                      </span>
                                    )}
                                  </div>
                                  <h3 translate={personal ? "no" : undefined} className={`mt-1 text-lg font-bold ${isDone ? "line-through opacity-75" : ""}`}>
                                    {act.title}
                                  </h3>
                                </div>
                                <div className="text-right">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                                      act.costTry === 0
                                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                        : "bg-brand-500/10 text-brand-600 dark:text-brand-300"
                                    }`}
                                  >
                                    {act.costTry === 0 ? "Ücretsiz" : fmtCur(act.costTry, cur, rates)}
                                  </span>
                                </div>
                              </div>

                              <p translate={personal ? "no" : undefined} className="mt-2 text-sm text-black/60 dark:text-white/60">{act.description}</p>

                              <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3 dark:border-white/5">
                                <div className="flex items-center gap-3">
                                  {hasMapCoordinates(act) && (act.kind !== "otel" || !!hotelCoordinates(selectedHotel)) ? (
                                    <button
                                      onClick={() => {
                                        const point = act.kind === "otel" ? hotelCoordinates(selectedHotel) : act;
                                        if (point) setMapFocus([point.lat!, point.lon!]);
                                        const mapEl = document.getElementById("live-map-card");
                                        if (mapEl && window.innerWidth < 1024) {
                                          mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
                                        }
                                      }}
                                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                                    >
                                      <MapPin className="h-3.5 w-3.5" /> Haritada Göster
                                    </button>
                                  ) : null}

                                  {(act.kind === "gezi" || act.costTry > 0) && (
                                    <a
                                      href={`https://www.getyourguide.com/s/?q=${encodeURIComponent(act.title + " " + data.city.name)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                                      title={`${act.title} Hızlı Geçiş ve Tur Biletleri`}
                                    >
                                      <Ticket className="h-3.5 w-3.5" />
                                      <span>{t.viewTickets}</span>
                                    </a>
                                  )}
                                </div>

                                <button
                                  onClick={() => setCheckedActs((prev) => ({ ...prev, [actKey]: !prev[actKey] }))}
                                  className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                    isDone ? "text-emerald-500" : "text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
                                  }`}
                                >
                                  {isDone ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                                  {isDone ? "Tamamlandı" : "Gezdim olarak işaretle"}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Gün İçin Özel Aktivite / Not Ekleme */}
                    <div className="mt-6 pl-6">
                      {!showAddAct ? (
                        <button
                          onClick={() => { setNewActError(null); setShowAddAct(true); }}
                          className="btn-ghost flex items-center gap-2 rounded-2xl border border-dashed border-black/20 px-4 py-2.5 text-xs font-semibold text-brand-600 hover:border-brand-500 dark:border-white/20 dark:text-brand-400"
                        >
                          <Plus className="h-4 w-4" /> Bu Güne Kendi Aktiviteni / Notunu Ekle
                        </button>
                      ) : (
                        <div className="card p-5 border-brand-500/40">
                          <div className="flex items-center justify-between font-bold text-sm">
                            <span>Gün {activeDay} İçin Yeni Aktivite Ekle</span>
                            <button
                              onClick={() => setShowAddAct(false)}
                              className="text-xs text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
                            >
                              İptal
                            </button>
                          </div>
                          <div className="mt-3 grid gap-3 sm:grid-cols-3">
                            <div className="sm:col-span-2">
                              <label className="text-xs text-black/60 dark:text-white/60">Aktivite / Mekân Adı</label>
                              <input
                                type="text"
                                maxLength={200}
                                placeholder="Örn: Meşhur dondurmacıda mola"
                                value={newActTitle}
                                onChange={(e) => setNewActTitle(e.target.value)}
                                className="input-field mt-1 w-full text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-black/60 dark:text-white/60">Saat</label>
                              <input
                                type="text"
                                placeholder="16:30"
                                maxLength={5}
                                value={newActTime}
                                onChange={(e) => setNewActTime(e.target.value)}
                                className="input-field mt-1 w-full text-sm"
                              />
                            </div>
                          </div>
                          <div className="mt-3">
                            <label className="text-xs text-black/60 dark:text-white/60">Not / Detay</label>
                            <input
                              type="text"
                              maxLength={2000}
                              placeholder="Örn: 2 top dondurma tat, manzara fotoğrafı çek"
                              value={newActDesc}
                              onChange={(e) => setNewActDesc(e.target.value)}
                              className="input-field mt-1 w-full text-sm"
                            />
                          </div>
                          {newActError && <p role="alert" className="mt-3 text-xs text-rose-600 dark:text-rose-400">{newActError}</p>}
                          <div className="mt-4 flex justify-end gap-2">
                            <button
                              onClick={() => setShowAddAct(false)}
                              className="btn-ghost text-xs"
                            >
                              Kapat
                            </button>
                            <button
                              onClick={() => {
                                if (!newActTitle.trim()) { setNewActError("Aktivite adını girin."); return; }
                                const time = newActTime.trim() || "16:00";
                                if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
                                  setNewActError("Saati 00:00–23:59 arasında, SS:DD biçiminde girin.");
                                  return;
                                }
                                const newAct: PlanActivity = {
                                  id: crypto.randomUUID(),
                                  time,
                                  title: newActTitle.trim(),
                                  kind: "serbest",
                                  description: newActDesc.trim() || "Kullanıcı tarafından eklenen özel gezi notu",
                                  costTry: 0,
                                };
                                setCustomActs((prev) => ({
                                  ...prev,
                                  [activeDay]: [...(prev[activeDay] || []), newAct],
                                }));
                                setNewActTitle("");
                                setNewActDesc("");
                                setNewActError(null);
                                setShowAddAct(false);
                              }}
                              className="btn-primary text-xs"
                            >
                              Aktiviteyi Kaydet
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* ANLIK BOŞ VAKİT ÖNERİCİSİ & GÜNÜBİRLİK YAKIN ŞEHİR ROTALARI */}
              <SpontaneousAndDayTrips
                data={displayData}
                cur={cur}
                activeDay={activeDay}
                onFocusMap={handleFocusMap}
                onAddIdeaToDay={handleAddIdeaToDay}
                onAddDayTripToDay={handleAddDayTripToDay}
              />
            </div>
          )}

          {/* SEKME 2: UÇUŞLAR */}
          {activeTab === "ucuslar" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold">Uçuş Seçenekleri & Bilet Fiyatları</h2>
                  <p className="text-xs text-black/55 dark:text-white/55">
                    {input.origin} ➔ {city.iata} ({city.name}) gidiş-dönüş uçuş alternatifleri
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    sources["Uçuşlar"] === "canli"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  }`}>
                    {sources["Uçuşlar"] === "canli" ? "🟢 Canlı uçuş verisi" : data.flights.some(f => f.priceKind === "indicative") ? "💡 Aviasales gösterge fiyatları" : "💡 Tahmini uçuş fiyatları"}
                  </span>
                </div>
              </div>

              {/* Bilgi Kutusu */}
              <div className="rounded-2xl border-2 border-brand-500/30 bg-brand-500/[0.07] p-4 text-xs text-black/85 dark:text-white/85">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-brand-500/20 p-2 text-brand-600 dark:text-brand-300">
                    <Plane className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-emerald-500 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-white shadow-sm">
                        TAM GİDİŞ - DÖNÜŞ (ROUND-TRIP)
                      </span>
                      <p className="font-extrabold text-sm text-black dark:text-white">
                        Sitedeki tüm uçak bileti fiyatları hem GİDİŞ hem DÖNÜŞ dahildir.
                      </p>
                    </div>
                    <p className="text-black/70 dark:text-white/70">
                      Gösterilen rakam kişi başı gidiş-dönüş fiyatıdır. Toplam tutar seçilen yolcu sayısıyla ({input.travelers} kişi) çarpılarak genel bütçenize otomatik yansır.
                    </p>
                    {data.flights.some(f => f.priceKind === "indicative") && <p className="text-black/70 dark:text-white/70">Aviasales Data API, geçmiş aramalarda bulunan fiyatları sağlar. Kontrol: {new Date(data.flights.find(f => f.checkedAt)?.checkedAt || Date.now()).toLocaleString(locale)}. Bu kontrol anı, biletin ilk bulunduğu an değildir. Fiyat, bagaj ve {input.travelers} kişi için müsaitlik satıcıda doğrulanmalıdır; grup toplamı bütçe tahminidir.</p>}
                  </div>
                </div>
              </div>

              {/* Uçuş Listesi */}
              <div className="space-y-4">
                {data.flights.map((f) => {
                  const isSelected = selectedFlight?.id === f.id;
                  const gfUrl = f.googleFlightsUrl || f.link || `https://www.google.com/travel/flights?q=flights%20from%20${input.origin}%20to%20${city.iata}%20on%20${input.startDate}%20through%20${input.endDate}`;
                  const skyUrl = f.skyscannerUrl || `https://www.skyscanner.com.tr/transport/flights/${input.origin.toLowerCase()}/${city.iata.toLowerCase()}/${input.startDate.slice(2).replace(/-/g, "")}/${input.endDate.slice(2).replace(/-/g, "")}/`;
                  const enuUrl = f.enuygunUrl || `https://www.enuygun.com/ucak-bileti/arama/${input.origin}-${city.iata}/?gidis=${input.startDate}&donus=${input.endDate}&yetiskin=1`;

                  return (
                    <div
                      key={f.id}
                      onClick={() => setSelectedFlight(f)}
                      className={`card cursor-pointer p-5 transition hover:shadow-md ${
                        isSelected
                          ? "border-brand-500 ring-2 ring-brand-500/25 shadow-lg bg-brand-500/[0.02]"
                          : "hover:border-black/20 dark:hover:border-white/20"
                      }`}
                    >
                      {/* Üst Başlık: Havayolu, Kabin Sınıfı, Bagaj, Fiyat */}
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-black/5 pb-4 dark:border-white/5">
                        <div className="flex items-center gap-3.5">
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-500/20 to-purple-500/20 font-extrabold text-brand-600 dark:text-brand-300">
                            {f.airline.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-bold text-black dark:text-white">{f.airline}</h3>
                              {isSelected && (
                                <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                                  <Check className="h-3 w-3" /> Seçili Uçuş
                                </span>
                              )}
                              {f.cabinClass && (
                                <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-black/60 dark:bg-white/10 dark:text-white/60">
                                  {f.cabinClass}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-black/50 dark:text-white/50">
                              <span className="flex items-center gap-1">
                                <Luggage className="h-3.5 w-3.5 text-black/40 dark:text-white/40" />
                                {f.baggage || "Standart Bagaj"}
                              </span>
                              <span>·</span>
                              <span>{f.outbound.stopsDetail || (f.outbound.stops === 0 ? "Aktarmasız (Direkt)" : `${f.outbound.stops} Aktarmalı`)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Fiyat Bölümü */}
                        <div className="text-left sm:text-right">
                          <div className="text-xs text-black/50 dark:text-white/50">Kişi başı gidiş-dönüş</div>
                          <div className="text-2xl font-black text-gradient">
                            {fmtCur(f.priceTry, cur, rates)}
                          </div>
                          <div className="text-[11px] font-medium text-black/45 dark:text-white/45">
                            Toplam: {fmtCur(f.priceTry * input.travelers, cur, rates)} ({input.travelers} yolcu)
                          </div>
                        </div>
                      </div>

                      {/* Uçuş Parkurları (Gidiş & Dönüş) */}
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
                        {/* Gidiş Segmenti */}
                        <div className="rounded-xl bg-black/[0.02] p-3 dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                          <div className="flex items-center justify-between text-black/50 dark:text-white/50 font-semibold mb-1.5">
                            <span className="flex items-center gap-1 text-brand-600 dark:text-brand-400">
                              <Plane className="h-3.5 w-3.5" /> GİDİŞ
                            </span>
                            {f.outbound.flightNumber && (
                              <span className="font-mono text-[11px] font-bold text-black/70 dark:text-white/70">
                                {f.outbound.flightNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-base font-bold text-black dark:text-white">
                                {timeOf(f.outbound.departure)}
                              </div>
                              <div className="text-[11px] text-black/50 dark:text-white/50 font-medium">
                                {f.outbound.from || input.origin}
                              </div>
                            </div>
                            <div className="flex flex-col items-center px-2">
                              <span className="text-[11px] font-medium text-black/45 dark:text-white/45">
                                {fmtDuration(f.outbound.durationMin)}
                              </span>
                              <div className="relative my-1 flex items-center w-20">
                                <div className="h-[1.5px] w-full bg-brand-500/40" />
                                <Plane className="absolute right-0 h-3 w-3 text-brand-500 translate-x-1" />
                              </div>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                {f.outbound.stopsDetail || (f.outbound.stops === 0 ? "Direkt" : `${f.outbound.stops} Aktarma`)}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-base font-bold text-black dark:text-white">
                                {timeOf(f.outbound.arrival)}
                              </div>
                              <div className="text-[11px] text-black/50 dark:text-white/50 font-medium">
                                {f.outbound.to || city.iata}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Dönüş Segmenti */}
                        {f.inbound ? (
                          <div className="rounded-xl bg-black/[0.02] p-3 dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                            <div className="flex items-center justify-between text-black/50 dark:text-white/50 font-semibold mb-1.5">
                              <span className="flex items-center gap-1 text-fuchsia-600 dark:text-fuchsia-400">
                                <Plane className="h-3.5 w-3.5 rotate-180" /> DÖNÜŞ
                              </span>
                              {f.inbound.flightNumber && (
                                <span className="font-mono text-[11px] font-bold text-black/70 dark:text-white/70">
                                  {f.inbound.flightNumber}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-base font-bold text-black dark:text-white">
                                  {timeOf(f.inbound.departure)}
                                </div>
                                <div className="text-[11px] text-black/50 dark:text-white/50 font-medium">
                                  {f.inbound.from || city.iata}
                                </div>
                              </div>
                              <div className="flex flex-col items-center px-2">
                                <span className="text-[11px] font-medium text-black/45 dark:text-white/45">
                                  {fmtDuration(f.inbound.durationMin)}
                                </span>
                                <div className="relative my-1 flex items-center w-20">
                                  <div className="h-[1.5px] w-full bg-fuchsia-500/40" />
                                  <Plane className="absolute right-0 h-3 w-3 text-fuchsia-500 translate-x-1 rotate-180" />
                                </div>
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {f.inbound.stopsDetail || (f.inbound.stops === 0 ? "Direkt" : `${f.inbound.stops} Aktarma`)}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-base font-bold text-black dark:text-white">
                                  {timeOf(f.inbound.arrival)}
                                </div>
                                <div className="text-[11px] text-black/50 dark:text-white/50 font-medium">
                                  {f.inbound.to || input.origin}
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center rounded-xl bg-black/[0.02] p-3 text-xs text-black/40 dark:bg-white/[0.02] dark:text-white/40">
                            Tek yön / Açık dönüş
                          </div>
                        )}
                      </div>

                      {/* Alt Aksiyon Butonları: Bilet Rezervasyon & Doğrulama Linkleri */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-3 dark:border-white/5">
                        <div className="flex flex-wrap items-center gap-2">
                          {f.link && (
                            <a
                              href={f.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:from-blue-500 hover:to-indigo-500"
                              title="Bu uçuşu resmi biletleme sayfasında canlı incele ve satın al"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              <span>Bileti Gör & Al</span>
                            </a>
                          )}

                          <a
                            href={gfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-500/10 px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-500/20 dark:text-brand-300"
                            title="Google Flights üzerinden bu uçuşu ve diğer saatleri canlı incele"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Google Flights</span>
                          </a>

                          <a
                            href={skyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-500/20 dark:text-sky-300"
                            title="Skyscanner ile bilet fiyatlarını karşılaştır"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Skyscanner</span>
                          </a>

                          <a
                            href={enuUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500/20 dark:text-emerald-300"
                            title="Enuygun ile Türk Lirası taksitli bilet ara"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Enuygun</span>
                          </a>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFlight(f);
                          }}
                          className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                            isSelected
                              ? "bg-emerald-500 text-white shadow-sm"
                              : "btn-ghost text-brand-600 dark:text-brand-400"
                          }`}
                        >
                          {isSelected ? "Rotada Seçili ✓" : "Bu Uçuşu Seç"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SEKME 3: OTELLER */}
          {activeTab === "oteller" && (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold">Konaklama Seçenekleri & Otel Fiyatları</h2>
                  <p className="text-xs text-black/55 dark:text-white/55">
                    {city.name} için konaklama alternatifleri ({nights} gece, {input.travelers} yetişkin, {data.rooms} oda araması)
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    sources["Oteller"] === "canli" && (!data.hotels.some((hotel) => hotel.bookingQuote) || data.hotels.some((hotel) => hotelQuoteIsFresh(hotel, quoteClock)))
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-pink-500/10 text-pink-600 dark:text-pink-400"
                  }`}>
                    {data.hotels.some((hotel) => hotel.bookingQuote) ? data.hotels.some((hotel) => hotelQuoteIsFresh(hotel, quoteClock)) ? "Booking arama fiyatları" : "Kaydedilmiş Booking fiyatları" : sources["Oteller"] === "canli" ? "Google Hotels sağlayıcı verisi" : "💡 Tahmini otel fiyatları"}
                  </span>
                </div>
              </div>

              {/* Bilgi Kutusu & 3 Bütçeye Göre En İyi Konaklama Bölgeleri */}
              <div className="rounded-2xl border border-pink-500/20 bg-pink-500/5 p-4 text-xs text-black/75 dark:text-white/75 space-y-3">
                <div className="flex items-start gap-2.5">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-pink-600 dark:text-pink-400" />
                  <div className="space-y-1">
                    <p className="font-semibold text-black dark:text-white">
                      {data.hotels.some((hotel) => hotel.bookingQuote)
                        ? `Ana tutar ${nights} gece ve ${input.travelers} yetişkin için arama bedeli ile bilinen ek vergilerin toplamıdır. Gecelik ortalama ayrıca gösterilir. Bu bir rezervasyon fiyat garantisi değildir; hesap, cihaz, ülke, oda ve ödeme koşulları Booking’de farklı fiyat oluşturabilir.`
                        : `Tutarlar ${input.travelers} kişi için konaklama bütçesi tahminidir. Booking.com fiyatı, oda kapasitesi ve müsaitliği doğrulanmış değildir.`}
                    </p>
                    <p className="opacity-80">
                      Oda müsaitliği, fotoğraflar ve iptal koşullarını doğrudan incelemek için her otelin altındaki <b>Booking.com</b>, <b>Agoda</b> veya <b>Trip.com</b> butonlarını kullanabilirsiniz.
                    </p>
                  </div>
                </div>

                {(() => {
                  const konaklamaAdvice = data.budgetGuide?.categoryAdvice?.find((c) => c.category === "konaklama");
                  if (!konaklamaAdvice) return null;
                  return (
                    <div className="grid gap-2 border-t border-pink-500/15 pt-3 sm:grid-cols-3">
                      <div className={`rounded-xl p-2.5 ${budgetTier === "tasarruflu" ? "bg-emerald-500/15 ring-1 ring-emerald-500/40" : "bg-black/[0.03] dark:bg-white/[0.04]"}`}>
                        <div className="font-bold text-emerald-700 dark:text-emerald-400">💚 Tasarruflu Konaklama Önerisi</div>
                        <div className="mt-1 text-[11px]">{konaklamaAdvice.tasarruflu}</div>
                      </div>
                      <div className={`rounded-xl p-2.5 ${budgetTier === "dengeli" ? "bg-sky-500/15 ring-1 ring-sky-500/40" : "bg-black/[0.03] dark:bg-white/[0.04]"}`}>
                        <div className="font-bold text-sky-700 dark:text-sky-400">💙 Dengeli Konaklama Önerisi</div>
                        <div className="mt-1 text-[11px]">{konaklamaAdvice.dengeli}</div>
                      </div>
                      <div className={`rounded-xl p-2.5 ${budgetTier === "konforlu" ? "bg-purple-500/15 ring-1 ring-purple-500/40" : "bg-black/[0.03] dark:bg-white/[0.04]"}`}>
                        <div className="font-bold text-purple-700 dark:text-purple-400">💜 Konforlu Konaklama Önerisi</div>
                        <div className="mt-1 text-[11px]">{konaklamaAdvice.konforlu}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Bütçe Filtreleri ve Sıralama Barı */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-black/[0.02] p-3.5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-black/60 dark:text-white/60 mr-1">Bütçe Filtresi:</span>
                  {[
                    { id: "all" as const, label: `Tümü (${data.hotels.length})` },
                    { id: "hostel" as const, label: `🏨 Ekonomik Bütçe Otel (${data.hotels.filter((h) => h.roomTypeTag === "hostel" || h.roomTypeTag === "capsule" || h.stars <= 2).length})` },
                    { id: "guesthouse" as const, label: `🏠 Butik & Daire (${data.hotels.filter((h) => h.roomTypeTag === "guesthouse" || h.roomTypeTag === "apartment").length})` },
                    { id: "hotel" as const, label: `🏢 3★ Standart (${data.hotels.filter((h) => h.roomTypeTag === "hotel" || (h.stars === 3 && h.roomTypeTag !== "apartment")).length})` },
                    { id: "luxury" as const, label: `✨ 4-5★ Konfor & Lüks (${data.hotels.filter((h) => h.roomTypeTag === "luxury" || h.stars >= 4).length})` },
                  ].map((btn) => (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setHotelFilter(btn.id)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                        hotelFilter === btn.id
                          ? "bg-pink-500 text-white shadow-sm font-bold"
                          : "bg-white/80 dark:bg-white/10 text-black/70 dark:text-white/70 hover:bg-black/5 dark:hover:bg-white/15"
                      }`}
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-black/60 dark:text-white/60">Sırala:</span>
                  <select
                    value={hotelSort}
                    onChange={(e) => setHotelSort(e.target.value as "price" | "rating" | "dist")}
                    className="rounded-xl border border-black/10 bg-white px-2.5 py-1 text-xs font-semibold text-black dark:border-white/10 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="price">En Düşük Fiyat</option>
                    <option value="rating">En Yüksek Puan</option>
                    <option value="dist">Merkeze Yakınlık</option>
                  </select>
                </div>
              </div>

              {/* Otel Listesi Grid */}
              {filteredHotels.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-black/15 p-8 text-center dark:border-white/15">
                  <p className="text-sm font-semibold text-black/60 dark:text-white/60">Bu filtreye uygun otel bulunamadı.</p>
                  <button
                    type="button"
                    onClick={() => setHotelFilter("all")}
                    className="btn-primary mt-3 text-xs"
                  >
                    Tüm Otelleri Göster ({data.hotels.length})
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredHotels.map((h) => {
                  const isSelected = selectedHotel?.id === h.id;
                  const roomCount = h.roomCount ?? Math.ceil(input.travelers / 2);
                  const bUrl = h.bookingUrl || h.link || `https://www.booking.com/searchresults.tr.html?ss=${encodeURIComponent(h.name + " " + city.name)}&checkin=${input.startDate}&checkout=${input.endDate}&group_adults=${input.travelers}&no_rooms=${roomCount}&group_children=0&selected_currency=TRY&sb_price_type=total&type=total`;
                  const agUrl = h.agodaUrl || `https://www.agoda.com/tr-tr/search?text=${encodeURIComponent(h.name + " " + city.name)}&checkIn=${input.startDate}&checkOut=${input.endDate}&rooms=${roomCount}&adults=${input.travelers}`;
                  const tripUrl = h.tripUrl || `https://tr.trip.com/hotels/list?keyword=${encodeURIComponent(h.name + " " + city.name)}&checkIn=${input.startDate}&checkOut=${input.endDate}&adult=${input.travelers}`;

                  return (
                    <div
                      key={h.id}
                      onClick={() => {
                        setSelectedHotel(h);
                        const position = hotelCoordinates(h);
                        if (!position) { setMapFocus(null); return; }
                        setMapFocus([position.lat, position.lon]);
                        const mapEl = document.getElementById("live-map-card");
                        if (mapEl && window.innerWidth < 1024) {
                          mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }}
                      className={`card cursor-pointer flex flex-col justify-between overflow-hidden p-5 transition hover:shadow-md ${
                        isSelected
                          ? "border-pink-500 ring-2 ring-pink-500/25 shadow-lg bg-pink-500/[0.02]"
                          : "hover:border-black/20 dark:hover:border-white/20"
                      }`}
                    >
                      <div>
                        {/* Üst Kısım: Yıldızlar, Seçili Rozeti, İsim */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <div className="flex items-center text-amber-500">
                                {Array.from({ length: h.stars }).map((_, i) => (
                                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                                ))}
                              </div>
                              {h.neighborhood && (
                                <span className="rounded-md bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-black/60 dark:bg-white/10 dark:text-white/60">
                                  📍 {h.neighborhood}
                                </span>
                              )}
                            </div>
                            <h3 className="mt-1.5 text-base font-bold text-black dark:text-white leading-snug">{h.name}</h3>
                            <p className="mt-1 text-[10px] text-black/50 dark:text-white/50">{h.bookingQuote
                              ? `${hotelQuoteIsFresh(h, quoteClock) ? "Booking arama kaydı" : "Geçmiş arama fiyatı · yeniden kontrol edin"} · ${new Date(h.bookingQuote.checkedAt).toLocaleString(locale, { timeZone: "Europe/Istanbul" })}`
                              : h.bookingCatalog ? "Booking otel kaydı · seçtiğiniz tarih/kişi için fiyat doğrulanamadı; gösterilen tutar bütçe tahminidir" : h.source === "ornek" ? "Katalog önerisi · fiyat ve konum doğrulanmadı" : "Google Hotels sonucu · Booking fiyatı olarak doğrulanmadı"}</p>
                            {hotelCoordinates(h) && <p className="mt-1 text-[10px] text-black/55 dark:text-white/55">
                              {h.hotelLocation!.address} · <a href={coordinateMapUrl(hotelCoordinates(h))!} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="underline">GPS konumunu aç</a>
                            </p>}
                            {h.roomType && (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold ${
                                  h.roomTypeTag === "hostel"
                                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25"
                                    : h.roomTypeTag === "capsule"
                                    ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border border-cyan-500/25"
                                    : h.roomTypeTag === "guesthouse"
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25"
                                    : h.roomTypeTag === "apartment"
                                    ? "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border border-indigo-500/25"
                                    : h.roomTypeTag === "luxury"
                                    ? "bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/25"
                                    : "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/25"
                                }`}>
                                  {h.roomTypeTag === "hostel" ? "🏨 " : h.roomTypeTag === "capsule" ? "🏨 " : h.roomTypeTag === "guesthouse" ? "🏠 " : h.roomTypeTag === "apartment" ? "🏢 " : h.roomTypeTag === "luxury" ? "👑 " : "🏨 "}
                                  {h.roomType}
                                </span>
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <span className="shrink-0 flex items-center gap-1 rounded-full bg-pink-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                              <Check className="h-3 w-3" /> Seçili Otel
                            </span>
                          )}
                        </div>

                        {/* Puan ve Mesafe */}
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-black/60 dark:text-white/60">
                          <span className="inline-flex items-center gap-1 font-bold text-pink-600 dark:text-pink-400">
                            {h.source === "ornek" || !h.rating ? "Puanı sağlayıcıda görün" : <>★ <b>{h.rating}</b>/10</>}
                          </span>
                          <span>·</span>
                          <span>{hotelCoordinates(h) ? `Merkeze ${h.distanceKm} km (kuş uçuşu)` : "Konum doğrulanmadı"}</span>
                          {h.source !== "ornek" && h.reviews > 0 && (
                            <>
                              <span>·</span>
                              <span className="text-[11px] opacity-75">{h.reviews.toLocaleString(locale)} yorum</span>
                            </>
                          )}
                        </div>

                        {/* Hizmet & Olanaklar */}
                        <div className="mt-3 flex flex-wrap gap-1 text-[11px] text-black/65 dark:text-white/65">
                          {h.amenities.map((a, i) => (
                            <span key={i} className="rounded-lg bg-black/[0.04] px-2 py-0.5 dark:bg-white/[0.05]">
                              {a}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Fiyat ve Aksiyonlar */}
                      <div className="mt-5 border-t border-black/5 pt-3 dark:border-white/5">
                        {(() => {
                          const totalHotelCalc = hotelTotal(h, nights);
                          const nightlyTotal = hotelNightlyTotal(h, nights);
                          const perPersonPerNight = nightlyTotal / Math.max(input.travelers, 1);
                          const capText = h.capacityLabel || `${input.travelers} Gezgin`;

                          return (
                            <>
                              <div className="flex items-baseline justify-between mb-2">
                                <div>
                                  <span className="text-xs font-semibold text-black/60 dark:text-white/60">
                                    {h.bookingQuote ? `${nights} Gece · Bilinen Ücretlerle Toplam` : "Tahmini Gecelik Toplam"}
                                  </span>
                                  <div className="text-[11px] text-pink-600 dark:text-pink-400 font-medium">
                                    {capText}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-xl font-black text-gradient">
                                    {h.bookingQuote ? fmtMoney(totalHotelCalc, "TRY") : fmtCur(h.pricePerNightTry, cur, rates)}
                                  </span>
                                  <div className="text-[11px] text-black/45 dark:text-white/45">
                                    {h.bookingQuote ? <>Gecelik ortalama: <b>{fmtMoney(nightlyTotal, "TRY")}</b></> : <>{nights} gece tahmini toplam = <b>{fmtCur(totalHotelCalc, cur, rates)}</b></>}
                                  </div>
                                  {h.bookingQuote && cur !== "TRY" && <div className="text-[11px] text-black/45 dark:text-white/45">Yaklaşık {fmtMoney(totalHotelCalc, cur, rates)} · Booking kuru farklı olabilir</div>}
                                </div>
                              </div>

                              <div className="mb-2.5 flex items-center justify-between rounded-xl bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                <span className="flex items-center gap-1.5 truncate">
                                  <span>🛏️</span>
                                  <span className="truncate">{capText}</span>
                                </span>
                                {input.travelers > 1 ? (
                                  <span className="shrink-0 text-[10px] text-emerald-600/90 dark:text-emerald-400/90 ml-1">
                                    Kişi başı ~{h.bookingQuote ? fmtMoney(perPersonPerNight, "TRY") : fmtCur(perPersonPerNight, cur, rates)}/gece
                                  </span>
                                ) : (
                                  <span className="shrink-0 text-[10px] text-emerald-600/90 dark:text-emerald-400/90 ml-1">
                                    Sağlayıcıda Doğrulayın
                                  </span>
                                )}
                              </div>
                            </>
                          );
                        })()}

                        {h.bookingQuote && <div className="mb-3 space-y-1 text-[11px] text-black/60 dark:text-white/60">
                          <p>Arama bedeli: {fmtMoney(h.bookingQuote.displayTotalTry, "TRY")}.
                            {h.bookingQuote.excludedTaxesTry !== null ? ` Toplama eklenen vergiler/ücretler: ${fmtMoney(h.bookingQuote.excludedTaxesTry, "TRY")}.` : " Ek vergi/ücret tutarı doğrulanmadı; toplam artabilir."}
                            {h.bookingQuote.disclaimer ? ` ${h.bookingQuote.disclaimer}` : ""}</p>
                          <p>{h.bookingQuote.freeCancellation === true ? "Ücretsiz iptal seçeneği" : h.bookingQuote.freeCancellation === false ? "Ücretsiz iptal yok" : "İptal koşulu doğrulanmadı"}
                            {h.bookingQuote.freeCancellationUntil ? ` · Son tarih: ${new Date(h.bookingQuote.freeCancellationUntil).toLocaleString(locale, { timeZone: "Europe/Istanbul" })} (Türkiye saati)` : ""}
                            {h.bookingQuote.noPrepayment === true ? " · Ön ödeme yok" : ""}
                            {h.bookingQuote.mealPlan ? ` · ${h.bookingQuote.mealPlan}` : ""}</p>
                          {!!h.bookingQuote.deals?.length && <p>{h.bookingQuote.deals.join(" · ")}</p>}
                          <p>Booking’de aynı oda ve koşulları karşılaştırın; bağlantı bu teklifi sabitlemez. Kesin tutar Booking’de doğrulanır.</p>
                        </div>}

                        {/* Doğrulama & Rezervasyon Butonları (Trivago Kurgusu: Booking.com + Agoda + Trip.com) */}
                        <div className="flex flex-col gap-2.5 border-t border-black/5 pt-3 dark:border-white/5">
                          {/* 1. ANA BÜYÜK BUTON: BOOKING.COM */}
                          <div className="flex items-center gap-2">
                            <a
                              href={bUrl}
                              target="_blank"
                              rel="noopener noreferrer sponsored"
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#003580] hover:bg-[#00224f] text-white px-4 py-2.5 text-xs sm:text-sm font-extrabold shadow-md transition-all duration-200 hover:shadow-lg hover:scale-[1.01]"
                              title="Seçilen tarih, kişi ve oda sayısıyla Booking.com fiyatını ve müsaitliği kontrol et"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span>Booking.com’da Güncel Fiyatı Gör ({input.travelers} Kişi) →</span>
                            </a>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedHotel(h);
                              }}
                              className={`shrink-0 rounded-xl px-3 py-2.5 text-xs font-bold transition ${
                                isSelected
                                  ? "bg-pink-500 text-white"
                                  : "border border-black/10 text-black/70 hover:bg-black/5 dark:border-white/10 dark:text-white/70 dark:hover:bg-white/5"
                              }`}
                            >
                              {isSelected ? "Seçildi ✓" : "Plana Seç"}
                            </button>
                          </div>

                          {/* 2. ALTERNATİF FİYAT KIYASLAMA BUTONLARI: AGODA & TRIP.COM */}
                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-[11px] font-semibold text-black/45 dark:text-white/45">
                              Fiyat Kıyasla:
                            </span>
                            <div className="flex items-center gap-1.5">
                              <a
                                href={agUrl}
                                target="_blank"
                                rel="noopener noreferrer sponsored"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white/80 dark:bg-white/5 dark:border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition hover:bg-black/5 hover:border-black/20"
                                title="Agoda üzerinden alternatif fiyatı gör"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span>Agoda</span>
                              </a>

                              <a
                                href={tripUrl}
                                target="_blank"
                                rel="noopener noreferrer sponsored"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-black/10 bg-white/80 dark:bg-white/5 dark:border-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 transition hover:bg-black/5 hover:border-black/20"
                                title="Trip.com üzerinden alternatif fiyatı gör"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                                <span>Trip.com</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )}
            </div>
          )}

          {/* SEKME 4: RESTORANLAR, GÜNCEL ORTALAMA FİYATLAR & PAZARLAR */}
          {activeTab === "mekanlar" && (
            <div className="space-y-8">
              {/* 1. GÜNLÜK ÖĞÜN ORTALAMA FİYAT CETVELİ (3 Bütçe Seçenekli) */}
              {data.budgetGuide && (
                <div className="card p-5 sm:p-6 border-brand-500/25">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                        <Utensils className="h-3.5 w-3.5" /> 2026 Güncel Yeme-İçme Piyasa Rehberi
                      </span>
                      <h2 className="mt-1 text-xl font-bold">
                        {city.name} Günlük Öğün Ortalama Fiyatları (3 Bütçe Seviyesi)
                      </h2>
                    </div>

                    {/* 3 Bütçe Sekmesi */}
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          { id: "tasarruflu" as Comfort, label: "💚 Tasarruflu" },
                          { id: "dengeli" as Comfort, label: "💙 Dengeli" },
                          { id: "konforlu" as Comfort, label: "💜 Konforlu" },
                        ] as const
                      ).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            setBudgetTier(t.id);
                            setCustomDailyFoodTry(data.budgetGuide.mealCosts[t.id].dailyTotalTry);
                          }}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                            budgetTier === t.id
                              ? "bg-brand-600 text-white shadow"
                              : "bg-black/5 text-black/70 hover:bg-black/10 dark:bg-white/10 dark:text-white/70"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(() => {
                    const mc = data.budgetGuide.mealCosts[budgetTier];
                    return (
                      <div className="mt-4">
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          {[
                            {
                              icon: "🥐",
                              title: "Kahvaltı Ortalama",
                              tryVal: mc.breakfastTry,
                              eurVal: Math.round(mc.breakfastTry / Math.max(rates.EUR, 1)),
                              note: mc.breakfastDesc,
                            },
                            {
                              icon: "🍲",
                              title: "Öğle Yemeği Ortalama",
                              tryVal: mc.lunchTry,
                              eurVal: Math.round(mc.lunchTry / Math.max(rates.EUR, 1)),
                              note: mc.lunchDesc,
                            },
                            {
                              icon: "🍽️",
                              title: "Akşam Yemeği Ortalama",
                              tryVal: mc.dinnerTry,
                              eurVal: Math.round(mc.dinnerTry / Math.max(rates.EUR, 1)),
                              note: mc.dinnerDesc,
                            },
                            {
                              icon: "☕",
                              title: "Kahve & Tatlı Molası",
                              tryVal: mc.coffeeSnackTry,
                              eurVal: Math.round(mc.coffeeSnackTry / Math.max(rates.EUR, 1)),
                              note: mc.coffeeSnackDesc,
                            },
                          ].map((item, i) => (
                            <div
                              key={i}
                              className="rounded-2xl border border-black/5 bg-black/[0.02] p-3.5 dark:border-white/5 dark:bg-white/[0.02]"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-black/60 dark:text-white/60">
                                  {item.icon} {item.title}
                                </span>
                                <span className="rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-600 dark:text-brand-300">
                                  ~{item.eurVal} €
                                </span>
                              </div>
                              <div className="mt-1.5 text-lg font-black text-black dark:text-white">
                                {fmtCur(item.tryVal, cur, rates)}
                                <span className="ml-1 text-[11px] font-normal opacity-60">/ kişi</span>
                              </div>
                              <p className="mt-1 text-[11px] text-black/60 dark:text-white/60 leading-snug">
                                {item.note}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-brand-500/10 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-xs">
                            <span className="font-bold text-brand-700 dark:text-brand-300">
                              📊 Seçili ({budgetTier.toUpperCase()}) Günlük Kişi Başı Yeme-İçme Toplamı:
                            </span>{" "}
                            <b className="text-sm">{fmtCur(mc.dailyTotalTry, cur, rates)}</b> (~{Math.round(mc.dailyTotalTry / Math.max(rates.EUR, 1))} € / gün) ·{" "}
                            <span className="opacity-75">
                              {input.travelers} kişi {nights + 1} gün toplamı:{" "}
                              <b>{fmtCur(mc.dailyTotalTry * input.travelers * (nights + 1), cur, rates)}</b>
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white">
                            <Check className="h-3 w-3" /> Bütçe Hesabında Aktif
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* 2. RESTORAN ÖNERİLERİ & ORTALAMA FİYATLAR (3 Bütçeye Göre Filtrelenebilir) */}
              {data.restaurants && data.restaurants.length > 0 && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-xl font-bold">
                        🍽️ {city.name} Önerilen Restoranlar & Güncel Ortalama Fiyatlar
                      </h3>
                      <p className="text-xs text-black/55 dark:text-white/55">
                        3 farklı bütçe seviyesine göre doğrulanmış yerel lokantalar, geleneksel restoranlar ve şef mekanları
                      </p>
                    </div>

                    {/* Bütçe Seviyesi Filtresi */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: "all", label: `Tümü (${data.restaurants.length})` },
                        { id: "tasarruflu", label: "💚 Tasarruflu" },
                        { id: "dengeli", label: "💙 Dengeli" },
                        { id: "konforlu", label: "💜 Konforlu" },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setRestTierFilter(f.id as "all" | Comfort)}
                          className={`chip ${restTierFilter === f.id ? "chip-on font-semibold" : ""}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {data.restaurants
                      .filter((r) => restTierFilter === "all" || r.tier === restTierFilter)
                      .map((r) => {
                        const tierBadge =
                          r.tier === "tasarruflu"
                            ? { label: "💚 Tasarruflu · Sokak & Esnaf", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" }
                            : r.tier === "dengeli"
                            ? { label: "💙 Dengeli · Geleneksel Restoran", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30" }
                            : { label: "💜 Konforlu · Gurme & Şef Mekanı", cls: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30" };

                        const categoryLabel =
                          r.category === "sokak-lezzeti"
                            ? " Sokak Lezzeti & Hızlı Öğün"
                            : r.category === "kafe-tatli"
                            ? "☕ Kafe & Tatlı"
                            : r.category === "gurme"
                            ? "🍷 Gurme Akşam Yemeği"
                            : "🍲 Yerel Lokanta (Öğle/Akşam)";

                        return (
                          <div
                            key={r.id}
                            className="card flex flex-col justify-between p-5 transition hover:border-brand-400 hover:shadow-md"
                          >
                            <div>
                              {/* Üst Rozetler */}
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${tierBadge.cls}`}>
                                  {tierBadge.label}
                                </span>
                                <span className="rounded-md bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-black/60 dark:bg-white/10 dark:text-white/60">
                                  {categoryLabel}
                                </span>
                              </div>

                              {/* İsim, Mutfak ve Mahalle */}
                              <div className="mt-3 flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="text-lg font-extrabold text-black dark:text-white">{r.name}</h4>
                                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-black/60 dark:text-white/60">
                                    <span className="font-semibold text-brand-600 dark:text-brand-400">{r.cuisine}</span>
                                    <span>·</span>
                                    <span>📍 {r.neighborhood}</span>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className="text-[10px] text-black/50 dark:text-white/50">Ortalama Kişi Başı</div>
                                  <div className="text-xl font-black text-gradient">
                                    {fmtCur(r.avgPricePerPersonTry, cur, rates)}
                                  </div>
                                  <div className="text-[10px] font-semibold text-black/45 dark:text-white/45">
                                    ~{r.avgPricePerPersonEur} € / kişi
                                  </div>
                                </div>
                              </div>

                              {/* Puan & Yorum */}
                              <div className="mt-2 flex items-center gap-2 text-xs">
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 font-bold text-amber-600 dark:text-amber-400">
                                  {r.rating > 0 ? `★ ${r.rating} / 5` : "Yemek bölgesi önerisi"}
                                </span>
                                <span className="text-black/50 dark:text-white/50">
                                  {r.reviews > 0 ? `(${r.reviews.toLocaleString(locale)} yorum)` : "İşletme yorumu doğrulanmadı"}
                                </span>
                              </div>

                              {/* Meşhur Spesiyal & Yerel İpucu */}
                              <div className="mt-3 space-y-2 rounded-2xl bg-black/[0.025] p-3 text-xs dark:bg-white/[0.03]">
                                <div>
                                  <span className="font-bold text-black dark:text-white">🔥 Mutlaka Dene: </span>
                                  <span className="text-black/80 dark:text-white/80 font-medium">{r.signatureDish}</span>
                                </div>
                                <div>
                                  <span className="font-bold text-brand-600 dark:text-brand-400">💡 Yerel İpucu: </span>
                                  <span className="text-black/70 dark:text-white/70">{r.tip}</span>
                                </div>
                              </div>
                            </div>

                            {/* Alt Butonlar: Harita, Rotaya Ekle, Google Maps, TripAdvisor */}
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-3 dark:border-white/5">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setMapFocus([r.lat, r.lon]);
                                    const mapEl = document.getElementById("live-map-card");
                                    if (mapEl && window.innerWidth < 1024) {
                                      mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg bg-brand-500/10 px-2.5 py-1 text-[11px] font-semibold text-brand-600 hover:bg-brand-500/20 dark:text-brand-300"
                                >
                                  <MapPin className="h-3 w-3" /> Haritada Gör
                                </button>

                                <a
                                  href={r.googleMapsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                                >
                                  <ExternalLink className="h-3 w-3" /> Google Maps
                                </a>

                                {r.tripadvisorUrl && (
                                  <a
                                    href={r.tripadvisorUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:bg-amber-500/20 dark:text-amber-400"
                                  >
                                    <ExternalLink className="h-3 w-3" /> Yorumlar
                                  </a>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleAddRestaurantToDay(r)}
                                className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-brand-600 to-fuchsia-500 px-3 py-1 text-[11px] font-bold text-white shadow-sm hover:opacity-95"
                              >
                                <Plus className="h-3 w-3" /> Gün {activeDay} Rotasına Ekle
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* 3. ŞEHRİN MEŞHUR YÖRESEL LEZZETLERİ & SOKAK FİYATLARI */}
              {data.budgetGuide?.localDishesToTry && data.budgetGuide.localDishesToTry.length > 0 && (
                <div className="card p-5 sm:p-6">
                  <h3 className="text-lg font-bold">
                    🥘 {city.name} Mutfağında Mutlaka Tadılması Gereken Yöresel Lezzetler & Fiyatları
                  </h3>
                  <p className="mt-0.5 text-xs text-black/55 dark:text-white/55">
                    Turistik restoranlarda fazla ödememek için yerel piyasa ortalama porsiyon fiyatlarını referans alın
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {data.budgetGuide.localDishesToTry.map((dish, idx) => (
                      <div
                        key={idx}
                        className="flex flex-col justify-between rounded-2xl border border-black/5 bg-black/[0.02] p-3.5 dark:border-white/5 dark:bg-white/[0.02]"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-sm text-black dark:text-white">{dish.name}</h4>
                            <span className="shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                              {fmtCur(dish.avgTry, cur, rates)}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs text-black/65 dark:text-white/65 leading-snug">
                            {dish.desc}
                          </p>
                        </div>
                        <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 text-[10px] font-semibold text-black/45 dark:text-white/45">
                          Ortalama Porsiyon: ~{dish.avgEur} €
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 4. YEREL PAZARLAR, KAFELER & HARİTA NOKTALARI */}
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-bold">🧺 Yerel Pazarlar, Uygun Kafeler & Sokak Noktaları</h3>
                    <p className="text-xs text-black/55 dark:text-white/55">
                      OpenStreetMap / Google verileriyle taranan uygun fiyatlı yerel noktalar
                    </p>
                  </div>
                </div>

                {/* Filtre Butonları */}
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: "all", label: "Hepsi" },
                    { id: "yemek", label: "🍜 Sokak Lezzetleri / Lokantalar" },
                    { id: "kafe", label: "☕ Uygun Kafeler" },
                    { id: "pazar", label: "🧺 Yerel Pazarlar" },
                    { id: "alisveris", label: "🛍️ İkinci El & Outlet" },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setCheapFilter(f.id)}
                      className={`chip ${cheapFilter === f.id ? "chip-on font-semibold" : ""}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {cheapLoading && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="skeleton h-24" />
                    ))}
                  </div>
                )}

                {!cheapLoading && cheapPlaces.length === 0 && (
                  <div className="card p-8 text-center text-sm text-black/50 dark:text-white/50">
                    Bu şehir için harita veritabanından ek pazar noktası bulunamadı.
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-2">
                  {cheapPlaces
                    .filter((p) => cheapFilter === "all" || p.category === cheapFilter)
                    .map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          setMapFocus([p.lat, p.lon]);
                          const mapEl = document.getElementById("live-map-card");
                          if (mapEl && window.innerWidth < 1024) {
                            mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
                          }
                        }}
                        className="card cursor-pointer p-4 transition hover:border-emerald-500 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              {p.category}
                            </span>
                            <h4 className="font-bold">{p.name}</h4>
                            {p.detail && <p className="mt-1 text-xs text-black/60 dark:text-white/60">{p.detail}</p>}
                          </div>
                          <button className="btn-ghost !p-1 text-emerald-600">
                            <MapPin className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* SEKME 5: CANLI SEYAHAT CÜZDANI, 3 BÜTÇE REHBERİ & HARCAMA DÖKÜMÜ */}
          {activeTab === "butce" && (
            <div className="space-y-6">
              {/* 0. CANLI SEYAHAT CÜZDANI (PLANLANAN VS GERÇEKLEŞEN HARCAMA TAKİBİ) */}
              <LiveTravelWallet
                data={displayData}
                cur={cur}
                budgetTier={budgetTier}
                plannedPocketTry={budget.food + budget.transport + budget.activities}
                travelers={input.travelers}
              />

              {/* 1. HER KONUDA 3 BÜTÇEYE GÖRE AKILLI ÖNERİLER (6 KATEGORİ) */}
              {data.budgetGuide && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-bold">
                        💡 {city.name} İçin 3 Bütçeye Göre Kapsamlı Seyahat & Harcama Rehberi
                      </h2>
                      <p className="text-xs text-black/55 dark:text-white/55">
                        Ulaşımdan konaklamaya, yeme-içmeden müzelere ve alışverişe kadar her konuda bütçenize özel stratejiler
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    {data.budgetGuide.categoryAdvice.map((cat) => (
                      <div key={cat.category} className="card p-5 transition hover:border-brand-400">
                        <div className="flex items-center gap-2 border-b border-black/5 pb-3 dark:border-white/5">
                          <span className="text-xl">{cat.icon}</span>
                          <h3 className="text-base font-extrabold">{cat.title}</h3>
                        </div>

                        <div className="mt-4 grid gap-3 sm:grid-cols-3">
                          <div
                            onClick={() => applyBudgetTierPackage("tasarruflu")}
                            className={`cursor-pointer rounded-2xl border p-3.5 text-xs transition ${
                              budgetTier === "tasarruflu"
                                ? "border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/25"
                                : "border-black/5 bg-black/[0.02] hover:border-emerald-400 dark:border-white/5 dark:bg-white/[0.02]"
                            }`}
                          >
                            <div className="flex items-center justify-between font-extrabold text-emerald-700 dark:text-emerald-400">
                              <span>💚 Tasarruflu Seçenek</span>
                              {budgetTier === "tasarruflu" && <span className="text-[10px]">Seçili ✓</span>}
                            </div>
                            <p className="mt-1.5 text-black/75 dark:text-white/75 leading-relaxed">{cat.tasarruflu}</p>
                          </div>

                          <div
                            onClick={() => applyBudgetTierPackage("dengeli")}
                            className={`cursor-pointer rounded-2xl border p-3.5 text-xs transition ${
                              budgetTier === "dengeli"
                                ? "border-sky-500 bg-sky-500/10 ring-2 ring-sky-500/25"
                                : "border-black/5 bg-black/[0.02] hover:border-sky-400 dark:border-white/5 dark:bg-white/[0.02]"
                            }`}
                          >
                            <div className="flex items-center justify-between font-extrabold text-sky-700 dark:text-sky-400">
                              <span>💙 Dengeli Seçenek</span>
                              {budgetTier === "dengeli" && <span className="text-[10px]">Seçili ✓</span>}
                            </div>
                            <p className="mt-1.5 text-black/75 dark:text-white/75 leading-relaxed">{cat.dengeli}</p>
                          </div>

                          <div
                            onClick={() => applyBudgetTierPackage("konforlu")}
                            className={`cursor-pointer rounded-2xl border p-3.5 text-xs transition ${
                              budgetTier === "konforlu"
                                ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/25"
                                : "border-black/5 bg-black/[0.02] hover:border-purple-400 dark:border-white/5 dark:bg-white/[0.02]"
                            }`}
                          >
                            <div className="flex items-center justify-between font-extrabold text-purple-700 dark:text-purple-400">
                              <span>💜 Konforlu Seçenek</span>
                              {budgetTier === "konforlu" && <span className="text-[10px]">Seçili ✓</span>}
                            </div>
                            <p className="mt-1.5 text-black/75 dark:text-white/75 leading-relaxed">{cat.konforlu}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-500/10 px-3.5 py-2.5 text-xs text-amber-900 dark:text-amber-200">
                          <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                          <div>
                            <span className="font-bold">Ekstra Uzman Önerisi: </span>
                            <span>{cat.extraTip}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. TURİST TUZAKLARI & DİKKAT EDİLMESİ GEREKENLER */}
              {data.budgetGuide?.touristTrapsToAvoid && data.budgetGuide.touristTrapsToAvoid.length > 0 && (
                <div className="card border-rose-500/30 bg-rose-500/[0.03] p-6">
                  <h3 className="flex items-center gap-2 text-base font-extrabold text-rose-600 dark:text-rose-400">
                    ⚠️ {city.name} Seyahatinde Kaçınılması Gereken Turist Tuzakları
                  </h3>
                  <ul className="mt-3 space-y-2.5 text-xs sm:text-sm text-black/75 dark:text-white/75">
                    {data.budgetGuide.touristTrapsToAvoid.map((trap, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <span className="mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-rose-500/20 text-[10px] font-bold text-rose-600 dark:text-rose-300">
                          !
                        </span>
                        <span>{trap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 3. DETAYLI HARCAMA DAĞILIMI */}
              <div className="card p-6">
                <h2 className="text-xl font-bold">Detaylı Harcama Dağılımı ({budgetTier.toUpperCase()} Mod)</h2>
                <p className="mt-1 text-xs text-black/55 dark:text-white/55">
                  Tüm hesaplamalar toplam {input.travelers} yolcu ve {nights} gece içindir.
                </p>

                <div className="mt-6 space-y-4">
                  {[
                    {
                      label: "✈️ Gidiş-Dönüş Uçuşlar",
                      val: budget.flight,
                      desc: `${selectedFlight?.airline || "Uçuş"} · Tam gidiş-dönüş · Kişi başı ${fmtCur((budget.flight / input.travelers) || 0, cur, rates)} (${input.travelers} yolcu)`,
                      color: "#7c4dff",
                    },
                    {
                      label: "🏨 Konaklama",
                      val: budget.hotel,
                      desc: `${selectedHotel?.name || "Otel"} · ${nights} gece x ${data.rooms} oda`,
                      color: "#d946ef",
                    },
                    {
                      label: "🍽️ Yemek & İçme",
                      val: budget.food,
                      desc: `Günlük kişi başı ≈ ${fmtCur(activeDailyFoodTry, cur, rates)} (${input.travelers} kişi, ${nights + 1} gün)`,
                      color: "#14c8c8",
                    },
                    {
                      label: "🚇 Şehir İçi Ulaşım & Transfer",
                      val: budget.transport,
                      desc: `Havalimanı transferi + günlük toplu taşıma (${fmtCur(data.dailyTransportTry, cur, rates)}/gün)`,
                      color: "#f59e0b",
                    },
                    {
                      label: "🎟️ Gezi, Müze & Eklenen Restoranlar",
                      val: budget.activities,
                      desc: `Müze biletleri, turlar ve rotaya eklediğiniz mekanlar`,
                      color: "#22c55e",
                    },
                  ].map((it) => (
                    <div key={it.label} className="border-b border-black/5 pb-3 last:border-0 dark:border-white/5">
                      <div className="flex items-center justify-between font-bold">
                        <span>{it.label}</span>
                        <span>{fmtCur(it.val, cur, rates)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-black/50 dark:text-white/50">
                        <span>{it.desc}</span>
                        <span>%{Math.round((it.val / Math.max(budget.total, 1)) * 100)}</span>
                      </div>
                    </div>
                  ))}

                  <div className="flex items-center justify-between rounded-2xl bg-black/[0.04] p-4 text-lg font-extrabold dark:bg-white/[0.04]">
                    <span>Toplam Harcama</span>
                    <span className="text-gradient">{fmtCur(budget.total, cur, rates)}</span>
                  </div>
                </div>

                {/* Gerçek karşı teklif olmadan tasarruf tutarı hesaplanmaz. */}
                {(() => {
                  return (
                    <div className="mt-5 rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.08] via-emerald-500/[0.03] to-transparent p-5 shadow-lg shadow-emerald-500/5">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                          <Sparkles className="h-3.5 w-3.5" /> Fiyat Karşılaştırması
                        </span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          Aynı koşullarda teklif gerekir
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-3">
                        <div className="rounded-2xl border border-black/5 bg-white/80 p-3 dark:border-white/5 dark:bg-white/5">
                          <div className="text-[11px] font-semibold text-black/50 dark:text-white/50">Tur Acentesi Bedeli</div>
                          <div className="mt-1 text-base font-bold text-rose-500">
                            Teklif yok
                          </div>
                          <div className="text-[10px] text-black/40 dark:text-white/40 mt-0.5">Karşılaştırma bedeli alınmadı</div>
                        </div>

                        <div className="rounded-2xl border border-brand-500/20 bg-brand-500/[0.06] p-3">
                          <div className="text-[11px] font-semibold text-brand-700 dark:text-brand-300">Rotazur Plan Bütçesi</div>
                          <div className="mt-1 text-base font-black text-brand-600 dark:text-brand-400">
                            {fmtCur(budget.total, cur, rates)}
                          </div>
                          <div className="text-[10px] text-black/50 dark:text-white/50 mt-0.5">Fiyat ve tahminlerin toplamı</div>
                        </div>

                        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/15 p-3">
                          <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300">Tasarruf Farkı</div>
                          <div className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400">
                            Hesaplanmadı
                          </div>
                          <div className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">Doğrulanmış karşı teklif gerekli</div>
                        </div>
                      </div>

                      <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed">
                        💡 Otel ve uçuş tekliflerini aynı tarih, kişi, oda, bagaj, vergi ve iptal koşullarıyla karşılaştırın. Bu plan bütçesi kesin rezervasyon bedeli veya tasarruf garantisi değildir.
                      </p>
                    </div>
                  );
                })()}
              </div>

              {/* Yerel Bütçe İpuçları */}
              {tips && tips.length > 0 && (
                <div className="card p-6">
                  <h3 className="font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-500" /> {city.name} İçin Tasarruf İpuçları
                  </h3>
                  <ul className="mt-4 space-y-2.5 text-sm text-black/70 dark:text-white/70">
                    {tips.map((t, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* SEKME 6: SESLİ KONUŞMA KARTLARI, HAVALİMANI TRANSFER, HEDİYELİK & TAX-FREE, FOTOĞRAF NOKTALARI */}
          {activeTab === "kesif" && (
            <CityDiscoveryHub
              data={displayData}
              cur={cur}
              budgetTier={budgetTier}
              travelers={input.travelers}
              activeDay={activeDay}
              onFocusMap={handleFocusMap}
              onAddPhotoSpotToDay={handleAddPhotoSpotToDay}
            />
          )}

          {/* SEKME 7: KUR ÇEVİRİCİ, MÜZE KARTI (CITY PASS), eSIM & SEYAHAT ÖNCESİ HAZIRLIK */}
          {activeTab === "araclar" && (
            <SmartTravelTools
              data={displayData}
              cur={cur}
              startDate={input.startDate}
              travelers={input.travelers}
            />
          )}
        </div>

        {/* SAĞ KOLON: Canlı Harita & Bütçe Kartı (Sticky) */}
        <div className="space-y-6 lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:overflow-y-auto scroll-thin">
          {/* Canlı Harita Kartı */}
          <div id="live-map-card" className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-black/5 p-4 dark:border-white/5">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                <MapPin className="h-4 w-4" /> Canlı Rota Haritası
              </span>
              <span className="text-xs text-black/50 dark:text-white/50">
                {activeTab === "rota" ? `Gün ${activeDay}` : activeTab.toUpperCase()}
              </span>
            </div>
            <div className="relative h-84 min-h-[340px] w-full">
              <MapView
                center={[city.lat, city.lon]}
                markers={markers}
                route={routeCoords}
                focus={mapFocus}
                primaryMarkerId={selectedHotel ? hotelMarkerId(selectedHotel) : undefined}
                onMarkerSelect={(id) => {
                  const hotel = data.hotels.find((item) => hotelMarkerId(item) === id);
                  const point = hotelCoordinates(hotel);
                  if (hotel && point) { setSelectedHotel(hotel); setMapFocus([point.lat, point.lon]); }
                }}
              />
              {activeTab === "oteller" && !hotelCoordinates(selectedHotel) && <div role="status" className="absolute bottom-10 left-3 right-3 z-[450] rounded-xl bg-white/95 p-2 text-[11px] text-black/70 shadow dark:bg-[#0f0e1c]/95 dark:text-white/70">Seçili otelin konumu doğrulanmadı; şehir haritası gösteriliyor.</div>}
            </div>
            <div className="p-3 text-[11px] text-black/50 dark:text-white/50 flex items-center justify-between">
              <span>{activeTab === "oteller" ? `🌸 Booking GPS kaydı bulunan ${markers.filter((marker) => marker.id.startsWith("hotel:")).length}/${data.hotels.length} tesis · H: seçili otel` : "🟣 Gezilecek Noktalar · 🌸 Otel · 🟢 Ucuz Mekân"}</span>
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="hover:underline">© OpenStreetMap contributors</a>
            </div>
          </div>

          {/* Dinamik Bütçe Özeti */}
          <div className="card p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                Bütçe Özeti & Durum
              </h3>
              <button
                type="button"
                onClick={() => setSplitOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg bg-brand-500/10 px-2.5 py-1 text-[11px] font-bold text-brand-600 hover:bg-brand-500/20 dark:text-brand-300"
              >
                <Users className="h-3.5 w-3.5" /> Grup Kasası
              </button>
            </div>
            <div className="mt-4 flex justify-center">
              <BudgetDonut b={budget} budget={input.budget} size={210} />
            </div>

            {/* Bütçe Sağlık Çubuğu */}
            <div className="mt-6">
              <div className="flex justify-between text-xs font-semibold">
                <span>Kullanılan Bütçe</span>
                <span>%{Math.round((budget.total / input.budget) * 100)}</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min((budget.total / input.budget) * 100, 100)}%` }}
                  className={`h-full ${budget.remaining < 0 ? "bg-rose-500" : "bg-emerald-500"}`}
                />
              </div>
              <p className="mt-2 text-xs text-black/50 dark:text-white/50">
                {budget.remaining >= 0
                  ? `Harika! Bütçenden ${tl(budget.remaining)} fazladan kaldı.`
                  : `Dikkat: Bütçenizi ${tl(Math.abs(budget.remaining))} aştınız. Otel veya uçuşu değiştirmeyi deneyebilirsiniz.`}
              </p>

              {/* Hızlı Kalem Dağılımı */}
              <div className="mt-4 space-y-2 border-t border-black/5 pt-3 text-xs dark:border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-black/60 dark:text-white/60">✈️ Gidiş-Dönüş Uçuş:</span>
                  <span className="font-bold">{fmtCur(budget.flight, cur, rates)} <span className="font-normal text-[11px] opacity-70">({input.travelers} kişi)</span></span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-black/60 dark:text-white/60">🏨 Konaklama ({nights} Gece):</span>
                  <span className="font-bold">{fmtCur(budget.hotel, cur, rates)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-black/60 dark:text-white/60">🍽️ Yemek ({nights + 1} Gün):</span>
                  <span className="font-bold">{fmtCur(budget.food, cur, rates)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-black/60 dark:text-white/60">🚇 Ulaşım & Gezi:</span>
                  <span className="font-bold">{fmtCur(budget.transport + budget.activities, cur, rates)}</span>
                </div>
              </div>

              {/* Karşılaştırılabilir teklif yoksa kazanç iddiası gösterilmez. */}
              {(() => {
                return (
                  <div className="mt-4 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                        <Sparkles className="h-3.5 w-3.5" /> Fiyat Karşılaştırması:
                      </span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        Teklif gerekli
                      </span>
                    </div>
                    <div className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80 mt-1">
                      Aynı koşullarda karşı teklif olmadan tasarruf hesaplanmaz.
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Şehir Rehberi & Pratik Bilgiler Kartı */}
          <div className="card p-6">
            <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
              <Compass className="h-4 w-4 text-brand-500" /> {city.name} Pratik Şehir Rehberi
            </h3>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex items-start gap-3 rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.03]">
                <span className="text-base">🛂</span>
                <div>
                  <div className="font-bold">Vize Bilgisi</div>
                  <div className="text-black/60 dark:text-white/60">{city.visa}</div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.03]">
                <span className="text-base">💱</span>
                <div>
                  <div className="font-bold">Para Birimi & Ödeme</div>
                  <div className="text-black/60 dark:text-white/60">
                    Yerel Para: <b>{city.currencyCode || "EUR"}</b> · Temassız kart ve Apple/Google Pay yaygındır. Küçük yerel mekanlar ve bahşiş için yanınızda nakit bulundurmanız önerilir.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.03]">
                <span className="text-base">🚨</span>
                <div>
                  <div className="font-bold">Acil Yardım Hattı</div>
                  <div className="text-black/60 dark:text-white/60">
                    Yerel acil yardım numaraları: <b>{city.emergencyPhone || "Yerel resmî kaynaktan doğrulayın"}</b>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.03]">
                <span className="text-base">🔌</span>
                <div>
                  <div className="font-bold">Priz ve Voltaj</div>
                  <div className="text-black/60 dark:text-white/60">
                    {translate(connectivity.plug.types)} · {connectivity.plug.voltage}. {translate(connectivity.plug.detail)}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-black/[0.03] p-3 dark:bg-white/[0.03]">
                <span className="text-base">🚰</span>
                <div>
                  <div className="font-bold">İçme Suyu & Çeşmeler</div>
                  <div className="text-black/60 dark:text-white/60">
                    {translate(connectivity.tapWater.statusLabel)}. {translate(connectivity.tapWater.detail)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fiyat Alarmı Modalı */}
      {city && (
        <PriceAlertModal
          origin={input.origin}
          isOpen={alertOpen}
          onClose={() => setAlertOpen(false)}
          cityId={city.id}
          cityName={city.name}
          currentPrice={budget.total}
        />
      )}

      {/* Akıllı Bavul Hazırlama Modalı */}
      {city && (
        <PackingListModal
          isOpen={packingOpen}
          onClose={() => setPackingOpen(false)}
          city={city}
          startDate={input.startDate}
          input={input}
        />
      )}

      {/* Grup Harcama & Masraf Bölüşme Modalı */}
      {city && (
        <ExpenseSplitterModal
          isOpen={splitOpen}
          onClose={() => setSplitOpen(false)}
          cityId={city.id}
          cityName={city.name}
          travelersCount={input.travelers}
          tripKey={tripScope(input)}
          activityTotalTry={budget.activities}
          rates={rates}
          flightTotalTry={budget.flight}
          hotelTotalTry={budget.hotel}
          foodTotalTry={budget.food}
          transportTotalTry={budget.transport}
        />
      )}

      {/* Gmail Cep Rehberi Gönderme & WhatsApp Paylaşım Modalı */}
      {city && (
        <SharePlanModal
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          data={displayData}
          input={input}
          budgetTier={budgetTier}
          totalTry={budget.total}
          selectedFlight={selectedFlight}
          selectedHotel={selectedHotel}
          onOpenPdfGuide={() => setPdfModalOpen(true)}
        />
      )}

      {/* Resmi Seyahat Rehberi (PDF & Yazdır) Modalı */}
      {city && (
        <TravelGuidePdfModal
          isOpen={pdfModalOpen}
          onClose={() => setPdfModalOpen(false)}
          data={displayData}
          input={input}
          budgetTier={budgetTier}
          totalTry={budget.total}
          selectedFlight={selectedFlight || undefined}
          selectedHotel={selectedHotel || undefined}
          cur={cur}
          rates={rates}
        />
      )}

      {/* İnternetsiz Seyahat Modu (Çevrimdışı Rota) Modalı */}
      {city && (
        <OfflinePlanModal
          isOpen={offlineModalOpen}
          onSave={handleSaveOffline}
          offlineReady={!!plans.find((p) => p.id === savedId.current)?.offlineReadyAt}
          onClose={() => setOfflineModalOpen(false)}
          data={displayData}
          input={input}
          selectedFlight={selectedFlight || undefined}
          selectedHotel={selectedHotel || undefined}
        />
      )}

      {/* Şehir Karşılaştırma Modalı */}
      {city && (
        <CityCompareModal
          isOpen={compareOpen}
          onClose={() => setCompareOpen(false)}
          initialCities={[
            city.id,
            city.id === "belgrad" ? "saraybosna" : "belgrad",
            city.id === "roma" ? "budapeste" : "roma",
          ]}
          baseInput={{ ...input, comfort: budgetTier }}
        />
      )}

      {/* Google Haritalar Rota & Navigasyon Modalı */}
      {city && (
        <GoogleMapsRouteModal
          isOpen={mapsModalOpen}
          onClose={() => setMapsModalOpen(false)}
          cityName={city.name}
          dayNumber={activeDay}
          dayTitle={data.days.find((d) => d.day === activeDay)?.title || `Gün ${activeDay}`}
          hotel={selectedHotel}
          activities={mergeDayActivities(data.days.find((d) => d.day === activeDay)?.activities || [], customActs[activeDay])}
        />
      )}

      {/* Instagram Story & Reels Gezi Kartı Modalı */}
      {city && (
        <StoryCardModal
          isOpen={storyModalOpen}
          onClose={() => setStoryModalOpen(false)}
          data={displayData}
          input={input}
          totalTry={budget.total}
          budgetTier={budgetTier}
          selectedFlight={selectedFlight}
          selectedHotel={selectedHotel}
        />
      )}

      {/* Kayıtlı Fiyat Alarmları Yönetim Modalı */}
      <PriceAlertsManagerModal
        isOpen={alertsManagerOpen}
        onClose={() => setAlertsManagerOpen(false)}
        onOpenCreateModal={() => setAlertOpen(true)}
      />

      {/* Canlı Şehir & Bütçe Rehber Asistanı (Sağ Alt Yüzen Widget) */}
      <CityAssistantWidget data={displayData} budgetTier={budgetTier} />
    </main></Localize>
  );
}
