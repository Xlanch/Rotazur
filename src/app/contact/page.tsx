"use client";

import { Localize } from "@/components/Localize";

import { useState } from "react";
import Link from "next/link";
import { Mail, Send, CheckCircle2, AlertCircle, Clock, ShieldCheck, ArrowLeft, MessageSquare } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("Genel Soru & Bilgi Talebi");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus("idle");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Mesaj gönderilemedi. Lütfen tekrar deneyin.");
      }

      setStatus("success");
      setName("");
      setEmail("");
      setMessage("");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Beklenmeyen bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Localize><main className="relative min-h-screen px-4 pb-20 pt-32 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 overflow-hidden">
        <div className="absolute left-1/2 top-10 h-80 w-80 -translate-x-1/2 rounded-full bg-brand-500/20 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link href="/" className="btn-ghost inline-flex items-center gap-1.5 text-xs">
            <ArrowLeft className="h-4 w-4" /> Ana Sayfa
          </Link>
        </div>

        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-500/10 px-4 py-1.5 text-xs font-bold text-brand-600 dark:text-brand-300">
            <Mail className="h-3.5 w-3.5" /> 7/24 Bize Ulaşın
          </span>
          <h1 className="mt-4 text-3xl sm:text-5xl font-black tracking-tight text-black dark:text-white">
            İletişim & <span className="text-gradient">Destek</span>
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-black/60 dark:text-white/60">
            Gezgin deneyiminiz, rota önerileriniz veya iş ortaklığı için ekibimize anında mesaj iletin.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {/* Sol: İletişim Bilgileri */}
          <div className="space-y-4">
            <div className="card p-6 border border-black/10 dark:border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-black/50 dark:text-white/50 font-medium">Doğrudan E-posta</div>
                  <a href="mailto:destekrotazur@gmail.com" className="font-bold text-sm text-brand-600 dark:text-brand-400 hover:underline">
                    destekrotazur@gmail.com
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-black/5 dark:border-white/5">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-black/50 dark:text-white/50 font-medium">Hızlı Yanıt Garantisi</div>
                  <div className="font-bold text-xs text-black dark:text-white">En geç 24 saat içinde</div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-black/5 dark:border-white/5">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-xs text-black/50 dark:text-white/50 font-medium">Gizlilik Güvencesi</div>
                  <div className="font-bold text-xs text-black dark:text-white">Bilgileriniz 3. taraflarla paylaşılmaz</div>
                </div>
              </div>
            </div>

            <div className="card p-5 border border-brand-500/20 bg-brand-500/5 text-xs text-black/70 dark:text-white/70">
              💡 <b>Sık Sorulan Sorular:</b> Rota oluşturma, otel rezervasyonu veya fiyat tahminleri hakkında aklınıza takılan sorular için <Link href="/#faq" className="underline font-bold text-brand-600 dark:text-brand-400">SSS bölümümüze</Link> göz atabilirsiniz.
            </div>
          </div>

          {/* Sağ: İletişim Formu */}
          <div className="lg:col-span-2">
            <div className="card p-6 sm:p-8 border border-black/10 dark:border-white/10 shadow-xl">
              {status === "success" ? (
                <div className="py-12 text-center space-y-4">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-black dark:text-white">Mesajınız Alındı!</h3>
                  <p className="max-w-md mx-auto text-sm text-black/60 dark:text-white/60">
                    Bize ulaştığınız için teşekkürler. Ekibimiz mesajınızı inceleyip en geç 24 saat içerisinde e-posta adresinize dönüş yapacaktır.
                  </p>
                  <button
                    onClick={() => setStatus("idle")}
                    className="btn-primary text-xs font-bold"
                  >
                    Yeni Bir Mesaj Gönder
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {status === "error" && (
                    <div className="flex items-center gap-2 rounded-2xl bg-rose-500/10 p-3.5 text-xs font-medium text-rose-600 dark:text-rose-400 border border-rose-500/20">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Adınız & Soyadınız *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Örn: Salih Emre"
                        className="field"
                      />
                    </div>
                    <div>
                      <label className="label">E-posta Adresiniz *</label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ornek@rotazur.com"
                        className="field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Konu / Kategori *</label>
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="field cursor-pointer"
                    >
                      <option value="Genel Soru & Bilgi Talebi">Genel Soru & Bilgi Talebi</option>
                      <option value="Rota & Şehir Önerisi">Rota & Şehir Önerisi</option>
                      <option value="Hata & Teknik Sorun Bildirimi">Hata & Teknik Sorun Bildirimi</option>
                      <option value="İş Birliği & Sponsorluk">İş Birliği & Sponsorluk</option>
                      <option value="Diğer">Diğer</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Mesajınız *</label>
                    <textarea
                      required
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Size nasıl yardımcı olabiliriz? Lütfen detayları paylaşın..."
                      className="field resize-none scroll-thin"
                    />
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-black/45 dark:text-white/45">
                      * Tüm alanların doldurulması zorunludur.
                    </span>
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary text-xs font-bold gap-2"
                    >
                      {loading ? (
                        <>Gönderiliyor...</>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Mesajı Gönder
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </main></Localize>
  );
}
