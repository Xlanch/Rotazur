"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  Clock,
  Mail,
  Plus,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";
import { fmtCur, tl } from "@/lib/format";
import { useCurrency } from "./CurrencyContext";
import { useAuth } from "./AuthContext";

export interface PriceAlertItem {
  id: string;
  cityId: string;
  cityName: string;
  origin?: string;
  targetPriceTry: number;
  currentPriceTry: number;
  email: string;
  createdAt: string;
  triggered?: boolean;
  triggeredAt?: string;
  triggeredPrice?: number;
}

interface PriceAlertsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCreateModal?: () => void;
}

export function PriceAlertsManagerModal({
  isOpen,
  onClose,
  onOpenCreateModal,
}: PriceAlertsManagerModalProps) {
  const { fmtCur, locale } = useLocaleFormat();
  const { currency, rates } = useCurrency();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<PriceAlertItem[]>([]);
  const [alertsOwner, setAlertsOwner] = useState<string | null>(null);
  const requestRevision = useRef(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const revision = ++requestRevision.current;
    const controller = new AbortController();
    setAlerts([]);
    setAlertsOwner(user?.id || null);
    setDeletingId(null);
    setLoading(true);
    setError(null);
    if (!isOpen || !user?.id) {
      setLoading(false);
      if (isOpen) setError("Alarmlarınızı görmek için giriş yapın.");
      return () => { controller.abort(); requestRevision.current++; };
    }
    void (async () => {
      try {
        const res = await fetch("/api/price-alerts", { signal: controller.signal, cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Alarmlar yüklenemedi.");
        if (revision === requestRevision.current) setAlerts(data.alerts || []);
      } catch (err) {
        if (revision === requestRevision.current && !controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Alarmlar yüklenemedi.");
        }
      } finally {
        if (revision === requestRevision.current) setLoading(false);
      }
    })();
    return () => { controller.abort(); requestRevision.current++; };
  }, [isOpen, user?.id]);

  const handleDelete = async (id: string) => {
    const revision = requestRevision.current;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/price-alerts?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Alarm silinemedi. Tekrar deneyin.");
      if (revision === requestRevision.current) {
        setAlerts((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      if (revision === requestRevision.current) setError(err instanceof Error ? err.message : "Alarm silinemedi.");
    } finally {
      if (revision === requestRevision.current) setDeletingId(null);
    }
  };

  if (!isOpen) return null;
  const visibleAlerts = alertsOwner === user?.id ? alerts : [];

  return (
    <Localize><AnimatePresence>
      <div role="dialog" aria-modal="true" aria-labelledby="price-alerts-title" className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-5">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-[#11121d] sm:p-7"
        >
          {/* Kapat Butonu */}
          <button
            onClick={onClose}
            aria-label="Fiyat alarmlarını kapat"
            className="btn-ghost absolute right-4 top-4 !p-2 text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Başlık */}
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <BellRing className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Otomasyon & Takip Merkezi
                </span>
                <span className="rounded-full bg-black/5 px-2 py-0.2 text-[10px] font-bold dark:bg-white/10">
                  {visibleAlerts.length} Kayıtlı Takip
                </span>
              </div>
              <h2 id="price-alerts-title" className="text-xl font-extrabold">Kayıtlı Uçuş Fiyat Alarmlarım</h2>
              <p className="text-xs text-black/55 dark:text-white/55">
                Uçuş fiyatı takip koşullarınızı buradan yönetebilirsiniz.
              </p>
            </div>
          </div>

          {/* Liste Alanı */}
          <div className="mt-6 space-y-3">
            {error && <p role="alert" className="text-sm text-rose-500">{error}</p>}
            {loading ? (
              <div className="space-y-3">
                <div className="skeleton h-24 w-full rounded-2xl" />
                <div className="skeleton h-24 w-full rounded-2xl" />
              </div>
            ) : visibleAlerts.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-black/15 p-8 text-center dark:border-white/15">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-black/5 text-black/40 dark:bg-white/5 dark:text-white/40">
                  <BellOff className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-sm font-extrabold">Henüz Kayıtlı Bir Alarmınız Yok</h3>
                <p className="mt-1 text-xs text-black/55 dark:text-white/55">İlgilendiğiniz rotalar için hedef uçuş fiyatı belirleyebilirsiniz.</p>
                {onOpenCreateModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCreateModal();
                    }}
                    className="btn-primary mt-4 text-xs font-bold"
                  >
                    <Plus className="h-4 w-4" /> Yeni Fiyat Alarmı Kur
                  </button>
                )}
              </div>
            ) : (
              visibleAlerts.map((alert) => {
                const isTriggered = !!alert.triggered;
                return (
                  <div
                    key={alert.id}
                    className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 transition sm:flex-row sm:items-center ${
                      isTriggered
                        ? "border-emerald-500/40 bg-emerald-500/[0.05]"
                        : "border-black/10 bg-black/[0.015] dark:border-white/10 dark:bg-white/[0.02]"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm">
                          ✈️ {alert.origin || "IST"} ➔ {alert.cityName}
                        </span>
                        {isTriggered ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> FİYAT DÜŞTÜ! (
                            {alert.triggeredPrice ? fmtCur(alert.triggeredPrice, currency, rates) : "Tetiklendi"})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                            <Clock className="h-3 w-3" /> Canlı Takipte
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-black/65 dark:text-white/65">
                        <div>
                          Hedef Fiyat:{" "}
                          <span className="font-extrabold text-brand-600 dark:text-brand-400">
                            {fmtCur(alert.targetPriceTry, currency, rates)}
                          </span>
                        </div>
                        <div>·</div>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3 opacity-60" />
                          <span>{alert.email}</span>
                        </div>
                      </div>

                      <div className="text-[10px] opacity-45">
                        Kurulum Tarihi: {new Date(alert.createdAt).toLocaleDateString(locale)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleDelete(alert.id)}
                        disabled={deletingId !== null}
                        className="btn-ghost !p-2 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600"
                        title="Alarmı Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Alt Butonlar */}
          <div className="mt-6 flex items-center justify-between border-t border-black/10 pt-4 dark:border-white/10">
            <div className="text-xs text-black/55 dark:text-white/55">
              💡 Alarmlarınız hesabınıza bağlı olarak saklanır.
            </div>

            <button
              type="button"
              onClick={onClose}
              className="btn-ghost rounded-2xl border border-black/10 px-5 py-2 text-xs font-bold dark:border-white/10"
            >
              Kapat
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence></Localize>
  );
}
