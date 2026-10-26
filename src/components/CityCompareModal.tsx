"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Scale, Sparkles, Trophy, X } from "lucide-react";
import { CITIES } from "@/lib/cities";
import { CityImage, useCityImages } from "./CityImage";
import { fmtCur, tl } from "@/lib/format";
import { useCurrency } from "./CurrencyContext";
import { toQuery } from "@/lib/search";
import type { Comfort, SearchInput, DiscoverItem } from "@/lib/types";

interface CityCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCities?: string[];
  baseInput: SearchInput;
}

export function CityCompareModal({
  isOpen,
  onClose,
  initialCities = ["belgrad", "saraybosna", "roma"],
  baseInput,
}: CityCompareModalProps) {
  const { fmtCur } = useLocaleFormat();
  const imgs = useCityImages();
  const { currency, rates } = useCurrency();
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialCities.slice(0, 3).length >= 2 ? initialCities.slice(0, 3) : ["belgrad", "saraybosna", "budapeste"]
  );
  const [tier, setTier] = useState<Comfort>(baseInput.comfort || "dengeli");
  const [estimates, setEstimates] = useState<DiscoverItem[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const initialKey = initialCities.join("|");
  const query = toQuery({ ...baseInput, comfort: tier });
  useEffect(() => {
    if (!isOpen) return;
    const ids = [...new Set(initialKey.split("|").filter((id) => CITIES.some((c) => c.id === id)))].slice(0, 3);
    setSelectedIds(ids.length >= 2 ? ids : ["belgrad", "saraybosna", "roma"]);
  }, [isOpen, initialKey]);
  useEffect(() => { if (isOpen) setTier(baseInput.comfort); }, [isOpen, baseInput.comfort]);
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    let active = true;
    setEstimates(null); setError("");
    fetch(`/api/discover?${query}`, { signal: controller.signal }).then(async (r) => {
      const data = await r.json().catch(() => ({}));
      if (!r.ok || !Array.isArray(data.items)) throw new Error(data.error || "Karşılaştırma yüklenemedi. Bağlantınızı kontrol edin.");
      return data.items as DiscoverItem[];
    }).then((items) => { if (active) setEstimates(items); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Karşılaştırma yüklenemedi."); });
    return () => { active = false; controller.abort(); };
  }, [isOpen, query, retry]);

  if (!isOpen) return null;

  const nights = Math.max(
    1,
    Math.round(
      (new Date(baseInput.endDate).getTime() - new Date(baseInput.startDate).getTime()) / (1000 * 60 * 60 * 24)
    ) || 3
  );
  const days = nights + 1;
  const travelers = Math.max(1, baseInput.travelers || 2);
  const compared = selectedIds
    .map((id) => estimates?.find((item) => item.city.id === id))
    .filter((item): item is DiscoverItem => !!item)
    .map(({ city, estimate }) => ({ city, flightPerPersonTry: estimate.flight / travelers,
      hotelPerNightTry: estimate.hotel / nights, foodDailyTry: estimate.food / days / travelers,
      transportDailyTry: estimate.transport / travelers, activitiesPerPersonTry: estimate.activities / travelers,
      totalPackageTry: estimate.total, perPersonTry: estimate.total / travelers,
      fitsBudget: estimate.remaining >= 0 }));

  const cheapestCity = [...compared].sort((a, b) => a.totalPackageTry - b.totalPackageTry)[0];

  const handleSelectSlot = (slotIdx: number, newCityId: string) => {
    const next = [...selectedIds];
    const other = next.indexOf(newCityId);
    if (other !== -1) next[other] = next[slotIdx];
    next[slotIdx] = newCityId;
    setSelectedIds(next);
  };

  return (
    <Localize><AnimatePresence>
      <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="card relative max-h-[92vh] w-full max-w-5xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-[#11121c] sm:p-8"
        >
          <button
            onClick={onClose}
            aria-label="Karşılaştırmayı kapat"
            className="btn-ghost absolute right-4 top-4 !p-2 text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pr-8">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-aqua-500 text-white shadow-lg">
                <Scale className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold">⚖️ Şehir & Bütçe Karşılaştırma Modu</h2>
                <p className="text-xs text-black/55 dark:text-white/55">
                  Şehirleri vize, uçuş, otel, yemek ve tahmini toplam bütçe açısından yan yana kıyaslayın ({nights} gece, {travelers} yolcu)
                </p>
              </div>
            </div>

            {/* 3 Bütçe Seviyesi Seçici */}
            <div className="flex items-center gap-1.5 rounded-2xl bg-black/5 p-1 dark:bg-white/5">
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
                  onClick={() => setTier(t.id)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition ${
                    tier === t.id
                      ? "bg-brand-600 text-white shadow"
                      : "text-black/65 hover:text-black dark:text-white/65 dark:hover:text-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3 Şehir Seçim Kutuları */}
          {error && <div role="alert" className="mt-4 text-sm text-rose-600 dark:text-rose-400">{error} <button type="button" className="font-bold underline" onClick={() => setRetry((n) => n + 1)}>Tekrar Dene</button></div>}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {!estimates && !error && [0, 1, 2].map((i) => <div key={i} className="skeleton h-96" />)}
            {compared.map((item, idx) => {
              const isCheapest = cheapestCity?.city.id === item.city.id;
              return (
                <div
                  key={`${item.city.id}-${idx}`}
                  className={`flex flex-col justify-between rounded-3xl border p-5 transition ${
                    isCheapest
                      ? "border-emerald-500 bg-emerald-500/[0.03] ring-2 ring-emerald-500/25"
                      : "border-black/10 bg-black/[0.015] dark:border-white/10 dark:bg-white/[0.02]"
                  }`}
                >
                  <div>
                    {/* Şehir Seçici Dropdown */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <select
                        value={item.city.id}
                        onChange={(e) => handleSelectSlot(idx, e.target.value)}
                        className="input-field w-full text-xs font-bold"
                      >
                        {CITIES.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.flag} {c.name} ({c.country})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Şehir Görseli */}
                    <div className="relative mb-3 h-28 w-full overflow-hidden rounded-2xl">
                      <CityImage
                        src={imgs[item.city.id]}
                        alt={item.city.name}
                        className="absolute inset-0"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                      {isCheapest && (
                        <div className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow">
                          <Trophy className="h-3 w-3" /> En Ekonomik Seçenek
                        </div>
                      )}
                      <div className="absolute bottom-2 left-3 text-white">
                        <div className="text-base font-black drop-shadow">
                          {item.city.flag} {item.city.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-baseline justify-between">
                      <div>
                        <h3 className="text-xl font-black">
                          {item.city.flag} {item.city.name}
                        </h3>
                        <p className="text-xs text-black/55 dark:text-white/55">{item.city.country}</p>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          item.city.visaType === "vizesiz" || item.city.visaType === "kimlik"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {item.city.visaType === "kimlik"
                          ? "🪪 Kimlikle Giriş"
                          : item.city.visaType === "vizesiz"
                          ? "🟢 Vizesiz"
                          : item.city.visaType === "vize"
                          ? "🟡 Vize / E-Vize"
                          : "🔵 Schengen Vizesi"}
                      </span>
                    </div>

                    {/* Toplam Paket Maliyeti */}
                    <div className="mt-4 rounded-2xl bg-white p-3.5 shadow-sm dark:bg-white/5">
                      <div className="text-[11px] text-black/50 dark:text-white/50">
                        {travelers} Kişi, {nights} Gece Toplam ({tier.toUpperCase()})
                      </div>
                      <div className="mt-0.5 text-2xl font-black text-gradient">
                        {fmtCur(item.totalPackageTry, currency, rates)}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px]">
                        <span className="opacity-70">Kişi Başı: <b>{fmtCur(item.perPersonTry, currency, rates)}</b></span>
                        <span
                          className={`font-bold ${
                            item.fitsBudget ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                          }`}
                        >
                          {item.fitsBudget ? "Bütçeye Uygun ✓" : "Bütçeyi Aşıyor"}
                        </span>
                      </div>
                    </div>

                    {/* Kalem Kalem Karşılaştırma Satırları */}
                    <div className="mt-4 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between border-b border-black/5 pb-2 dark:border-white/5">
                        <span className="opacity-70">✈️ Gidiş-Dönüş Uçuş (Kişi Başı)</span>
                        <span className="font-bold">{fmtCur(item.flightPerPersonTry, currency, rates)}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-black/5 pb-2 dark:border-white/5">
                        <span className="opacity-70">🕒 Uçuş Süresi</span>
                        <span className="font-bold">~{item.city.flightHours} saat</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-black/5 pb-2 dark:border-white/5">
                        <span className="opacity-70">🏨 Otel Gecelik (Tüm Grup)</span>
                        <span className="font-bold">{fmtCur(item.hotelPerNightTry, currency, rates)}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-black/5 pb-2 dark:border-white/5">
                        <span className="opacity-70">🍽️ Günlük Yemek (Kişi Başı)</span>
                        <span className="font-bold">{fmtCur(item.foodDailyTry, currency, rates)}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-black/5 pb-2 dark:border-white/5">
                        <span className="opacity-70">🚇 Ulaşım + Transfer (Kişi Başı)</span>
                        <span className="font-bold">{fmtCur(item.transportDailyTry, currency, rates)}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-black/5 pb-2 dark:border-white/5">
                        <span className="opacity-70">🎟️ Aktiviteler (Kişi Başı)</span>
                        <span className="font-bold">{fmtCur(item.activitiesPerPersonTry, currency, rates)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="opacity-70">💱 Yerel Para Birimi</span>
                        <span className="font-bold">{item.city.currencyCode || "EUR"}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href={`/plan?${toQuery({ ...baseInput, destination: item.city.id, comfort: tier })}`}
                    onClick={onClose}
                    className="btn-primary mt-5 w-full justify-center text-xs py-2.5"
                  >
                    <span>{item.city.name} Rotasını Aç</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Alt Akıllı Tavsiye */}
          {cheapestCity && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-brand-500/10 p-4 text-xs text-brand-900 dark:text-brand-200">
              <Sparkles className="h-5 w-5 shrink-0 text-brand-600 dark:text-brand-400" />
              <div>
                <b>Akıllı Karşılaştırma Sonucu:</b> Seçtiğiniz <b>{tier.toUpperCase()}</b> bütçe modunda{" "}
                <b>{cheapestCity.city.name}</b> toplam <b>{fmtCur(cheapestCity.totalPackageTry, currency, rates)}</b> maliyetle en avantajlı rota olarak öne çıkıyor!
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence></Localize>
  );
}
