"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";

import { motion } from "framer-motion";
import { tl } from "@/lib/format";
import type { BudgetBreakdown } from "@/lib/types";

export const BUDGET_PARTS = [
  { key: "flight", label: "Uçuş", color: "#7c4dff" },
  { key: "hotel", label: "Konaklama", color: "#d946ef" },
  { key: "food", label: "Yemek", color: "#14c8c8" },
  { key: "transport", label: "Ulaşım", color: "#f59e0b" },
  { key: "activities", label: "Aktiviteler", color: "#22c55e" },
] as const;

export function BudgetDonut({ b, budget, size = 200 }: { b: BudgetBreakdown; budget: number; size?: number }) {
  const { tl } = useLocaleFormat();
  const r = size / 2 - 14;
  const C = 2 * Math.PI * r;
  const denom = Math.max(b.total, budget);
  let offset = 0;
  const over = b.remaining < 0;

  return (
    <Localize><div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={16} className="stroke-black/5 dark:stroke-white/5" />
        {BUDGET_PARTS.map((p, i) => {
          const v = b[p.key];
          const len = (v / denom) * C;
          const el = (
            <motion.circle
              key={p.key}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={p.color}
              strokeWidth={16}
              strokeLinecap="butt"
              initial={{ strokeDasharray: `0 ${C}` }}
              animate={{ strokeDasharray: `${Math.max(len - 2, 0)} ${C}`, strokeDashoffset: -offset }}
              transition={{ duration: 0.9, delay: i * 0.08, ease: "easeOut" }}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-black/45 dark:text-white/45">{over ? "Bütçe aşımı" : "Kalan"}</div>
          <motion.div key={b.remaining} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className={`text-2xl font-extrabold ${over ? "text-rose-500" : "text-emerald-500"}`}>
            {tl(Math.abs(b.remaining))}
          </motion.div>
          <div className="text-xs text-black/45 dark:text-white/45">{tl(b.total)} / {tl(budget)}</div>
        </div>
      </div>
    </div></Localize>
  );
}
