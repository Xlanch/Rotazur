"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Scale, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { SearchForm } from "./SearchForm";
import { CityImage, useCityImages } from "./CityImage";
import { BUDGET_PARTS } from "./BudgetDonut";
import { CityCompareModal } from "./CityCompareModal";
import { useCurrency } from "./CurrencyContext";
import { fmtCur, fmtDate, tl } from "@/lib/format";
import { toQuery } from "@/lib/search";
import type { DiscoverItem, SearchInput } from "@/lib/types";

export function DiscoverView({ input }: { input: SearchInput }) {
  const { fmtCur, fmtDate } = useLocaleFormat();
  const { currency, rates } = useCurrency();
  const [items, setItems] = useState<DiscoverItem[] | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [edit, setEdit] = useState(false);
  const [onlyFits, setOnlyFits] = useState(false);
  const [visaFilter, setVisaFilter] = useState<"all" | "vizesiz" | "kimlik" | "schengen">("all");
  const [compareOpen, setCompareOpen] = useState(false);
  const [compareList, setCompareList] = useState<string[]>(["belgrad", "saraybosna", "roma"]);
  const [weatherMap, setWeatherMap] = useState<Record<string, { temp: number; icon: string; desc: string }>>({});
  const imgs = useCityImages();
  const q = toQuery(input);

  useEffect(() => {
    fetch("/api/weather")
      .then((r) => r.json())
      .then((d) => {
        if (d.status === "ok" && d.cities) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const map: Record<string, { temp: number; icon: string; desc: string }> = {};
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          for (const [id, c] of Object.entries(d.cities as Record<string, any>)) {
            map[id] = {
              temp: c.current.temp,
              icon: c.current.icon,
              desc: c.current.description,
            };
          }
          setWeatherMap(map);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setItems(null);
    setError("");
    fetch(`/api/discover?${q}`, { signal: controller.signal })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || "Şehirler yüklenemedi. Lütfen tekrar deneyin.");
        if (!Array.isArray(data.items)) throw new Error("Şehir verisi okunamadı. Lütfen tekrar deneyin.");
        return data.items as DiscoverItem[];
      })
      .then((result) => { if (active) setItems(result); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Bağlantı kurulamadı."); });
    return () => { active = false; controller.abort(); };
  }, [q, retry]);

  const toggleCompareCity = (cityId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCompareList((prev) => {
      if (prev.includes(cityId)) {
        return prev.length > 1 ? prev.filter((id) => id !== cityId) : prev;
      }
      if (prev.length >= 3) {
        return [...prev.slice(1), cityId];
      }
      return [...prev, cityId];
    });
  };

  const fitsCount = items?.filter((i) => i.fits).length ?? 0;
  const shown = items
    ?.filter((i) => !onlyFits || i.fits)
    ?.filter((i) => {
      if (visaFilter === "all") return true;
      if (visaFilter === "vizesiz") return i.city.visaType === "vizesiz" || i.city.visaType === "kimlik";
      if (visaFilter === "kimlik") return i.city.visaType === "kimlik";
      if (visaFilter === "schengen") return i.city.visaType === "schengen";
      return true;
    });

  return (
    <Localize><main className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-gradient-to-b from-brand-500/15 to-transparent" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
            {fmtCur(input.budget, currency, rates)} ile <span className="text-gradient">nereye gidebilirsin?</span>
          </h1>
          <p className="mt-2 text-black/55 dark:text-white/55">
            {input.origin} çıkışlı · {fmtDate(input.startDate)} – {fmtDate(input.endDate)} · {input.travelers} kişi
            {items && <> · <b className="text-emerald-500">{fitsCount} şehir</b> bütçene uyuyor</>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCompareOpen(true)}
            className="chip chip-on font-bold shadow-md"
          >
            <Scale className="h-4 w-4" /> ⚖️ Şehirleri Yan Yana Karşılaştır ({compareList.length})
          </button>
          <button onClick={() => setOnlyFits((v) => !v)} className={`chip ${onlyFits ? "chip-on" : ""}`}>
            <Check className="h-4 w-4" /> Sadece bütçeye uyanlar
          </button>
          <button onClick={() => setEdit((v) => !v)} className="chip"><SlidersHorizontal className="h-4 w-4" /> Düzenle</button>
        </div>
      </div>

      {/* Vize Filtresi Seçenekleri */}
      <div className="mt-5 flex flex-wrap gap-2 border-t border-black/5 pt-4 dark:border-white/5">
        <button
          onClick={() => setVisaFilter("all")}
          className={`chip text-xs ${visaFilter === "all" ? "chip-on" : ""}`}
        >
          🌍 Tüm Şehirler ({items?.length ?? 0})
        </button>
        <button
          onClick={() => setVisaFilter("vizesiz")}
          className={`chip text-xs ${visaFilter === "vizesiz" ? "chip-on" : ""}`}
        >
          🟢 Vizesiz Destinasyonlar
        </button>
        <button
          onClick={() => setVisaFilter("kimlik")}
          className={`chip text-xs ${visaFilter === "kimlik" ? "chip-on" : ""}`}
        >
          🪪 Sadece Çipli Kimlikle (Pasaportsuz)
        </button>
        <button
          onClick={() => setVisaFilter("schengen")}
          className={`chip text-xs ${visaFilter === "schengen" ? "chip-on" : ""}`}
        >
          🇪🇺 Schengen Vizesi Gerekenler
        </button>
      </div>

      <AnimatePresence>
        {edit && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="pt-6"><SearchForm initial={input} compact /></div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <div role="alert" className="card mt-8 p-5 text-sm"><p>{error}</p><button type="button" onClick={() => setRetry((n) => n + 1)} className="chip mt-3">Tekrar Dene</button></div>}
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {!shown && !error && Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-[420px]" />)}
        {shown?.map((it, i) => {
          const usage = Math.min(100, (it.estimate.total / input.budget) * 100);
          const inCompare = compareList.includes(it.city.id);
          return (
            <motion.div key={it.city.id} layout initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={`/plan?${toQuery({ ...input, destination: it.city.id })}`} className="card group block overflow-hidden transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-brand-500/10">
                <div className="relative h-48 overflow-hidden">
                  <CityImage src={imgs[it.city.id]} alt={it.city.name} className="absolute inset-0 transition duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                  <div className="absolute left-4 top-4 flex flex-wrap gap-1.5 items-center">
                    {it.fits ? (
                      <span className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold text-white shadow-lg">✓ Bütçeye uygun</span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1 text-xs font-bold text-white shadow-lg">
                        <TriangleAlert className="h-3 w-3" /> {fmtCur(-it.estimate.remaining, currency, rates)} fazla
                      </span>
                    )}
                    {weatherMap[it.city.id] && (
                      <span
                        title={`${weatherMap[it.city.id].desc}`}
                        className="inline-flex items-center gap-1 rounded-full bg-black/60 backdrop-blur-md px-2.5 py-1 text-xs font-extrabold text-white shadow-lg"
                      >
                        <span>{weatherMap[it.city.id].icon}</span>
                        <span>{weatherMap[it.city.id].temp}°C</span>
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => toggleCompareCity(it.city.id, e)}
                    className={`absolute right-4 top-4 rounded-full px-3 py-1 text-xs font-bold backdrop-blur transition ${
                      inCompare
                        ? "bg-brand-600 text-white shadow-lg ring-2 ring-white/50"
                        : "bg-black/45 text-white hover:bg-black/70"
                    }`}
                  >
                    {inCompare ? "⚖️ Kıyaslamada ✓" : "+ Karşılaştır"}
                  </button>
                  <div className="absolute bottom-3 left-4 right-4 text-white">
                    <div className="text-2xl font-bold drop-shadow">{it.city.flag} {it.city.name}</div>
                    <div className="line-clamp-2 text-xs sm:text-sm opacity-90 drop-shadow">{it.city.tagline}</div>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-black/50 dark:text-white/50">Tahmini toplam</span>
                    <span className="text-2xl font-extrabold">{fmtCur(it.estimate.total, currency, rates)}</span>
                  </div>
                  <div className="mt-3 flex h-2.5 overflow-hidden rounded-full bg-black/5 dark:bg-white/5">
                    {BUDGET_PARTS.map((p) => (
                      <motion.div key={p.key} initial={{ width: 0 }} animate={{ width: `${(it.estimate[p.key] / Math.max(it.estimate.total, input.budget)) * 100}%` }} transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }} style={{ background: p.color }} />
                    ))}
                  </div>
                  <div className="mt-1.5 text-right text-xs text-black/45 dark:text-white/45">Bütçenin %{Math.round(usage)}{usage >= 100 ? "+" : ""}’i</div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    {[["✈️ Gidiş-Dönüş", it.estimate.flight], ["🏨 Otel", it.estimate.hotel], ["🍽️ Yemek", it.estimate.food]].map(([l, v]) => (
                      <div key={l as string} className="rounded-xl bg-black/[0.03] py-2 dark:bg-white/[0.04]">
                        <div className="text-black/50 dark:text-white/50">{l}</div>
                        <div className="font-semibold">{fmtCur(v as number, currency, rates)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-black/50 dark:text-white/50">🛂 {it.city.visa.split(" (")[0]}</span>
                    <span className="flex items-center gap-1 font-semibold text-brand-600 transition group-hover:gap-2 dark:text-brand-300">Plan <ArrowRight className="h-4 w-4" /></span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Şehir Karşılaştırma Modalı */}
      <CityCompareModal
        isOpen={compareOpen}
        onClose={() => setCompareOpen(false)}
        initialCities={compareList}
        baseInput={input}
      />
    </main></Localize>
  );
}

