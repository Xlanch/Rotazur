"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";
import { useLanguage } from "./LanguageContext";

import { useMemo, useState } from "react";
import { Compass, MapPin, Plus, Sparkles, Train } from "lucide-react";
import { fmtCur, type CurrencyCode } from "@/lib/format";
import {
  getNearbyDayTrips,
  getSpontaneousIdeas,
  type NearbyDayTrip,
  type SpontaneousIdea,
  type SpontaneousMood,
} from "@/lib/providers/city-discovery";
import type { PlanResponse } from "@/lib/types";

interface SpontaneousAndDayTripsProps {
  data: PlanResponse;
  cur: CurrencyCode;
  activeDay: number;
  onFocusMap: (coords: [number, number]) => void;
  onAddIdeaToDay: (idea: SpontaneousIdea) => void;
  onAddDayTripToDay: (trip: NearbyDayTrip) => void;
}

export function SpontaneousAndDayTrips({
  data,
  cur,
  activeDay,
  onFocusMap,
  onAddIdeaToDay,
  onAddDayTripToDay,
}: SpontaneousAndDayTripsProps) {
  const { fmtCur } = useLocaleFormat();
  const { translate } = useLanguage();
  const { city, rates } = data;
  const ideas = useMemo(() => getSpontaneousIdeas(city), [city]);
  const dayTrips = useMemo(() => getNearbyDayTrips(city), [city]);

  const [selectedMood, setSelectedMood] = useState<"all" | SpontaneousMood>("all");
  const [maxEurFilter, setMaxEurFilter] = useState<number>(50);

  const filteredIdeas = useMemo(
    () =>
      ideas.filter(
        (it) =>
          (selectedMood === "all" || it.mood === selectedMood) && it.costEur <= maxEurFilter
      ),
    [ideas, selectedMood, maxEurFilter]
  );

  return (
    <Localize><div className="mt-8 space-y-6">
      {/* ÖZELLİK 6: "ŞU AN 2 SAAT BOŞ VAKTİM VAR, NE YAPAYIM?" ANLIK RUH HALİ & BÜTÇE SEÇİCİ */}
      <div className="card border-brand-500/25 bg-gradient-to-br from-brand-500/[0.03] to-purple-500/[0.03] p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400">
              <Compass className="h-4 w-4" /> Anlık Ruh Hali & Cep Bütçesi Seçici
            </span>
            <h3 className="mt-1 text-lg font-extrabold">
              🧭 &ldquo;Şu An 2 Saat Boş Vaktim Var, Ne Yapayım?&rdquo;
            </h3>
            <p className="mt-0.5 text-xs text-black/60 dark:text-white/60">
              Gezi sırasında plan değiştiyse, yağmur başladıysa veya yorulduysanız anlık ruh halinize ve cebinizdeki bütçeye göre alternatif seçin
            </p>
          </div>
        </div>

        {/* Ruh Hali ve Bütçe Filtreleri */}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: "all", label: "✨ Tüm Öneriler" },
              { id: "kahve", label: "☕ Dinlenme & Kahve" },
              { id: "yagmur", label: "🌧️ Yağmur Başladı / Kapalı Mekan" },
              { id: "sokak-lezzeti", label: "🌮 Ucuz Sokak Atıştırmalığı" },
              { id: "manzara", label: "🌆 Gün Batımı & Manzara" },
              { id: "gizli-kesif", label: "🎨 Gizli Sokak Keşfi" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMood(m.id as "all" | SpontaneousMood)}
                className={`chip text-xs ${selectedMood === m.id ? "chip-on font-bold" : ""}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-xl bg-black/5 p-1 text-xs dark:bg-white/10">
            {[
              { val: 0, label: "🆓 Ücretsiz (0€)" },
              { val: 6, label: "🪙 6€ Altı" },
              { val: 50, label: "💫 Tümü" },
            ].map((b) => (
              <button
                key={b.val}
                type="button"
                onClick={() => setMaxEurFilter(b.val)}
                className={`rounded-lg px-2.5 py-1 font-bold transition ${
                  maxEurFilter === b.val
                    ? "bg-white text-black shadow-sm dark:bg-zinc-800 dark:text-white"
                    : "opacity-65 hover:opacity-100"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Öneri Kartları */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {filteredIdeas.map((idea) => {
            const costTry = Math.round(idea.costEur * rates.EUR);
            return (
              <div
                key={idea.id}
                className="flex flex-col justify-between rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm transition hover:border-brand-400 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-brand-600 dark:text-brand-400">
                      📍 {idea.neighborhood} · ⏱️ {translate(idea.duration)}
                    </span>
                    <span className="rounded-lg bg-emerald-500/15 px-2 py-0.5 text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
                      {idea.costEur === 0 ? "ÜCRETSİZ (0 €)" : `${fmtCur(costTry, cur, rates)} (~${idea.costEur} €)`}
                    </span>
                  </div>
                  <h4 className="mt-1.5 text-sm font-extrabold">{idea.title}</h4>
                  <p className="mt-1 text-xs text-black/65 dark:text-white/65 leading-relaxed">
                    {idea.description}
                  </p>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-2.5 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => onFocusMap([idea.lat, idea.lon])}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-500/10 px-2.5 py-1 text-[11px] font-bold text-brand-600 hover:bg-brand-500/20 dark:text-brand-300"
                  >
                    <MapPin className="h-3 w-3" /> Haritada Gör
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddIdeaToDay(idea)}
                    className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-brand-600 to-fuchsia-500 px-3 py-1 text-[11px] font-bold text-white shadow-sm hover:opacity-95"
                  >
                    <Plus className="h-3 w-3" /> Gün {activeDay}&apos;e Ekle
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ÖZELLİK 7: "BURAYA KADAR GELMİŞKEN..." GÜNÜBİRLİK YAKIN ŞEHİR & KOMŞU ROTA ÖNERİCİSİ */}
      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Train className="h-4 w-4" /> Günübirlik Yakın Şehir & Komşu Kasaba Rotaları
            </span>
            <h3 className="mt-1 text-lg font-extrabold">
              🚆 &ldquo;{city.name}&apos;a Kadar Gelmişken...&rdquo; (Tren/Otobüsle Günübirlik Rotalar)
            </h3>
            <p className="mt-0.5 text-xs text-black/60 dark:text-white/60">
              Otel değiştirmeden sabah gidip akşam dönebileceğiniz en popüler komşu şehir ve kasaba kaçamakları
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dayTrips.map((trip) => {
            const rtTry = Math.round(trip.roundTripEur * rates.EUR);
            return (
              <div
                key={trip.id}
                className="flex flex-col justify-between rounded-2xl border border-black/10 bg-black/[0.015] p-4 transition hover:border-emerald-500/50 dark:border-white/10 dark:bg-white/[0.02]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                      {trip.badge}
                    </span>
                    <span className="text-xs font-bold opacity-65">⏱️ {translate(trip.durationOneWay)}</span>
                  </div>

                  <h4 className="mt-2 text-base font-extrabold">{trip.destination}</h4>
                  <div className="mt-1 text-xs font-semibold text-brand-600 dark:text-brand-400">
                    {trip.transportType}
                  </div>

                  <p className="mt-2 text-xs text-black/70 dark:text-white/70 leading-relaxed">
                    {trip.highlights}
                  </p>

                  <div className="mt-3 rounded-xl bg-amber-500/10 p-2.5 text-[11px] text-amber-950 dark:text-amber-200">
                    <Sparkles className="mr-1 inline h-3 w-3 text-amber-600" />
                    <b>İpucu:</b> {trip.proTip}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-black/5 pt-3 dark:border-white/5">
                  <div>
                    <div className="text-[10px] opacity-60">Gidiş-Dönüş Ulaşım</div>
                    <div className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {trip.roundTripEur === 0
                        ? "ÜCRETSİZ (0 €)"
                        : `${fmtCur(rtTry, cur, rates)} (~${trip.roundTripEur} €)`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddDayTripToDay(trip)}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-500"
                  >
                    <Plus className="h-3.5 w-3.5" /> Gün {activeDay}&apos;e Ekle
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div></Localize>
  );
}
