"use client";

import { Localize } from "@/components/Localize";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Copy,
  ExternalLink,
  Footprints,
  MapPin,
  Navigation,
  QrCode,
  Smartphone,
  Train,
  X,
} from "lucide-react";
import {
  buildGoogleMapsRouteSegments,
  distinctNavigationStops,
  calculateTotalDistance,
  haversineDistance,
} from "@/lib/route-optimizer";
import type { HotelOption, PlanActivity } from "@/lib/types";
import { hasCoordinates } from "@/lib/travel-utils";
import { copyText } from "@/lib/clipboard";
import { hotelCoordinates, hotelNavigationActivities } from "@/lib/hotel-data";

interface GoogleMapsRouteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityName: string;
  dayNumber: number;
  dayTitle: string;
  hotel: HotelOption | null;
  activities: PlanActivity[];
}

export function GoogleMapsRouteModal({
  isOpen,
  onClose,
  cityName,
  dayNumber,
  dayTitle,
  hotel,
  activities,
}: GoogleMapsRouteModalProps) {
  const [travelMode, setTravelMode] = useState<"walking" | "transit" | "driving">("walking");
  const [startFromHotel, setStartFromHotel] = useState(true);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [partIndex, setPartIndex] = useState(0);
  const currentLink = useRef("");
  const copyRevision = useRef(0);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routeHotel = startFromHotel && hotelCoordinates(hotel) ? hotel : null;

  // Koordinatı olan duraklar
  const validActivities = useMemo(
    () => distinctNavigationStops(hotelNavigationActivities(activities, hotel), routeHotel),
    [activities, routeHotel, hotel]
  );

  const origin = useMemo(() => {
    if (routeHotel) {
      return { lat: routeHotel.lat, lon: routeHotel.lon, name: routeHotel.name };
    }
    if (validActivities.length > 0) {
      return {
        lat: validActivities[0].lat!,
        lon: validActivities[0].lon!,
        name: validActivities[0].title,
      };
    }
    return undefined;
  }, [startFromHotel, hotel, validActivities]);

  const segments = useMemo(() => {
    return buildGoogleMapsRouteSegments({
      origin,
      waypoints: validActivities,
      travelMode,
      cityName,
    });
  }, [origin, validActivities, travelMode, cityName]);
  const routeIdentity = segments.map((segment) => segment.url).join("|");
  useEffect(() => { setPartIndex(0); }, [routeIdentity]);
  const part = segments[Math.min(partIndex, segments.length - 1)];
  const googleMapsUrl = part.url;
  currentLink.current = googleMapsUrl;
  useEffect(() => {
    copyRevision.current++;
    setCopied(false); setCopyError(null);
    return () => {
      copyRevision.current++;
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, [googleMapsUrl, isOpen]);

  // Toplam mesafe
  const totalKm = useMemo(() => {
    const km = calculateTotalDistance(validActivities, origin);
    return Math.round(km * 10) / 10;
  }, [validActivities, origin]);

  // Tahmini yürüme süresi (ortalama 4.5 km/s)
  const walkingTimeMin = Math.round((totalKm / 4.5) * 60);

  // QR Kod URL'si (Telefondan anında açmak için)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    googleMapsUrl
  )}&bgcolor=ffffff&color=111827&margin=6`;

  const copyRouteUrl = async () => {
    const revision = ++copyRevision.current;
    setCopyError(null);
    try {
      await copyText(googleMapsUrl);
      if (revision !== copyRevision.current || currentLink.current !== googleMapsUrl) return;
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      if (revision === copyRevision.current) { setCopied(false); setCopyError((err as Error).message); }
    }
  };

  if (!isOpen) return null;

  return (
    <Localize><AnimatePresence>
      <div role="dialog" aria-modal="true" aria-labelledby="navigation-title" className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="card relative max-h-[92vh] w-full max-w-2xl overflow-y-auto bg-white p-5 shadow-2xl dark:bg-[#11121d] sm:p-7"
        >
          {/* Kapat butonu */}
          <button
            onClick={onClose}
            aria-label="Navigasyon penceresini kapat"
            className="btn-ghost absolute right-4 top-4 !p-2 text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Başlık */}
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-sky-500 text-white shadow-lg shadow-emerald-500/25">
              <Navigation className="h-6 w-6" />
            </div>
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Canlı Navigasyon & Yol Tarifi
              </span>
              <h2 id="navigation-title" className="text-xl font-extrabold">
                🗺️ Gün {dayNumber} Rotasını Google Haritalar&apos;a Aktar
              </h2>
              <p className="text-xs text-black/55 dark:text-white/55">
                {cityName} · {dayTitle} · Toplam {validActivities.length + (routeHotel ? 1 : 0)} nokta
              </p>
            </div>
          </div>

          {/* Ulaşım Modu & Otelden Başlat Seçimi */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-y border-black/5 py-3 dark:border-white/5">
            <div className="flex items-center gap-1.5 rounded-xl bg-black/5 p-1 dark:bg-white/10">
              <button
                type="button"
                onClick={() => setTravelMode("walking")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  travelMode === "walking"
                    ? "bg-white text-emerald-600 shadow dark:bg-zinc-800 dark:text-emerald-400"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <Footprints className="h-3.5 w-3.5" /> Yürüyerek
              </button>
              <button
                type="button"
                onClick={() => setTravelMode("transit")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  travelMode === "transit"
                    ? "bg-white text-sky-600 shadow dark:bg-zinc-800 dark:text-sky-400"
                    : "opacity-70 hover:opacity-100"
                }`}
              >
                <Train className="h-3.5 w-3.5" /> Toplu Taşıma
              </button>
            </div>

            {hotel && hotelCoordinates(hotel) && (
              <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-black/75 dark:text-white/75">
                <input
                  type="checkbox"
                  checked={startFromHotel}
                  onChange={(e) => setStartFromHotel(e.target.checked)}
                  className="rounded border-black/20 text-brand-600 focus:ring-brand-500"
                />
                <span>Otelden Başlat ({hotel.name.slice(0, 20)}...)</span>
              </label>
            )}
          </div>

          {/* Rota İstatistikleri Özeti */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-3 text-center dark:border-white/10 dark:bg-white/[0.02]">
              <div className="text-[11px] opacity-60">Kuş Uçuşu Mesafe</div>
              <div className="text-lg font-black text-gradient">~{totalKm} km</div>
            </div>
            <div className="rounded-2xl border border-black/10 bg-black/[0.02] p-3 text-center dark:border-white/10 dark:bg-white/[0.02]">
              <div className="text-[11px] opacity-60">Tahmini Yürüme Süresi</div>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                ~{walkingTimeMin} dk
              </div>
            </div>
            <div className="col-span-2 rounded-2xl border border-black/10 bg-black/[0.02] p-3 text-center dark:border-white/10 dark:bg-white/[0.02] sm:col-span-1">
              <div className="text-[11px] opacity-60">Durak Sayısı</div>
              <div className="text-lg font-black">
                {validActivities.length + (routeHotel ? 1 : 0)} Nokta
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-5 sm:grid-cols-[1.2fr_1fr]">
            {/* Sol: Durak Durak Güzergah Listesi */}
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-black/60 dark:text-white/60">
                🚩 Sıralı Güzergah Listesi
              </div>

              <div className="mt-2.5 max-h-60 space-y-2 overflow-y-auto pr-1 scroll-thin">
                {routeHotel && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-purple-500/20 bg-purple-500/[0.04] p-2.5 text-xs">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-purple-500 text-[10px] font-black text-white">
                      H
                    </span>
                    <div>
                      <div className="font-extrabold text-purple-700 dark:text-purple-300">
                        🏨 Başlangıç: {routeHotel.name}
                      </div>
                      <div className="text-[11px] opacity-60">Konaklama Oteli</div>
                    </div>
                  </div>
                )}

                {validActivities.map((act, idx) => {
                  const prevCoords =
                    idx === 0
                      ? routeHotel
                        ? { lat: routeHotel.lat, lon: routeHotel.lon }
                        : null
                      : { lat: validActivities[idx - 1].lat!, lon: validActivities[idx - 1].lon! };

                  const segKm =
                    hasCoordinates(prevCoords) && hasCoordinates(act)
                      ? Math.round(
                          haversineDistance(prevCoords.lat, prevCoords.lon, act.lat, act.lon) * 10
                        ) / 10
                      : null;

                  return (
                    <div key={idx} className="relative">
                      {segKm !== null && (
                        <div className="ml-5 border-l-2 border-dashed border-black/15 py-1 pl-3 text-[10px] font-bold text-black/50 dark:border-white/15 dark:text-white/50">
                          🚶 ~{segKm} km kuş uçuşu (~{Math.round((segKm / 4.5) * 60)} dk)
                        </div>
                      )}
                      <div className="flex items-start gap-2.5 rounded-xl border border-black/5 bg-black/[0.015] p-2.5 text-xs dark:border-white/5 dark:bg-white/[0.02]">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-500 text-[10px] font-black text-white">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold">{act.title}</span>
                            <span className="text-[10px] opacity-60">{act.time}</span>
                          </div>
                          <p className="line-clamp-1 text-[11px] opacity-70">{act.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sağ: Telefondan Aç (QR Kod & Doğrudan Buton) */}
            <div className="flex flex-col items-center justify-between rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.03] p-4 text-center">
              <div>
                <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  <Smartphone className="h-4 w-4" /> Telefondan Aç (QR Kod)
                </div>
                <p className="mt-1 text-[11px] text-black/60 dark:text-white/60">
                  {segments.length > 1 ? "Rotanın her bölümünü sırayla açın. QR kodu ve bağlantı seçili bölümü gösterir." : "Telefonunun kamerasını okutarak rotayı Google Maps uygulamasında açabilirsin:"}
                </p>
                {segments.length > 1 && <div className="mt-3 flex flex-wrap justify-center gap-1.5" aria-label="Rota bölümleri">
                  {segments.map((segment, index) => <button key={segment.url + index} type="button" aria-pressed={index === Math.min(partIndex, segments.length - 1)} onClick={() => setPartIndex(index)} className={`rounded-lg px-2 py-1 text-xs font-bold ${index === Math.min(partIndex, segments.length - 1) ? "bg-emerald-500 text-white" : "bg-black/5 dark:bg-white/10"}`}>Bölüm {index + 1}</button>)}
                </div>}
                {segments.length > 1 && <p className="mt-2 text-[11px] font-semibold">{part.from} → {part.to}</p>}
              </div>

              {/* QR Kod Görseli */}
              <div className="my-3 rounded-2xl bg-white p-2.5 shadow-md dark:bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrUrl}
                  alt="Google Maps Rotası QR Kodu"
                  width={150}
                  height={150}
                  className="rounded-lg"
                />
              </div>

              <div className="w-full space-y-2">
                {copyError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{copyError}</p>}
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition hover:bg-emerald-600"
                >
                  <ExternalLink className="h-4 w-4" /> Google Haritalar&apos;da Aç
                </a>

                <button
                  type="button"
                  onClick={copyRouteUrl}
                  className="btn-ghost w-full justify-center rounded-xl border border-black/10 py-2 text-xs font-semibold dark:border-white/10"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" /> Rota Linki Kopyalandı ✓
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" /> Rota Linkini Kopyala
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence></Localize>
  );
}
