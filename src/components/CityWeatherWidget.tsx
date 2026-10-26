"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";
import { useLanguage } from "./LanguageContext";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CloudSun,
  Droplets,
  Wind,
  Calendar,
  Sparkles,
  Compass,
  Shirt,
  Info,
  RefreshCw,
  Sun,
  Umbrella,
} from "lucide-react";
import type { CityDailyWeather } from "@/lib/automation/weather-sync-engine";

interface CityWeatherWidgetProps {
  cityId: string;
  cityName: string;
  country?: string;
}

export function CityWeatherWidget({ cityId, cityName, country }: CityWeatherWidgetProps) {
  const { locale } = useLocaleFormat();
  const { translate } = useLanguage();
  const [data, setData] = useState<CityDailyWeather | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"forecast" | "seasons">("forecast");
  const request = useRef<AbortController | null>(null);

  const fetchWeather = useCallback(async (force = false) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    try {
      if (force) setRefreshing(true);
      else setLoading(true);

      const url = `/api/weather?city=${encodeURIComponent(cityId)}`;
      
      const res = await fetch(url, { signal: controller.signal });
      const json = await res.json();

      if (!controller.signal.aborted && res.ok && json.status === "ok" && json.city?.cityId === cityId) {
        setData(json.city);
      }
    } catch (err) {
      if (!controller.signal.aborted) console.error("Hava durumu yüklenemedi:", err);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [cityId]);

  useEffect(() => {
    setData(null);
    if (cityId) {
      fetchWeather();
    }
    return () => request.current?.abort();
  }, [cityId, fetchWeather]);

  if (loading) {
    return (
      <Localize><div className="card relative overflow-hidden p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-6 w-48 rounded-lg bg-black/10 dark:bg-white/10" />
          <div className="h-6 w-24 rounded-full bg-black/10 dark:bg-white/10" />
        </div>
        <div className="mt-6 flex items-center gap-6">
          <div className="h-16 w-16 rounded-2xl bg-black/10 dark:bg-white/10" />
          <div className="space-y-2">
            <div className="h-8 w-24 rounded-lg bg-black/10 dark:bg-white/10" />
            <div className="h-4 w-36 rounded-md bg-black/10 dark:bg-white/10" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-4 sm:grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-black/10 dark:bg-white/10" />
          ))}
        </div>
      </div></Localize>
    );
  }

  if (!data) return null;

  const current = data.current;
  const guide = data.climateGuide;
  const todayForecast = data.forecast?.[0];

  return (
    <Localize><div className="card relative overflow-hidden border border-black/10 bg-white/70 p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-[#0f0e1c]/80 sm:p-7">
      {/* Aurora arkaplan parıltısı */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-to-br from-amber-400/10 via-sky-400/10 to-indigo-500/10 blur-3xl" />

      {/* Üst Başlık & Kontroller */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 pb-4 dark:border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-400 to-sky-500 text-white shadow-md shadow-amber-500/20">
            <CloudSun className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold tracking-tight text-black dark:text-white sm:text-lg">
                {cityName} Hava Tahmini & Gezi Zamanı
              </h3>
              <span className="hidden rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 sm:inline-block">
                ● MET Norway Tahmini
              </span>
            </div>
            <p className="text-xs text-black/50 dark:text-white/50">
              Model güncellemesi: {new Date(current.updatedAt).toLocaleString(locale, { timeZone: data.timeZone })} (şehir saati).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tab Değiştirici */}
          <div className="flex rounded-xl bg-black/5 p-1 dark:bg-white/5">
            <button
              onClick={() => setActiveTab("forecast")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "forecast"
                  ? "bg-white text-black shadow-sm dark:bg-brand-600 dark:text-white"
                  : "text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
              }`}
            >
              Günlük Tahmin
            </button>
            <button
              onClick={() => setActiveTab("seasons")}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                activeTab === "seasons"
                  ? "bg-white text-black shadow-sm dark:bg-brand-600 dark:text-white"
                  : "text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
              }`}
            >
              <Compass className="h-3.5 w-3.5" /> Ne Zaman Gidilmeli?
            </button>
          </div>

          {/* Manuel Yenileme Butonu */}
          <button
            onClick={() => fetchWeather(true)}
            disabled={refreshing}
            title="Şimdi Yenile"
            className="grid h-8 w-8 place-items-center rounded-xl border border-black/10 bg-black/5 text-black/60 transition hover:bg-black/10 hover:text-black dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-brand-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Ana Bölüm: Anlık Durum & Özet */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-12 lg:items-center">
        {/* Sol: Büyük Sıcaklık & Durum */}
        <div className="flex items-center gap-5 lg:col-span-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/10 via-sky-500/10 to-indigo-500/15 border border-black/5 dark:border-white/10 text-4xl shadow-inner">
            <span>{current.icon}</span>
          </div>

          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black tracking-tighter text-black dark:text-white sm:text-5xl">
                {current.temp}°
              </span>
              <span className="text-sm font-semibold text-black/50 dark:text-white/50">C</span>
            </div>
            {todayForecast && (
              <div className="text-xs font-medium text-black/60 dark:text-white/60">
                {todayForecast.minTemp}° / {todayForecast.maxTemp}°
              </div>
            )}

            <div className="font-bold text-black/80 dark:text-white/90 sm:text-base">
              {current.description}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-black/60 dark:text-white/60">
              <span className="inline-flex items-center gap-1">
                <Wind className="h-3 w-3 text-sky-500" /> {current.windSpeed == null ? "—" : `${current.windSpeed} km/sa`}
              </span>
              {todayForecast && (
                <span className="inline-flex items-center gap-1" title="Yağış olasılığı">
                  <Droplets className="h-3 w-3 text-blue-500" /> {todayForecast.rainProb == null ? "Yağış: —" : `%${todayForecast.rainProb} yağış`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Sağ: İklim & Mevsim Özeti Rozetleri */}
        <div className="rounded-2xl border border-black/5 bg-black/[0.02] p-4 dark:border-white/5 dark:bg-white/[0.02] lg:col-span-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-extrabold text-amber-700 dark:text-amber-300">
              <Sun className="h-3.5 w-3.5" /> En İdeal Aylar: {guide.idealMonths}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-bold text-brand-700 dark:text-brand-300">
              <Compass className="h-3.5 w-3.5" /> {guide.idealSeason}
            </span>
          </div>

          <p className="mt-2.5 text-xs leading-relaxed text-black/70 dark:text-white/70">
            {guide.currentSeasonVerdict}
          </p>

          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-black/55 dark:text-white/55">
            <Shirt className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span><b>Giyim Tavsiyesi:</b> {guide.packingTips}</span>
          </div>
        </div>
      </div>

      {/* Tab İçeriği: 7 Günlük Tahmin veya 4 Mevsim Rehberi */}
      <div className="mt-6 border-t border-black/5 pt-5 dark:border-white/5">
        <AnimatePresence mode="wait">
          {activeTab === "forecast" ? (
            <motion.div
              key="forecast"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-2.5 flex items-center justify-between text-xs font-bold text-black/50 dark:text-white/50">
                <span>{data.forecast.length} GÜNLÜK HAVA TAHMİNİ</span>
                <span>Özet En Düşük / En Yüksek</span>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
                {data.forecast.map((day, idx) => {
                  const isToday = idx === 0;
                  return (
                    <div
                      key={day.date}
                      className={`flex flex-col items-center justify-between rounded-2xl p-3 text-center transition ${
                        isToday
                          ? "border border-brand-500/30 bg-brand-500/10 shadow-sm"
                          : "border border-black/5 bg-black/[0.02] hover:bg-black/5 dark:border-white/5 dark:bg-white/[0.02] dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="text-xs font-bold text-black/70 dark:text-white/80">
                        {isToday ? "Bugün" : day.dayName}
                      </div>
                      <div className="my-1.5 text-2xl">{day.icon}</div>
                      <div className="text-sm font-extrabold text-black dark:text-white">
                        {day.maxTemp}°
                      </div>
                      <div className="text-[11px] font-semibold text-black/45 dark:text-white/45">
                        {day.minTemp}°
                      </div>
                      <div className="mt-1.5 flex items-center gap-0.5 text-[10px] font-bold text-sky-500">
                        <Droplets className="h-2.5 w-2.5" />
                        <span title={day.rainProb == null ? "Kaynak yağış olasılığı sağlamıyor." : "Yağış olasılığı"}>{day.rainProb == null ? "—" : `%${day.rainProb}`}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="seasons"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="text-xs font-bold text-black/50 dark:text-white/50">
                {cityName.toUpperCase()} İÇİN 4 MEVSİM GEZİ REHBERİ & TÜYOLAR
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* İlkbahar */}
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    <span>🌱</span> İlkbahar (Mart - Mayıs)
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-black/75 dark:text-white/75">
                    {guide.seasonTips.spring}
                  </p>
                </div>

                {/* Yaz */}
                <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-600 dark:text-amber-400">
                    <span>☀️</span> Yaz (Haziran - Ağustos)
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-black/75 dark:text-white/75">
                    {guide.seasonTips.summer}
                  </p>
                </div>

                {/* Sonbahar */}
                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-orange-600 dark:text-orange-400">
                    <span>🍂</span> Sonbahar (Eylül - Kasım)
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-black/75 dark:text-white/75">
                    {guide.seasonTips.autumn}
                  </p>
                </div>

                {/* Kış */}
                <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-sky-600 dark:text-sky-400">
                    <span>❄️</span> Kış (Aralık - Şubat)
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-black/75 dark:text-white/75">
                    {guide.seasonTips.winter}
                  </p>
                </div>
              </div>

              {/* Alt Bilgi */}
              <div className="flex items-center gap-2 rounded-xl bg-black/[0.03] p-3 text-xs text-black/60 dark:bg-white/[0.03] dark:text-white/60">
                <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
                <span><b>Bu Şehir En Çok Ne İçin Tercih Edilir?</b> {guide.bestFor}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <p className="mt-3 text-[10px] leading-relaxed text-black/55 dark:text-white/50">
          <a href="https://api.met.no/" target="_blank" rel="noopener noreferrer" className="underline">MET Norway</a>
          {" · "}<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer" className="underline">CC BY 4.0</a>
          {translate(" · Tahmin noktalarından günlük özet; bugün için modelde bulunan saatler gösterilir. Mevsim rehberi Rotazur tarafından hazırlanmıştır.")}
        </p>
      </div>
    </div></Localize>
  );
}
