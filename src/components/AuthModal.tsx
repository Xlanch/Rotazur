"use client";

import { Localize } from "@/components/Localize";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  MailCheck,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useAuth } from "./AuthContext";
import { LegalModal, LegalDocType } from "./LegalModal";
import { passwordPolicyError, MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH } from "@/lib/password-policy";
import { REGISTER_REQUEST_MESSAGE, RESET_REQUEST_MESSAGE } from "@/lib/auth-messages";

/**
 * Modern 6 Kutulu Etkileşimli OTP Giriş Bileşeni (Trendyol/Airbnb Standardı)
 */
function OtpBoxes({
  value,
  onChange,
  disabled = false,
  autoFocus = true,
}: {
  value: string;
  onChange: (val: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const digits = value.slice(0, 6).split("");

  return (
    <Localize><div
      onClick={() => inputRef.current?.focus()}
      className="relative flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer select-none py-2"
    >
      <input
        ref={inputRef}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, "").slice(0, 6);
          onChange(val);
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
        aria-label="6 haneli güvenlik kodu"
      />

      {[0, 1, 2, 3, 4, 5].map((index) => {
        const digit = digits[index] || "";
        const isCurrent = isFocused && (digits.length === index || (index === 5 && digits.length === 6));
        const isFilled = Boolean(digit);

        return (
          <React.Fragment key={index}>
            {index === 3 && (
              <span className="text-black/30 dark:text-white/30 font-bold px-0.5 select-none text-base sm:text-lg">
                –
              </span>
            )}
            <div
              className={`relative flex h-12 w-10 sm:h-14 sm:w-12 items-center justify-center rounded-2xl border text-xl sm:text-2xl font-black font-mono transition-all duration-150 ${
                isCurrent
                  ? "border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400 shadow-md shadow-brand-500/20 scale-105"
                  : isFilled
                  ? "border-black/30 bg-black/[0.04] text-black dark:border-white/30 dark:bg-white/[0.08] dark:text-white"
                  : "border-black/10 bg-black/[0.01] text-black/25 dark:border-white/10 dark:bg-white/[0.02] dark:text-white/25"
              }`}
            >
              {digit ? (
                <span>{digit}</span>
              ) : isCurrent ? (
                <span className="h-6 w-0.5 animate-pulse rounded-full bg-brand-500" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-black/20 dark:bg-white/20" />
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div></Localize>
  );
}

export function AuthModal() {
  const {
    authModalOpen,
    authModalMode,
    closeAuthModal,
    openAuthModal,
    setAuthModalMode,
    login,
    sendVerificationCode,
    verifyCode,
    sendPasswordResetCode,
    resetPassword,
    loginWithGoogle,
  } = useAuth();

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [legalDoc, setLegalDoc] = useState<LegalDocType | null>(null);
  const [loading, setLoading] = useState(false);

  // Kayıt Doğrulama (Register OTP)
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [realEmailSent, setRealEmailSent] = useState(false);
  const [countdown, setCountdown] = useState(60);

  // Şifremi Unuttum Adımları: 1 = E-posta Gönderme, 2 = Kod + Yeni Şifre
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);

  // Geri sayım sayacı (OTP tekrar gönderim için)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if ((isVerifying || (authModalMode === "forgot_password" && forgotStep === 2)) && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isVerifying, authModalMode, forgotStep, countdown]);

  if (!authModalOpen) return null;

  const resetState = () => {
    setIsVerifying(false);
    setForgotStep(1);
    setError(null);
    setSuccessMsg(null);
    setOtpCode("");
    setDevCode(null);
    setRealEmailSent(false);
  };

  // Normal Giriş veya Kayıt Kodu Gönderme
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    if (authModalMode === "login") {
      const res = await login(email, password);
      if (res.error) setError(res.error);
    } else if (authModalMode === "register") {
      const passwordError = passwordPolicyError(password);
      if (passwordError) { setError(passwordError); setLoading(false); return; }
      // Kayıt olma: E-postaya 6 haneli doğrulama kodu gönder
      const res = await sendVerificationCode(name, email, password);
      if (res.error) {
        setError(res.error);
      } else {
        setIsVerifying(true);
        setDevCode(res.devCode || null);
        setRealEmailSent(!!res.realEmailSent);
        setCountdown(60);
        setOtpCode(""); // Kullanıcı kodu kendi e-postasından bakıp girecek
      }
    }
    setLoading(false);
  };

  // Kayıt Doğrulama Kodu Onaylama
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length !== 6) {
      setError("Lütfen 6 haneli doğrulama kodunu eksiksiz girin.");
      return;
    }

    setError(null);
    setLoading(true);
    const res = await verifyCode(email, otpCode.trim());
    if (res.error) {
      setError(res.error);
    } else {
      setIsVerifying(false);
    }
    setLoading(false);
  };

  // Kayıt Doğrulama Kodunu Tekrar Gönder
  const handleResendRegisterCode = async () => {
    if (countdown > 0) return;
    setError(null);
    setLoading(true);
    const res = await sendVerificationCode(name, email, password);
    if (res.error) {
      setError(res.error);
    } else {
      setDevCode(res.devCode || null);
      setRealEmailSent(!!res.realEmailSent);
      setCountdown(60);
      setOtpCode("");
    }
    setLoading(false);
  };

  // Şifre Sıfırlama Kodu İste (Adım 1)
  const handleRequestPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!email || !email.includes("@")) {
      setError("Lütfen geçerli bir e-posta adresi girin.");
      return;
    }

    setLoading(true);
    const res = await sendPasswordResetCode(email);
    if (res.error) {
      setError(res.error);
    } else {
      setForgotStep(2);
      setDevCode(res.devCode || null);
      setRealEmailSent(!!res.realEmailSent);
      setCountdown(60);
      setOtpCode("");
      setSuccessMsg(res.message || RESET_REQUEST_MESSAGE);
    }
    setLoading(false);
  };

  // Şifreyi Yeni Kod ve Yeni Şifre ile Güncelle (Adım 2)
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!otpCode || otpCode.trim().length !== 6) {
      setError("Lütfen 6 haneli güvenlik kodunu eksiksiz girin.");
      return;
    }

    const passwordError = passwordPolicyError(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError("Girdiğiniz yeni şifreler birbiriyle eşleşmiyor.");
      return;
    }

    setLoading(true);
    const res = await resetPassword(email, otpCode.trim(), password);
    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMsg("Şifreniz başarıyla yenilendi! Şimdi yeni şifrenizle giriş yapabilirsiniz.");
      setTimeout(() => {
        setAuthModalMode("login");
        resetState();
      }, 1600);
    }
    setLoading(false);
  };

  // Google Girişi
  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    const res = await loginWithGoogle();
    if (res.error) setError(res.error);
    setLoading(false);
  };

  return (
    <Localize><AnimatePresence>
      <div className="fixed inset-0 z-[1200] grid place-items-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            resetState();
            closeAuthModal();
          }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-md overflow-hidden rounded-3xl border border-black/10 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-[#0f0e1c]/95 sm:p-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500/10 text-brand-500 dark:bg-brand-500/20 overflow-hidden">
                {authModalMode === "forgot_password" ? (
                  <KeyRound className="h-4 w-4 text-amber-500" />
                ) : isVerifying ? (
                  <MailCheck className="h-4 w-4 text-emerald-500" />
                ) : (
                  <img src="/logo.png" alt="Rotazur" className="h-6 w-6 object-contain" />
                )}
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                {authModalMode === "forgot_password"
                  ? "Şifre Sıfırlama"
                  : isVerifying
                  ? "E-Posta Onayı"
                  : "Rotazur Hesabı"}
              </span>
            </div>
            <button
              onClick={() => {
                resetState();
                closeAuthModal();
              }}
              className="grid h-8 w-8 place-items-center rounded-full text-black/50 hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* ============================================================ */}
          {/* 1. ŞİFREMİ UNUTTUM EKRANI (FORGOT PASSWORD)                 */}
          {/* ============================================================ */}
          {authModalMode === "forgot_password" ? (
            <div className="mt-5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetState();
                    setAuthModalMode("login");
                  }}
                  className="rounded-lg p-1 text-black/50 hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white"
                  title="Giriş Ekranına Dön"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h2 className="text-xl font-extrabold sm:text-2xl">
                  {forgotStep === 1 ? "Şifremi Unuttum 🔑" : "Yeni Şifre Belirle 🔒"}
                </h2>
              </div>

              <p className="mt-2 text-xs text-black/60 dark:text-white/60">
                {forgotStep === 1
                  ? "E-posta adresinizi yazın. Bu adres için şifre sıfırlama uygunsa güvenlik kodu iletilecektir."
                  : "E-postanıza gönderilen 6 haneli kodu ve yeni şifrenizi girerek hesabınızı güncelleyin."}
              </p>

              {/* Hata ve Başarı Kutuları */}
              {error && (
                <div className="mt-3 rounded-2xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="mt-3 rounded-2xl bg-emerald-500/10 p-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {successMsg}
                </div>
              )}

              {forgotStep === 1 ? (
                /* ADIM 1: E-posta Adresi İste */
                <form onSubmit={handleRequestPasswordReset} className="mt-5 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-black/70 dark:text-white/70">
                      Kayıtlı E-Posta Adresiniz
                    </label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3.5 top-3 h-4 w-4 text-black/40 dark:text-white/40" />
                      <input
                        type="email"
                        required
                        autoFocus
                        placeholder="ornek@gmail.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-field w-full pl-10 text-sm"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="btn-primary w-full py-3 text-sm font-bold shadow-lg shadow-brand-500/25 disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Kod Gönderiliyor...</span>
                      </div>
                    ) : (
                      "Doğrulama Kodu Gönder"
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        resetState();
                        setAuthModalMode("login");
                      }}
                      className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                    >
                      ← Giriş Ekranına Geri Dön
                    </button>
                  </div>
                </form>
              ) : (
                /* ADIM 2: Kod ve Yeni Şifre Formu */
                <form onSubmit={handleResetPasswordSubmit} className="mt-4 space-y-3.5">
                  {/* E-posta Adresi Özeti */}
                  <div className="flex items-center justify-between rounded-xl bg-black/[0.03] p-2.5 text-xs dark:bg-white/[0.04]">
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0 text-black/40 dark:text-white/40" />
                      <span className="truncate font-semibold text-black/80 dark:text-white/80">{email}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="shrink-0 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
                    >
                      Değiştir
                    </button>
                  </div>

                  {/* Gerçek E-posta / Yerel Bilgi Bildirimi */}
                  {realEmailSent ? (
                    <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                        <span>
                          6 haneli sıfırlama kodu <b className="font-bold">{email}</b> adresinize gönderildi. Lütfen Gmail gelen kutunuzu (ve spam klasörünü) kontrol edin.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-2.5 text-xs font-medium text-sky-800 dark:text-sky-200">
                      <div className="flex items-center gap-2">
                        <MailCheck className="h-4 w-4 shrink-0 text-sky-500" />
                        <span>{RESET_REQUEST_MESSAGE}</span>
                      </div>
                    </div>
                  )}

                  {/* Geliştirici / Yerel Test Kodu Düğmesi */}
                  {devCode && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setOtpCode(devCode)}
                      className="group flex cursor-pointer items-center justify-between gap-2 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/15 p-2.5 text-xs transition hover:border-amber-500 hover:shadow-md hover:shadow-amber-500/10"
                      title="Kodu kutulara doldurmak için tıklayın"
                    >
                      <div className="flex items-center gap-2">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold text-xs">
                          ⚡
                        </span>
                        <div className="text-left">
                          <span className="font-bold text-amber-900 dark:text-amber-200">Test Kodu: </span>
                          <span className="font-mono font-extrabold tracking-wider text-amber-950 dark:text-amber-100">{devCode}</span>
                        </div>
                      </div>
                      <span className="rounded-lg bg-amber-500/25 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:text-amber-100 group-hover:bg-amber-500 group-hover:text-white transition">
                        Tıkla ve Doldur ⚡
                      </span>
                    </div>
                  )}

                  {/* 6 Haneli OTP Kutuları */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-black/70 dark:text-white/70">
                        6 Haneli Güvenlik Kodu
                      </label>
                      <span className="text-[11px] text-black/40 dark:text-white/40">
                        {otpCode.length}/6
                      </span>
                    </div>
                    <OtpBoxes value={otpCode} onChange={setOtpCode} />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-black/70 dark:text-white/70">Yeni Şifre</label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-black/40 dark:text-white/40" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder={`En az ${MIN_PASSWORD_LENGTH} karakter`}
                        minLength={MIN_PASSWORD_LENGTH}
                        maxLength={MAX_PASSWORD_LENGTH}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-field w-full pl-10 pr-10 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-3 text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-black/70 dark:text-white/70">Yeni Şifre (Tekrar)</label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3.5 top-3 h-4 w-4 text-black/40 dark:text-white/40" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        placeholder="Şifreyi onaylayın"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="input-field w-full pl-10 pr-10 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3.5 top-3 text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>

                    {/* Canlı Şifre Eşleşme Bildirimi */}
                    {password && confirmPassword && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold">
                        {password === confirmPassword ? (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3 w-3" /> Şifreler eşleşiyor
                          </span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">
                            ⚠️ Şifreler birbiriyle eşleşmiyor
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6 || password !== confirmPassword}
                    className="btn-primary w-full py-3 text-sm font-bold shadow-lg shadow-brand-500/25 disabled:opacity-60"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Şifre Güncelleniyor...</span>
                      </div>
                    ) : (
                      "Şifremi Güncelle"
                    )}
                  </button>

                  <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-3 text-xs dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="text-black/50 hover:underline dark:text-white/50"
                    >
                      E-postayı Değiştir
                    </button>
                    <button
                      type="button"
                      onClick={handleRequestPasswordReset}
                      disabled={countdown > 0 || loading}
                      className={`font-semibold ${
                        countdown > 0
                          ? "text-black/40 dark:text-white/40 cursor-not-allowed"
                          : "text-brand-600 hover:underline dark:text-brand-400"
                      }`}
                    >
                      {countdown > 0 ? (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 inline animate-pulse" />
                          Tekrar Gönder ({countdown}s)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <RefreshCw className="h-3 w-3 inline" />
                          Kodu Tekrar Gönder
                        </span>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : isVerifying ? (
            /* ============================================================ */
            /* 2. KAYIT OLMA DOĞRULAMA KODU (OTP) EKRANI                    */
            /* ============================================================ */
            <div className="mt-5">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsVerifying(false)}
                  className="rounded-lg p-1 text-black/50 hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white"
                  title="Geri Dön"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
                <h2 className="text-xl font-extrabold sm:text-2xl">Onay Kodu 📬</h2>
              </div>
              <p className="mt-2 text-xs text-black/60 dark:text-white/60">
                Hesabınızı aktifleştirmek için 6 haneli güvenlik kodunu girin.
              </p>

              {/* E-posta Adresi Özeti */}
              <div className="mt-3 flex items-center justify-between rounded-xl bg-black/[0.03] p-2.5 text-xs dark:bg-white/[0.04]">
                <div className="flex items-center gap-2 truncate">
                  <Mail className="h-3.5 w-3.5 shrink-0 text-black/40 dark:text-white/40" />
                  <span className="truncate font-semibold text-black/80 dark:text-white/80">{email}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsVerifying(false)}
                  className="shrink-0 text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
                >
                  Değiştir
                </button>
              </div>

              {/* Gerçek E-posta / Yerel Bilgi Bildirimi */}
              {realEmailSent ? (
                <div className="mt-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                    <span>
                      6 haneli onay kodu <b className="font-bold">{email}</b> adresinize gönderildi! Lütfen Gmail gelen kutunuzu (ve spam klasörünü) kontrol ediniz.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-2.5 text-xs font-medium text-sky-800 dark:text-sky-200">
                  <div className="flex items-center gap-2">
                    <MailCheck className="h-4 w-4 shrink-0 text-sky-500" />
                    <span>{REGISTER_REQUEST_MESSAGE}</span>
                  </div>
                </div>
              )}

              {/* Geliştirici / Yerel Test Kodu Düğmesi */}
              {devCode && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setOtpCode(devCode)}
                  className="mt-3 group flex cursor-pointer items-center justify-between gap-2 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/15 p-2.5 text-xs transition hover:border-amber-500 hover:shadow-md hover:shadow-amber-500/10"
                  title="Kodu kutulara doldurmak için tıklayın"
                >
                  <div className="flex items-center gap-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold text-xs">
                      ⚡
                    </span>
                    <div className="text-left">
                      <span className="font-bold text-amber-900 dark:text-amber-200">Test Kodu: </span>
                      <span className="font-mono font-extrabold tracking-wider text-amber-950 dark:text-amber-100">{devCode}</span>
                    </div>
                  </div>
                  <span className="rounded-lg bg-amber-500/25 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:text-amber-100 group-hover:bg-amber-500 group-hover:text-white transition">
                    Tıkla ve Doldur ⚡
                  </span>
                </div>
              )}

              {/* Hata Kutusu */}
              {error && (
                <div className="mt-3 rounded-2xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="mt-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-black/70 dark:text-white/70">
                      6 Haneli Doğrulama Kodu
                    </label>
                    <span className="text-[11px] text-black/40 dark:text-white/40">
                      {otpCode.length}/6
                    </span>
                  </div>
                  <OtpBoxes value={otpCode} onChange={setOtpCode} />
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="btn-primary w-full py-3 text-sm font-bold shadow-lg shadow-brand-500/25 disabled:opacity-60"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Hesap Açılıyor...</span>
                    </div>
                  ) : (
                    "Doğrula ve Hesabı Oluştur"
                  )}
                </button>
              </form>

              {/* Kodu Tekrar Gönder */}
              <div className="mt-5 flex items-center justify-between border-t border-black/5 pt-4 text-xs dark:border-white/5">
                <button
                  type="button"
                  onClick={() => setIsVerifying(false)}
                  className="text-black/50 hover:underline dark:text-white/50"
                >
                  Bilgileri Değiştir
                </button>

                <button
                  type="button"
                  onClick={handleResendRegisterCode}
                  disabled={countdown > 0 || loading}
                  className={`font-semibold ${
                    countdown > 0
                      ? "text-black/40 dark:text-white/40 cursor-not-allowed"
                      : "text-brand-600 hover:underline dark:text-brand-400"
                  }`}
                >
                  {countdown > 0 ? (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 inline animate-pulse" />
                      Tekrar Gönder ({countdown}s)
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 inline" />
                      Kodu Tekrar Gönder
                    </span>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* 3. NORMAL GİRİŞ VE KAYIT FORMU                               */
            /* ============================================================ */
            <>
              {/* Tab Seçici */}
              <div className="mt-6 flex rounded-2xl bg-black/5 p-1 dark:bg-white/5">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setAuthModalMode("login");
                  }}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                    authModalMode === "login"
                      ? "bg-white text-black shadow-sm dark:bg-brand-600 dark:text-white"
                      : "text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
                  }`}
                >
                  Giriş Yap
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMsg(null);
                    setAuthModalMode("register");
                  }}
                  className={`flex-1 rounded-xl py-2 text-xs font-bold transition ${
                    authModalMode === "register"
                      ? "bg-white text-black shadow-sm dark:bg-brand-600 dark:text-white"
                      : "text-black/60 hover:text-black dark:text-white/60 dark:hover:text-white"
                  }`}
                >
                  Kayıt Ol
                </button>
              </div>

              {/* Başlık ve Açıklama */}
              <div className="mt-4">
                <h2 className="text-xl font-extrabold sm:text-2xl">
                  {authModalMode === "login" ? "Tekrar Hoş Geldiniz! 👋" : "Hesabınızı Oluşturun ✈️"}
                </h2>
                <p className="mt-1 text-xs text-black/60 dark:text-white/60">
                  {authModalMode === "login"
                    ? "Kayıtlı rotalarınıza, otellerinize ve fiyat alarmlarınıza güvenle ulaşın."
                    : "Kayıt olurken e-postanıza 6 haneli güvenlik onay kodu gönderilecektir."}
                </p>
              </div>

              {/* Google (Gmail) İle Hızlı Giriş */}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-black/10 bg-black/[0.02] py-3 text-sm font-semibold transition hover:bg-black/5 hover:border-black/20 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/10"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.35 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.16 0 9.98 0 12c0 2.02.45 3.84 1.24 5.42l4.04-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Google ile Devam Et</span>
                </button>
              </div>

              {/* Ayraç */}
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
                <span className="text-[11px] font-medium uppercase tracking-wider text-black/40 dark:text-white/40">
                  veya e-posta ile
                </span>
                <span className="h-px flex-1 bg-black/10 dark:bg-white/10" />
              </div>

              {/* Hata Kutusu */}
              {error && (
                <div className="mb-4 rounded-2xl bg-rose-500/10 p-3 text-xs font-semibold text-rose-600 dark:text-rose-400">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {authModalMode === "register" && (
                  <div>
                    <label className="text-xs font-semibold text-black/70 dark:text-white/70">Ad Soyad</label>
                    <div className="relative mt-1">
                      <User className="absolute left-3.5 top-3 h-4 w-4 text-black/40 dark:text-white/40" />
                      <input
                        type="text"
                        required
                        placeholder="Ahmet Yılmaz"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input-field w-full pl-10 text-sm"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-black/70 dark:text-white/70">E-Posta Adresi</label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3.5 top-3 h-4 w-4 text-black/40 dark:text-white/40" />
                    <input
                      type="email"
                      required
                      placeholder="ornek@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input-field w-full pl-10 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-black/70 dark:text-white/70">Şifre</label>
                    {authModalMode === "login" && (
                      <button
                        type="button"
                        onClick={() => {
                          setError(null);
                          setAuthModalMode("forgot_password");
                          setForgotStep(1);
                        }}
                        className="text-[11px] font-semibold text-brand-600 hover:underline dark:text-brand-400"
                      >
                        Şifremi Unuttum?
                      </button>
                    )}
                  </div>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3.5 top-3 h-4 w-4 text-black/40 dark:text-white/40" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder={authModalMode === "register" ? `En az ${MIN_PASSWORD_LENGTH} karakter` : "••••••••"}
                      minLength={authModalMode === "register" ? MIN_PASSWORD_LENGTH : undefined}
                      maxLength={MAX_PASSWORD_LENGTH}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field w-full pl-10 pr-10 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-black/40 hover:text-black dark:text-white/40 dark:hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary mt-2 w-full py-3 text-sm font-bold shadow-lg shadow-brand-500/25 disabled:opacity-60"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>İşleniyor...</span>
                    </div>
                  ) : authModalMode === "login" ? (
                    "Giriş Yap"
                  ) : (
                    "Onay Kodu Gönder"
                  )}
                </button>

                {authModalMode === "register" && (
                  <p className="mt-2 text-center text-[11px] leading-relaxed text-black/50 dark:text-white/45">
                    Kayıt olarak{" "}
                    <button
                      type="button"
                      onClick={() => setLegalDoc("terms")}
                      className="font-semibold underline hover:text-brand-500"
                    >
                      Kullanım Şartları
                    </button>
                    {" "}ve{" "}
                    <button
                      type="button"
                      onClick={() => setLegalDoc("privacy")}
                      className="font-semibold underline hover:text-brand-500"
                    >
                      Gizlilik & KVKK Politikası
                    </button>
                    &apos;nı kabul etmiş olursunuz.
                  </p>
                )}
              </form>

              {/* Alt Bilgi */}
              <div className="mt-5 text-center text-xs text-black/50 dark:text-white/50">
                {authModalMode === "login" ? (
                  <span>
                    Henüz bir hesabınız yok mu?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        resetState();
                        setAuthModalMode("register");
                      }}
                      className="font-bold text-brand-600 hover:underline dark:text-brand-400"
                    >
                      Hemen Kayıt Olun
                    </button>
                  </span>
                ) : (
                  <span>
                    Zaten hesabınız var mı?{" "}
                    <button
                      type="button"
                      onClick={() => {
                        resetState();
                        setAuthModalMode("login");
                      }}
                      className="font-bold text-brand-600 hover:underline dark:text-brand-400"
                    >
                      Giriş Yapın
                    </button>
                  </span>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Yasal Belgeler Modalı */}
      <LegalModal
        isOpen={!!legalDoc}
        onClose={() => setLegalDoc(null)}
        type={legalDoc || "privacy"}
      />
    </AnimatePresence></Localize>
  );
}
