"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { motion } from "framer-motion";
import { CalendarDays, MapPin, Minus, PlaneTakeoff, Plus, Sparkles, Users, Wallet } from "lucide-react";
import { CITIES, INTERESTS, ORIGINS } from "@/lib/cities";
import { COMFORT } from "@/lib/planner/budget";
import { toQuery } from "@/lib/search";
import { tl, fmtCur } from "@/lib/format";
import { useCurrency } from "@/components/CurrencyContext";
import { useLanguage } from "@/components/LanguageContext";
import type { Comfort, Interest, SearchInput } from "@/lib/types";
import { addDays, isIsoDate, todayIso } from "@/lib/travel-utils";
import { searchDateError, returnDateAfterDepartureChange } from "@/lib/search-dates";

const plus = (n: number) => addDays(todayIso(), n);

interface PresetItem {
  id: string;
  emoji: string;
  label: string;
  destination: string;
  nights: number;
  travelers: number;
  budget: number;
  comfort: Comfort;
  interests: Interest[];
}

const PRESETS: PresetItem[] = [
  {
    id: "haftasonu",
    emoji: "🍕",
    label: "Hafta Sonu Roma",
    destination: "roma",
    nights: 3,
    travelers: 2,
    budget: 45000,
    comfort: "dengeli",
    interests: ["tarih", "yemek"],
  },
  {
    id: "kimlikle",
    emoji: "🪪",
    label: "Pasaportsuz Tiflis",
    destination: "tiflis",
    nights: 3,
    travelers: 2,
    budget: 35000,
    comfort: "dengeli",
    interests: ["tarih", "yemek"],
  },
  {
    id: "vizesiz",
    emoji: "🟢",
    label: "Vizesiz Belgrad",
    destination: "belgrad",
    nights: 3,
    travelers: 2,
    budget: 38000,
    comfort: "dengeli",
    interests: ["gece", "yemek"],
  },
  {
    id: "sirtcantali",
    emoji: "🎒",
    label: "Ekonomik Sırt Çantalı",
    destination: "saraybosna",
    nights: 3,
    travelers: 1,
    budget: 20000,
    comfort: "tasarruflu",
    interests: ["tarih", "doga"],
  },
  {
    id: "romantik",
    emoji: "👩‍❤️‍👨",
    label: "Romantik Paris",
    destination: "paris",
    nights: 4,
    travelers: 2,
    budget: 65000,
    comfort: "konforlu",
    interests: ["fotograf", "yemek", "muze"],
  },
  {
    id: "sahil",
    emoji: "🏖️",
    label: "Kotor & Sahil",
    destination: "kotor",
    nights: 4,
    travelers: 2,
    budget: 48000,
    comfort: "dengeli",
    interests: ["doga", "fotograf"],
  },
];

export function SearchForm({ initial, compact = false }: { initial?: Partial<SearchInput>; compact?: boolean }) {
  const { tl, fmtCur } = useLocaleFormat();
  const router = useRouter();
  const { currency, rates } = useCurrency();
  const { t } = useLanguage();
  const [origin, setOrigin] = useState(initial?.origin ?? "IST");
  const [dest, setDest] = useState(initial?.destination ?? "any");
  const [start, setStart] = useState(initial?.startDate ?? plus(30));
  const [end, setEnd] = useState(initial?.endDate ?? plus(34));
  const [travelers, setTravelers] = useState(initial?.travelers ?? 2);
  const [budget, setBudget] = useState(initial?.budget ?? 40000);
  const [comfort, setComfort] = useState<Comfort>(initial?.comfort ?? "dengeli");
  const [interests, setInterests] = useState<Interest[]>(initial?.interests ?? ["tarih", "yemek"]);
  const [loading, startNavigation] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const getPresetLabel = (id: string, defaultLabel: string) => {
    switch (id) {
      case "haftasonu": return t.presetRome;
      case "kimlikle": return t.presetTbilisi;
      case "vizesiz": return t.presetBelgrade;
      case "sirtcantali": return t.presetBackpacker;
      case "romantik": return t.presetParis;
      case "sahil": return t.presetKotor;
      default: return defaultLabel;
    }
  };

  const getComfortLabel = (c: Comfort) => {
    switch (c) {
      case "tasarruflu": return t.comfortEco;
      case "dengeli": return t.comfortStd;
      case "konforlu": return t.comfortLux;
      default: return c;
    }
  };

  const getInterestLabel = (id: Interest, defaultLabel: string) => {
    switch (id) {
      case "tarih": return t.interestHistory;
      case "yemek": return t.interestFood;
      case "doga": return t.interestNature;
      case "gece": return t.interestNightlife;
      case "fotograf": return t.interestPhoto;
      case "muze": return t.interestMuseum;
      default: return defaultLabel;
    }
  };

  const nights = useMemo(
    () => isIsoDate(start) && isIsoDate(end) && end > start ? Math.round((Date.parse(end + "T12:00:00Z") - Date.parse(start + "T12:00:00Z")) / 86400000) : 0,
    [start, end],
  );
  const MIN = 5000;
  const MAX = 300000;
  const pct = ((budget - MIN) / (MAX - MIN)) * 100;

  const toggle = (i: Interest) => setInterests((s) => (s.includes(i) ? s.filter((x) => x !== i) : [...s, i]));

  const applyPreset = (p: PresetItem) => {
    setDest(p.destination);
    setTravelers(p.travelers);
    setBudget(p.budget);
    setComfort(p.comfort);
    setInterests(p.interests);
    const s = plus(30);
    setStart(s);
    setEnd(addDays(s, p.nights));
    setError(null);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const dateError = searchDateError(start, end);
    if (dateError) { setError(dateError); return; }
    setError(null);
    const q = toQuery({
      origin,
      destination: dest === "any" ? undefined : dest,
      startDate: start,
      endDate: end,
      travelers,
      budget,
      comfort,
      interests,
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    startNavigation(() => router.push(dest === "any" ? `/discover?${q}` : `/plan?${q}`, { scroll: true }));
  };

  return (
    <Localize><form onSubmit={submit} className={`glass rounded-[28px] ${compact ? "p-5" : "p-5 sm:p-7"}`}>
      {/* ⚡ Hızlı Rota Hapları (1-Tıkla Hazır Konseptler) */}
      {!compact && (
        <div className="mb-6 pb-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-black/45 dark:text-white/45 mb-2.5">
            <Sparkles className="h-3.5 w-3.5 text-brand-500" />
            {t.presetsTitle}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scroll-thin">
            {PRESETS.map((p) => {
              const isActive = dest === p.destination && travelers === p.travelers;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all select-none border ${
                    isActive
                      ? "bg-gradient-to-r from-brand-600 to-fuchsia-500 text-white border-transparent shadow-md shadow-brand-500/20"
                      : "bg-white/80 dark:bg-white/5 border-black/10 dark:border-white/10 text-black/75 dark:text-white/75 hover:border-brand-500/50 hover:bg-black/5 dark:hover:bg-white/10"
                  }`}
                >
                  <span>{p.emoji}</span>
                  <span>{getPresetLabel(p.id, p.label)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="label flex items-center gap-1.5"><PlaneTakeoff className="h-3.5 w-3.5" /> {t.whereFrom}</label>
          <select className="field" value={origin} onChange={(e) => setOrigin(e.target.value)}>
            {ORIGINS.map((o) => <option key={o.code} value={o.code}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {t.whereTo}</label>
          <select className="field" value={dest} onChange={(e) => setDest(e.target.value)}>
            <option value="any">{t.anywhere}</option>
            {CITIES.map((c) => <option key={c.id} value={c.id}>{c.flag} {c.name}, {c.country}</option>)}
          </select>
        </div>
        <div>
          <label className="label flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {t.departure}</label>
          <input type="date" required aria-label={t.departure} className="field" value={start} min={todayIso()} onChange={(e) => {
            setStart(e.target.value);
            setEnd(returnDateAfterDepartureChange(e.target.value, end));
            setError(null);
          }} />
        </div>
        <div>
          <label className="label flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {t.returnDate} · {nights} {t.nights}</label>
          <input type="date" required aria-label={t.returnDate} className="field" value={end} min={addDays(isIsoDate(start) ? start : todayIso(), 1)} max={addDays(isIsoDate(start) ? start : todayIso(), 14)} onChange={(e) => { setEnd(e.target.value); setError(null); }} />
        </div>
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.5fr_auto_1fr]">
        <div>
          <div className="flex items-end justify-between">
            <label className="label flex items-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> {t.totalBudget}</label>
            <motion.div key={budget} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-1.5 text-right">
              <span className="text-xl font-bold text-gradient">{tl(budget)}</span>
              {currency !== "TRY" && (
                <span className="ml-2 text-xs font-semibold text-brand-600 dark:text-brand-400">
                  (~{fmtCur(budget, currency, rates)})
                </span>
              )}
            </motion.div>
          </div>
          <input
            type="range" min={MIN} max={MAX} step={1000} value={budget}
            style={{ ["--p" as string]: `${pct}%` }}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="mt-3 w-full"
          />
          <div className="mt-2 flex justify-between text-xs text-black/40 dark:text-white/40">
            <span>{tl(MIN)}</span>
            <span>
              {t.perPerson} ≈ {tl(budget / travelers)}
              {currency !== "TRY" && ` (~${fmtCur(budget / travelers, currency, rates)})`}
            </span>
            <span>{tl(MAX)}</span>
          </div>
        </div>
        <div>
          <label className="label flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> {t.travelers}</label>
          <div className="flex items-center gap-2">
            <button type="button" className="field !w-11 !px-0 grid place-items-center" onClick={() => setTravelers((tCount) => Math.max(1, tCount - 1))}><Minus className="h-4 w-4" /></button>
            <span className="w-8 text-center text-lg font-bold">{travelers}</span>
            <button type="button" className="field !w-11 !px-0 grid place-items-center" onClick={() => setTravelers((tCount) => Math.min(9, tCount + 1))}><Plus className="h-4 w-4" /></button>
          </div>
        </div>
        <div>
          <label className="label">{t.comfort}</label>
          <div className="grid grid-cols-3 gap-1 rounded-2xl border border-black/10 p-1 dark:border-white/10">
            {(Object.keys(COMFORT) as Comfort[]).map((k) => (
              <button key={k} type="button" onClick={() => setComfort(k)} title={COMFORT[k].desc}
                className={`relative rounded-xl px-2 py-2 text-sm font-medium transition ${comfort === k ? "text-white" : "text-black/60 dark:text-white/60"}`}>
                {comfort === k && <motion.span layoutId={`comfort-${compact}`} className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-600 to-fuchsia-500" transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} />}
                <span className="relative">{getComfortLabel(k)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <label className="label">{t.interests}</label>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <motion.button whileTap={{ scale: 0.94 }} type="button" key={i.id} onClick={() => toggle(i.id)} className={`chip ${interests.includes(i.id) ? "chip-on" : ""}`}>
                <span>{i.emoji}</span>{getInterestLabel(i.id, i.label)}
              </motion.button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary shrink-0 text-base">
          <Sparkles className={`h-5 w-5 ${loading ? "animate-spin" : ""}`} />
          {loading ? t.loadingPlan : dest === "any" ? t.findRoutes : t.createPlan}
        </button>
      </div>
    </form></Localize>
  );
}
