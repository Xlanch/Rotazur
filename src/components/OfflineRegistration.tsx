"use client";

import { useEffect } from "react";
import { registerOfflineWorker } from "@/lib/offline";

export function OfflineRegistration() {
  useEffect(() => { registerOfflineWorker().catch(() => {}); }, []);
  return null;
}
