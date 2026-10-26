"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";

import { motion, AnimatePresence } from "framer-motion";
import { Bookmark, Calendar, Trash2, X, ArrowRight, Users, Wallet } from "lucide-react";
import { useSavedPlans } from "@/lib/storage";
import { savedPlanUrl } from "@/lib/saved-plans";
import { fmtDate, tl } from "@/lib/format";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SavedPlansModal({ isOpen, onClose }: Props) {
  const { fmtDate, tl } = useLocaleFormat();
  const { plans, remove, error } = useSavedPlans();

  return (
    <Localize><AnimatePresence>
      {isOpen && (
        <>
          {/* Karartma overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm"
          />

          {/* Çekmece / Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="fixed inset-x-4 top-20 z-[1200] mx-auto max-w-xl overflow-hidden rounded-3xl border border-black/10 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0d0c18]/95 sm:inset-x-auto sm:w-full"
          >
            <div className="flex items-center justify-between border-b border-black/5 pb-4 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
                  <Bookmark className="h-4 w-4" />
                </span>
                <h3 className="text-lg font-bold">Kayıtlı Rotalarım</h3>
                <span className="rounded-full bg-brand-500/10 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:text-brand-300">
                  {plans.length}
                </span>
              </div>
              <button onClick={onClose} className="btn-ghost !p-1.5 text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] space-y-3 overflow-y-auto pr-1 scroll-thin">
              {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
              {plans.length === 0 ? (
                <div className="py-12 text-center text-sm text-black/50 dark:text-white/50">
                  Henüz kaydedilmiş bir gezi planınız yok.<br />
                  Beğendiğiniz rotalarda <b>"Planı Kaydet"</b> butonuna basarak buraya ekleyebilirsiniz.
                </div>
              ) : (
                plans.map((p) => (
                  <div
                    key={p.id}
                    className="card flex flex-col justify-between gap-3 p-4 transition hover:border-brand-400 sm:flex-row sm:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{p.cityFlag}</span>
                        <h4 className="font-bold">{p.cityName}</h4>
                        <span className="text-xs text-black/40 dark:text-white/40">· {p.country}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-black/50 dark:text-white/50">{p.snapshot ? (p.offlineReadyAt ? "Bu cihazda · çevrimdışı hazır" : "Bu cihazda kayıtlı") : "Eski bağlantı kaydı · internet gerekir"}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-black/60 dark:text-white/60">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {fmtDate(p.startDate)} – {fmtDate(p.endDate)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {p.travelers} Kişi
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-brand-600 dark:text-brand-400">
                          <Wallet className="h-3 w-3" />
                          {tl(p.totalCostTry)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <a
                        href={savedPlanUrl(p)}
                        onClick={onClose}
                        className="btn-primary !px-3 !py-1.5 text-xs"
                      >
                        Aç <ArrowRight className="h-3 w-3" />
                      </a>
                      <button
                        onClick={() => remove(p.id)}
                        className="btn-ghost !p-2 text-rose-500 hover:bg-rose-500/10"
                        title="Planı Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence></Localize>
  );
}
