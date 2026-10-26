"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { CurrencyCode, DEFAULT_RATES, fmtCur } from "@/lib/format";
import { isCurrencyCode, readCurrencyRates, rateTimestamp } from "@/lib/currency-rates";

export interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  label: string;
  flag: string;
}

export const CURRENCIES: CurrencyMeta[] = [
  { code: "TRY", symbol: "₺", label: "Türk Lirası", flag: "🇹🇷" },
  { code: "EUR", symbol: "€", label: "Euro", flag: "🇪🇺" },
  { code: "USD", symbol: "$", label: "US Dollar", flag: "🇺🇸" },
  { code: "GBP", symbol: "£", label: "British Pound", flag: "🇬🇧" },
  { code: "RUB", symbol: "₽", label: "Рубль", flag: "🇷🇺" },
  { code: "CNY", symbol: "¥", label: "人民币", flag: "🇨🇳" },
  { code: "SAR", symbol: "﷼", label: "ريال سعودي", flag: "🇸🇦" },
  { code: "AED", symbol: "د.إ", label: "درهم إماراتي", flag: "🇦🇪" },
];

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  rates: Record<CurrencyCode, number>;
  formatPrice: (tryAmount: number) => string;
  currencies: CurrencyMeta[];
  currentCurrency: CurrencyMeta;
  ratesLastUpdated?: string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "TRY",
  setCurrency: () => {},
  rates: DEFAULT_RATES,
  formatPrice: (amt) => fmtCur(amt, "TRY", DEFAULT_RATES),
  currencies: CURRENCIES,
  currentCurrency: CURRENCIES[0],
});

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { fmtCur } = useLocaleFormat();
  const [currency, setCurrencyState] = useState<CurrencyCode>("TRY");
  const [rates, setRates] = useState<Record<CurrencyCode, number>>(DEFAULT_RATES);
  const [ratesLastUpdated, setRatesLastUpdated] = useState<string | undefined>(undefined);

  // Canlı kurları arka plandan çek
  useEffect(() => {
    const controller = new AbortController();
    async function loadRates() {
      try {
        const res = await fetch("/api/currency", { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          const valid = readCurrencyRates(data);
          if (valid && !controller.signal.aborted) {
            setRates(valid);
            setRatesLastUpdated(rateTimestamp(data.updatedAt));
          }
        }
      } catch {
        // Fallback varsayılan kurlar kullanılır
      }
    }
    loadRates();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("rotazur_currency");
      if (isCurrencyCode(saved)) {
        setCurrencyState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setCurrency = (c: CurrencyCode) => {
    if (!isCurrencyCode(c)) return;
    setCurrencyState(c);
    try {
      localStorage.setItem("rotazur_currency", c);
    } catch {
      // ignore
    }
  };

  const currentCurrency = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];

  const formatPrice = (tryAmount: number) => {
    return fmtCur(tryAmount, currency, rates);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        rates,
        formatPrice,
        currencies: CURRENCIES,
        currentCurrency,
        ratesLastUpdated,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
