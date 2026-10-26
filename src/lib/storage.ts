import { useEffect, useState } from "react";
import type { PriceAlert, SavedPlanSnapshot, SavedPlan, SearchInput } from "./types";
import { getSavedPlans, savePlanToStorage, removeSavedPlan, planIdentity, SAVED_PLANS_EVENT, SAVED_PLANS_KEY } from "./saved-plans";
export { getSavedPlans, savePlanToStorage, removeSavedPlan } from "./saved-plans";

const ALERTS_KEY = "rota_price_alerts_v1";

export function useSavedPlans() {
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const refresh = () => {
      try { setPlans(getSavedPlans()); setError(null); }
      catch { setError("Kayıtlı planlar okunamadı. Tarayıcı depolama iznini kontrol edin."); }
    };
    const onStorage = (event: StorageEvent) => { if (event.key === SAVED_PLANS_KEY || event.key === null) refresh(); };
    refresh();
    window.addEventListener(SAVED_PLANS_EVENT, refresh);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SAVED_PLANS_EVENT, refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const save = (snapshot: SavedPlanSnapshot, id?: string) => savePlanToStorage(snapshot, id);

  const remove = (id: string) => {
    try { removeSavedPlan(id); }
    catch (err) { setError(err instanceof Error ? err.message : "Plan silinemedi."); }
  };

  const isSaved = (input: SearchInput) => {
    return plans.some((p) => p.snapshot && planIdentity(p.snapshot.data.input) === planIdentity(input));
  };

  return { plans, save, remove, isSaved, error };
}

// Fiyat Alarmları
export function getPriceAlerts(): PriceAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function savePriceAlert(alert: Omit<PriceAlert, "id" | "createdAt">): PriceAlert {
  const list = getPriceAlerts();
  const newAlert: PriceAlert = {
    ...alert,
    id: `alert_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  const updated = [newAlert, ...list];
  localStorage.setItem(ALERTS_KEY, JSON.stringify(updated));
  return newAlert;
}
