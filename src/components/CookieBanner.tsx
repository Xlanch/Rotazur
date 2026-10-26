"use client";

import { Localize } from "@/components/Localize";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, ShieldCheck, X, Settings2 } from "lucide-react";
import { LegalModal } from "./LegalModal";
import { useLanguage } from "./LanguageContext";

export function CookieBanner() {
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const consent = localStorage.getItem("rotazur_cookie_consent");
      if (!consent) {
        // İlk ziyarette kullanıcı sayfayı gördükten 1 saniye sonra yumuşakça belirsin
        const timer = setTimeout(() => {
          setVisible(true);
        }, 1000);
        return () => clearTimeout(timer);
      }
    } catch {
      // LocalStorage engelliyse gösterme
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem("rotazur_cookie_consent", "all");
    } catch {}
    setVisible(false);
  };

  const handleAcceptNecessary = () => {
    try {
      localStorage.setItem("rotazur_cookie_consent", "necessary");
    } catch {}
    setVisible(false);
  };

  if (!mounted) return null;

  return (
    <Localize><>
      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="fixed bottom-4 inset-x-4 sm:bottom-6 sm:right-6 sm:inset-x-auto sm:max-w-md z-[1150]"
          >
            <div className="relative rounded-3xl border border-black/10 bg-white/95 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0e0d1c]/95 text-black dark:text-white">
              {/* Kapat Butonu */}
              <button
                onClick={handleAcceptNecessary}
                className="absolute right-4 top-4 rounded-full p-1 text-black/40 hover:text-black hover:bg-black/5 dark:text-white/40 dark:hover:text-white dark:hover:bg-white/5 transition"
                title="Kapat"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="flex items-start gap-3.5 pr-6">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-tr from-amber-500 to-brand-500 text-white shadow-lg shadow-amber-500/20">
                  <Cookie className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm sm:text-base tracking-tight">
                    Cookies
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-black/65 dark:text-white/65">
                    {t.cookieText}
                  </p>
                </div>
              </div>

              {/* Butonlar */}
              <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="btn-primary w-full sm:w-auto flex-1 !py-2.5 text-xs font-bold shadow-md shadow-brand-500/20"
                >
                  {t.cookieAccept}
                </button>
                <button
                  type="button"
                  onClick={handleAcceptNecessary}
                  className="w-full sm:w-auto rounded-xl border border-black/10 bg-black/[0.03] px-3.5 py-2.5 text-xs font-semibold text-black/75 hover:bg-black/5 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/75 dark:hover:bg-white/10 transition"
                >
                  {t.cookieDecline}
                </button>
                <button
                  type="button"
                  onClick={() => setLegalOpen(true)}
                  className="text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline px-1 py-1"
                >
                  Detaylar
                </button>
              </div>

              {/* Alt Küçük Güven Rozeti */}
              <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-black/45 dark:text-white/40">
                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                <span>Kişisel verileriniz KVKK kapsamında 256-Bit SSL ile korunmaktadır.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detaylar Tıklandığında Açılan Çerez Politikası Modalı */}
      <LegalModal
        isOpen={legalOpen}
        onClose={() => setLegalOpen(false)}
        type="cookies"
      />
    </></Localize>
  );
}
