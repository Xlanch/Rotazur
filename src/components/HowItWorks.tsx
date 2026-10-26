"use client";

import { Localize } from "@/components/Localize";

import { motion } from "framer-motion";
import { Sliders, Sparkles, FileDown, ArrowRight } from "lucide-react";
import { useLanguage } from "@/components/LanguageContext";

export function HowItWorks() {
  const { t } = useLanguage();

  const steps = [
    {
      step: "01",
      icon: Sliders,
      title: t.step1Title,
      desc: t.step1Desc,
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      step: "02",
      icon: Sparkles,
      title: t.step2Title,
      desc: t.step2Desc,
      gradient: "from-brand-500 to-purple-500",
    },
    {
      step: "03",
      icon: FileDown,
      title: t.step3Title,
      desc: t.step3Desc,
      gradient: "from-emerald-500 to-teal-500",
    },
  ];

  return (
    <Localize><section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
          {t.howItWorks}
        </span>
        <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight">
          {t.howItWorksTitle}
        </h2>
        <p className="mt-3 text-sm sm:text-base text-black/60 dark:text-white/60">
          {t.howItWorksDesc}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 relative">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="card relative p-8 group overflow-hidden border border-black/5 dark:border-white/10 hover:shadow-xl hover:shadow-brand-500/5 transition-all duration-300"
            >
              {/* Arka plan büyük numara efekti */}
              <div className="absolute -top-3 -right-2 text-7xl font-black text-black/5 dark:text-white/5 select-none pointer-events-none group-hover:text-brand-500/10 transition-colors">
                {s.step}
              </div>

              <div className={`h-12 w-12 rounded-2xl bg-gradient-to-tr ${s.gradient} text-white flex items-center justify-center shadow-lg shadow-brand-500/20 mb-6 group-hover:scale-110 transition-transform`}>
                <Icon className="h-6 w-6" />
              </div>

              <div className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-1">
                {s.step}
              </div>
              <h3 className="text-xl font-bold tracking-tight mb-2.5">
                {s.title}
              </h3>
              <p className="text-sm leading-relaxed text-black/60 dark:text-white/60">
                {s.desc}
              </p>
            </motion.div>
          );
        })}
      </div>
    </section></Localize>
  );
}
