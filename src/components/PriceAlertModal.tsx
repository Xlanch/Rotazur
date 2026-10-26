"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BellRing, Check, Mail, Sparkles, X } from "lucide-react";
import { fmtCur, tl } from "@/lib/format";
import { useCurrency } from "./CurrencyContext";
import { useAuth } from "./AuthContext";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cityId: string;
  cityName: string;
  currentPrice: number;
  origin?: string;
}

export function PriceAlertModal({ isOpen, onClose, cityId, cityName, currentPrice, origin = "IST" }: Props) {
  const { fmtCur } = useLocaleFormat();
  const { currency, rates } = useCurrency();
  const { user, openAuthModal } = useAuth();
  const [targetPrice, setTargetPrice] = useState(Math.round(currentPrice * 0.85));
  const [email, setEmail] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const requestRevision = useRef(0);
  const submission = useRef<AbortController | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    requestRevision.current++;
    submission.current?.abort();
    submission.current = null;
    clearTimeout(closeTimer.current);
    setEmail(user?.email || "");
    setTargetPrice(Math.round(currentPrice * 0.85));
    setSuccess(false); setError(null); setSaving(false);
    return () => {
      requestRevision.current++;
      submission.current?.abort();
      submission.current = null;
      clearTimeout(closeTimer.current);
    };
  }, [isOpen, cityId, origin, currentPrice, user?.id, user?.email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { onClose(); openAuthModal("login"); return; }
    if (!isOpen || submission.current) return;
    const revision = requestRevision.current;
    const controller = new AbortController();
    submission.current = controller;
    setError(null);
    setSaving(true);
    try {
    const response = await fetch("/api/price-alerts", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cityId,
        cityName,
        targetPriceTry: targetPrice,
        currentPriceTry: currentPrice,
        origin,
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Alarm kaydedilemedi.");
    if (revision !== requestRevision.current || controller.signal.aborted) return;
    setSuccess(true);
    closeTimer.current = setTimeout(() => {
      if (revision !== requestRevision.current) return;
      setSuccess(false);
      onClose();
    }, 2200);
    } catch (err) {
      if (revision === requestRevision.current && !controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "Alarm kaydedilemedi.");
      }
    } finally {
      if (revision === requestRevision.current) { submission.current = null; setSaving(false); }
    }
  };

  return (
    <Localize><AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[1100] bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-x-4 top-24 z-[1200] mx-auto max-w-md overflow-hidden rounded-3xl border border-black/10 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0d0c18]/95 sm:inset-x-auto sm:w-full"
          >
            <div className="flex items-center justify-between border-b border-black/5 pb-4 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
                  <BellRing className="h-4 w-4" />
                </span>
                <h3 className="font-bold">Fiyat Alarmı Kur</h3>
              </div>
              <button onClick={onClose} className="btn-ghost !p-1.5 text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {success ? (
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-8 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
                  <Check className="h-6 w-6" />
                </div>
                <h4 className="mt-4 text-lg font-bold">Alarm Başarıyla Kuruldu!</h4>
                <p className="mt-1 text-xs text-black/60 dark:text-white/60">
                  Fiyat takip koşulunuz hesabınıza kaydedildi. E-posta bildirimleri henüz etkin değil.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="rounded-2xl bg-black/[0.03] p-4 text-xs dark:bg-white/[0.04]">
                  <div className="text-black/50 dark:text-white/50">Şehir & Güncel Taban Fiyat</div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-base font-bold">{cityName} Uçuşu</span>
                    <span className="text-base font-extrabold text-gradient">{fmtCur(currentPrice, currency, rates)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Hedef Fiyatınız</span>
                    <span className="font-bold text-brand-600 dark:text-brand-400">{fmtCur(targetPrice, currency, rates)}</span>
                  </div>
                  <input
                    type="range"
                    min={Math.round(currentPrice * 0.5)}
                    max={currentPrice}
                    step={100}
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(Number(e.target.value))}
                    className="mt-2 w-full"
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-black/40 dark:text-white/40">
                    <span>{fmtCur(currentPrice * 0.5, currency, rates)} (%50 indirim)</span>
                    <span>{fmtCur(currentPrice, currency, rates)}</span>
                  </div>
                </div>

                <div>
                  <label className="label flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> E-posta Adresiniz</label>
                  <input
                    type="email"
                    required={!!user}
                    placeholder="ornek@email.com"
                    value={user?.email || email}
                    readOnly={!!user}
                    onChange={(e) => setEmail(e.target.value)}
                    className="field"
                  />
                </div>

                {error && <p role="alert" className="text-xs text-rose-500">{error}</p>}
                <button type="submit" disabled={saving} className="btn-primary w-full text-sm">
                  <Sparkles className="h-4 w-4" /> {saving ? "Kaydediliyor..." : user ? "Alarmı Başlat" : "Giriş Yap ve Alarm Kur"}
                </button>
              </form>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence></Localize>
  );
}
