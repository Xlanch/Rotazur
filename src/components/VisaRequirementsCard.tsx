"use client";

import { Localize } from "@/components/Localize";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Info,
  Globe2,
} from "lucide-react";
import { getCityVisaDetails } from "@/lib/providers/visa-assistant";
import { DEPARTURE_FEE_SOURCE } from "@/lib/departure-fee";
import type { City } from "@/lib/types";

interface VisaRequirementsCardProps {
  city: Pick<City, "id" | "name" | "country" | "visaType" | "visa">;
  departureDate?: string;
}

export function VisaRequirementsCard({ city, departureDate }: VisaRequirementsCardProps) {
  const [expanded, setExpanded] = useState(false);
  const details = getCityVisaDetails(city, departureDate);

  return (
    <Localize><div className="card relative overflow-hidden border border-black/10 bg-white/70 p-5 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-[#0f0e1c]/80 sm:p-6">
      {/* Üst Kısım: Başlık & Rozet */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/20">
            <Globe2 className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold tracking-tight text-base sm:text-lg">
                {city.country} Vize & Sınır Geçiş Rehberi
              </h3>
            </div>
            <p className="text-xs text-black/50 dark:text-white/50">
              Türk vatandaşları için genel seyahat hazırlık bilgileri
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold shadow-sm ${details.badgeColor}`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          {details.badgeTitle}
        </span>
      </div>

      {/* Özet Açıklama */}
      <div className="mt-4 rounded-2xl bg-black/[0.02] p-4 text-xs sm:text-sm leading-relaxed text-black/80 dark:bg-white/[0.03] dark:text-white/80 border border-black/5 dark:border-white/5">
        {details.summary}
      </div>

      {/* Temel Bilgi Kutucukları */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="rounded-xl border border-black/5 bg-white p-3 dark:border-white/5 dark:bg-white/5">
          <div className="font-semibold text-black/50 dark:text-white/50 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-500" />
            Kalış Süresi
          </div>
          <div className="mt-1 font-bold text-black dark:text-white">{details.duration}</div>
        </div>

        <div className="rounded-xl border border-black/5 bg-white p-3 dark:border-white/5 dark:bg-white/5">
          <div className="font-semibold text-black/50 dark:text-white/50 flex items-center gap-1">
            <CreditCard className="h-3.5 w-3.5 text-amber-500" />
            Yurt Dışına Çıkış Harcı
          </div>
          <div className="mt-1 font-bold text-black dark:text-white">{details.exitFee}</div>
          <div className="mt-1 text-[10px] text-black/55 dark:text-white/50">Plan bütçesinden ayrı · <a href={DEPARTURE_FEE_SOURCE} target="_blank" rel="noopener noreferrer" className="underline">GİB tutar ve muafiyet bilgisi</a></div>
        </div>

        <div className="rounded-xl border border-black/5 bg-white p-3 dark:border-white/5 dark:bg-white/5">
          <div className="font-semibold text-black/50 dark:text-white/50 flex items-center gap-1">
            <FileText className="h-3.5 w-3.5 text-emerald-500" />
            Pasaport Geçerliliği
          </div>
          <div className="mt-1 font-bold text-black dark:text-white">
            {details.passportValidityLabel || (details.category === "kimlik" ? "Kimlikle Geçiş (Pasaportsuz)" : "En Az 6 Ay")}
          </div>
        </div>
      </div>

      {/* Açılır Kapanır Detay Bölümü */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="mt-4 pt-4 border-t border-black/10 dark:border-white/10 space-y-4 text-xs">
              {/* Gerekli Evraklar Listesi */}
              <div>
                <h4 className="font-bold text-black dark:text-white flex items-center gap-1.5 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Sınır Kapısında Yanınızda Bulunması Gerekenler:
                </h4>
                <div className="grid sm:grid-cols-2 gap-2">
                  {details.essentialDocs.map((doc, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 rounded-xl bg-black/[0.02] p-2.5 dark:bg-white/[0.02] border border-black/5 dark:border-white/5"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                      <span className="text-black/75 dark:text-white/75">{doc}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sınır Polisi & Pasaport İpuçları */}
              <div className="rounded-2xl bg-amber-500/10 p-3.5 border border-amber-500/20 text-amber-900 dark:text-amber-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold">Sınır Kontrolü Önemli Hatırlatması:</span>
                    <p className="text-[11px] leading-relaxed opacity-90">{details.borderControlTips}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detayları Göster / Gizle Butonu */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="mt-4 w-full flex items-center justify-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 py-1 transition"
      >
        <span>{expanded ? "Evrak Listesini Gizle" : "Gerekli Evrakları ve Sınır İpuçlarını Gör"}</span>
        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} />
      </button>
    </div></Localize>
  );
}
