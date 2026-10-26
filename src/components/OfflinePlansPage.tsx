"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";

import { useEffect, useState } from "react";
import { Bookmark, WifiOff } from "lucide-react";
import { PlanView } from "./PlanView";
import { useSavedPlans } from "@/lib/storage";
import { getSavedPlans, savedPlanUrl } from "@/lib/saved-plans";
import { fmtDate, tl } from "@/lib/format";
import type { SavedPlan } from "@/lib/types";

export function OfflinePlansPage() {
  const { fmtDate, tl } = useLocaleFormat();
  const { plans, error: storageError } = useSavedPlans();
  const [plan, setPlan] = useState<SavedPlan | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("saved");
    if (id) {
      try {
        const saved = getSavedPlans().find((p) => p.id === id);
        if (saved?.snapshot) setPlan(saved);
        else setError("Bu planın tam kaydı bu tarayıcıda bulunamadı. Aşağıdan başka bir kayıt açabilirsiniz.");
      } catch { setError("Tarayıcı kayıtlarına erişilemedi. Depolama iznini kontrol edin."); }
    }
    setReady(true);
  }, []);

  if (plan?.snapshot) return <Localize><PlanView input={plan.snapshot.data.input} initialPlan={plan} /></Localize>;
  return (
    <Localize><main className="mx-auto min-h-[70vh] max-w-3xl px-4 pt-28 pb-16 sm:px-6">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-500"><WifiOff /></span>
        <div><h1 className="text-2xl font-extrabold">Kayıtlı Rotalarım</h1>
          <p className="text-sm text-black/55 dark:text-white/55">Bu tarayıcıya kaydettiğiniz seyahat planları</p></div>
      </div>
      {(error || storageError) && <p role="alert" className="mb-4 text-sm text-rose-600 dark:text-rose-400">{error || storageError}</p>}
      {!ready ? <div className="skeleton h-32 w-full" /> : plans.length === 0 ? (
        <div className="card p-6 text-center text-sm"><Bookmark className="mx-auto mb-3 text-brand-500" />
          Henüz bu cihazda kayıtlı bir plan yok. İnternete bağlıyken bir plan oluşturup kaydedin.</div>
      ) : <div className="space-y-3">{plans.map((p) => (
        <div key={p.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
          <div><h2 className="font-bold">{p.cityFlag} {p.cityName} · {p.country}</h2>
            <p className="mt-1 text-xs text-black/60 dark:text-white/60">{fmtDate(p.startDate)} – {fmtDate(p.endDate)} · {p.travelers} kişi · {tl(p.totalCostTry)}</p>
            <p className="mt-1 text-xs text-black/50 dark:text-white/50">{p.snapshot ? (p.offlineReadyAt ? "Çevrimdışı erişim hazır" : "Cihazda kayıtlı · çevrimdışı paketi hazırlayın") : "Eski bağlantı kaydı · açmak için internet gerekir"}</p>
          </div>
          <a className="btn-primary !px-3 !py-1.5 text-xs" href={savedPlanUrl(p)}>Aç</a>
        </div>
      ))}</div>}
      <p className="mt-5 text-xs text-black/50 dark:text-white/50">Yeni aramalar, canlı fiyatlar, çevrimiçi haritalar ve rezervasyon bağlantıları internet gerektirir. Kayıtlar bu tarayıcıda tutulur; tarayıcı verilerini silmek planları da siler.</p>
    </main></Localize>
  );
}
