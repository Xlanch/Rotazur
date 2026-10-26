"use client";

import { Localize } from "./Localize";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bookmark, Compass, LogIn, LogOut, Moon, Plane, Sun, User, Sparkles, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { SavedPlansModal } from "./SavedPlansModal";
import { AuthModal } from "./AuthModal";
import { useAuth } from "./AuthContext";
import { useCurrency } from "./CurrencyContext";
import { useLanguage } from "./LanguageContext";
import { useSavedPlans } from "@/lib/storage";

export function Navbar() {
  const [dark, setDark] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currOpen, setCurrOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const currRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const { plans } = useSavedPlans();
  const { user, openAuthModal, logout } = useAuth();
  const { currency, setCurrency, currencies, currentCurrency } = useCurrency();
  const { lang, setLang, t, languages, currentMeta } = useLanguage();

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const onScroll = () => setScrolled(window.scrollY > 10);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Menü dışına tıklanınca kapat
  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (currRef.current && !currRef.current.contains(e.target as Node)) {
        setCurrOpen(false);
      }
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  };

  return (
    <Localize><>
      <header className="fixed inset-x-0 top-0 z-[1000] px-4 pt-3">
        <nav
          className={`mx-auto flex max-w-7xl items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300 ${
            scrolled ? "glass" : "border border-transparent"
          }`}
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight group">
            <motion.div
              whileHover={{ scale: 1.08, rotate: 2 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className="relative h-9 w-9 sm:h-10 sm:w-10 shrink-0 drop-shadow-md"
            >
              <img
                src="/logo.png"
                alt="Rotazur Logo"
                className="h-full w-full object-contain"
              />
            </motion.div>
            <div className="flex flex-col leading-tight">
              <span translate="no" className="text-[17px] sm:text-[19px] font-black tracking-tight text-black dark:text-white">
                ROTA<span className="text-gradient">ZUR</span>
              </span>
              <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-black/45 dark:text-white/45">
                Your Travel Route
              </span>
            </div>
          </Link>

          {/* Menü & Aksiyonlar */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/discover"
              className="btn-ghost !p-2 sm:!px-3 text-xs sm:text-sm"
              title="Şehirleri Keşfet"
            >
              <Compass className="h-4 w-4" />
              <span className="hidden sm:inline">{t.discover}</span>
            </Link>

            <button
              onClick={() => setSavedOpen(true)}
              className="btn-ghost relative !p-2 sm:!px-3 text-xs sm:text-sm"
              title="Kayıtlı Rotalarım"
            >
              <Bookmark className="h-4 w-4" />
              <span className="hidden sm:inline">{t.myRoutes}</span>
              {plans.length > 0 && (
                <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-white shadow">
                  {plans.length}
                </span>
              )}
            </button>

            {/* Giriş Yap / Profil Menüsü */}
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-1.5 rounded-2xl border border-black/10 bg-black/[0.03] py-1.5 pl-2 pr-2.5 text-xs font-bold transition hover:bg-black/5 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/10"
                >
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-6 w-6 rounded-full object-cover ring-1 ring-brand-500"
                    />
                  ) : (
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                      {user.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span translate="no" className="hidden sm:inline max-w-[100px] truncate sm:max-w-[130px]">{user.name}</span>
                  <ChevronDown className={`h-3.5 w-3.5 opacity-60 transition ${menuOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Açılır Profil Menüsü */}
                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-black/10 bg-white/95 p-2 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0f0e1c]/95 z-50"
                    >
                      <div className="border-b border-black/5 p-3 dark:border-white/5">
                        <div translate="no" className="font-bold text-sm text-black dark:text-white">{user.name}</div>
                        <div translate="no" className="text-[11px] text-black/50 dark:text-white/50 truncate">{user.email}</div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="rounded-md bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-bold text-brand-600 dark:text-brand-300">
                            {user.provider === "google" ? "Google Hesabı" : "E-posta Üyesi"}
                          </span>
                        </div>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            setSavedOpen(true);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/5"
                        >
                          <Bookmark className="h-4 w-4 text-brand-500" />
                          <span>{t.mySavedRoutes} ({plans.length})</span>
                        </button>
                      </div>

                      <div className="border-t border-black/5 pt-1 dark:border-white/5">
                        <button
                          onClick={async () => {
                            setMenuOpen(false);
                            await logout();
                          }}
                          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>{t.signOut}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => openAuthModal("login")}
                className="btn-primary !py-1.5 !px-2.5 sm:!px-3 text-xs sm:text-sm font-semibold"
                title={t.signIn}
              >
                <LogIn className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t.signIn}</span>
              </button>
            )}

            {/* Para Birimi Seçici (8 Global Para Birimi) */}
            <div className="relative" ref={currRef}>
              <button
                onClick={() => setCurrOpen(!currOpen)}
                className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-black/10 bg-black/[0.03] px-2 py-1.5 sm:px-2.5 text-xs font-bold transition hover:bg-black/5 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/10"
                title="Para Birimi Değiştir / Change Currency"
              >
                <span className="font-black text-brand-600 dark:text-brand-400">
                  {currentCurrency.symbol}
                </span>
                <span className="hidden sm:inline text-[11px] font-semibold">{currency}</span>
                <ChevronDown className={`h-3 w-3 opacity-60 transition-transform ${currOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {currOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-48 max-h-80 overflow-y-auto rounded-2xl border border-black/10 bg-white/95 p-1.5 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0f0e1c]/95 z-50 scroll-thin"
                  >
                    {currencies.map((c) => (
                      <button
                        key={c.code}
                        onClick={() => {
                          setCurrency(c.code);
                          setCurrOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          currency === c.code
                            ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold"
                            : "text-black/75 hover:bg-black/5 dark:text-white/75 dark:hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-base">{c.flag}</span>
                          <span className="w-5 text-center font-bold text-brand-500">
                            {c.symbol}
                          </span>
                          <span className="truncate">{c.code} ({c.label})</span>
                        </span>
                        {currency === c.code && <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dil Seçici (8 Global Dil) */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1 sm:gap-1.5 rounded-xl border border-black/10 bg-black/[0.03] px-2 py-1.5 text-xs font-bold transition hover:bg-black/5 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/10 select-none"
                title="Dil Değiştir / Change Language"
              >
                <span>{currentMeta.flag}</span>
                <span translate="no" className="hidden sm:inline text-[11px] uppercase font-bold">{currentMeta.code}</span>
                <ChevronDown className={`h-3 w-3 opacity-60 transition-transform ${langOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-48 max-h-80 overflow-y-auto rounded-2xl border border-black/10 bg-white/95 p-1.5 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0f0e1c]/95 z-50 scroll-thin"
                  >
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        translate="no"
                        onClick={() => {
                          setLang(l.code);
                          setLangOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-semibold transition ${
                          lang === l.code
                            ? "bg-brand-500/10 text-brand-600 dark:text-brand-400 font-bold"
                            : "text-black/75 hover:bg-black/5 dark:text-white/75 dark:hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center gap-2.5">
                          <span className="text-base">{l.flag}</span>
                          <span className="truncate">{l.nativeName}</span>
                        </span>
                        {lang === l.code && <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tema Butonu */}
            <button onClick={toggle} className="btn-ghost !p-2" aria-label="Tema değiştir">
              {dark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Rotalar Modalı */}
      <SavedPlansModal isOpen={savedOpen} onClose={() => setSavedOpen(false)} />

      {/* Kimlik Doğrulama (Giriş / Kayıt) Modalı */}
      <AuthModal />
    </></Localize>
  );
}
