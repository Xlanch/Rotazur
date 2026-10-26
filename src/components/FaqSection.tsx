"use client";

import { Localize } from "@/components/Localize";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";

export function FaqSection() {
  const { t } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    { q: t.faq1Q, a: t.faq1A },
    { q: t.faq2Q, a: t.faq2A },
    { q: t.faq3Q, a: t.faq3A },
    { q: t.faq4Q, a: t.faq4A },
  ];

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <Localize><section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
          <HelpCircle className="h-3.5 w-3.5" /> {t.faqBadge}
        </span>
        <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
          {t.faqTitle} <span className="text-gradient">{t.faqSubtitle}</span>
        </h2>
        <p className="mt-3 text-sm sm:text-base text-black/60 dark:text-white/60">
          {t.howItWorksDesc}
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen
                  ? "bg-white/80 dark:bg-white/5 border-brand-500/40 shadow-lg shadow-brand-500/5"
                  : "bg-white/40 dark:bg-white/[0.02] border-black/5 dark:border-white/10 hover:border-black/15 dark:hover:border-white/20"
              }`}
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 font-semibold text-base sm:text-lg select-none"
              >
                <span className={`${isOpen ? "text-brand-600 dark:text-brand-400" : "text-black/85 dark:text-white/90"}`}>
                  {faq.q}
                </span>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-black/40 dark:text-white/40 transition-transform duration-300 ${
                    isOpen ? "rotate-180 text-brand-500" : ""
                  }`}
                />
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="px-6 pb-5 pt-1 text-sm sm:text-base leading-relaxed text-black/70 dark:text-white/70 border-t border-black/5 dark:border-white/5">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section></Localize>
  );
}
