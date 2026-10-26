"use client";

import { Localize } from "@/components/Localize";

import { motion, AnimatePresence } from "framer-motion";
import { X, ShieldCheck, FileText, Info, Mail, Lock, CheckCircle2 } from "lucide-react";

export type LegalDocType = "about" | "privacy" | "terms" | "cookies";

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: LegalDocType;
}

export function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
  if (!isOpen) return null;

  const content = {
    about: {
      title: "Hakkımızda",
      subtitle: "Rotazur — Geleceğin Akıllı Seyahat & Rota Platformu",
      icon: Info,
      body: (
        <Localize><div className="space-y-4 text-sm leading-relaxed text-black/75 dark:text-white/75">
          <p>
            <strong>Rotazur</strong>, gezginlerin bütçelerine, ilgi alanlarına ve seyahat tarihlerine göre en akıllı, en ekonomik ve en keyifli gezi rotalarını saniyeler içinde çıkaran bağımsız bir seyahat teknolojisi (TravelTech) platformudur.
          </p>
          <h4 className="font-bold text-base text-black dark:text-white pt-2">Misyonumuz</h4>
          <p>
            Kullanıcılarımıza gösterge uçuş fiyatlarını, koşulları ve kontrol zamanı belirtilen otel sonuçlarını, hava tahminlerini ve günlük şehir rotalarını tek ekranda sunmaktır.
          </p>
          <h4 className="font-bold text-base text-black dark:text-white pt-2">Şeffaflık & Tarafsızlık İlkemiz</h4>
          <p>
            Rotazur, rota oluşturma veya bütçe hesaplama için gizli ücret talep etmez. Oteller SerpApi üzerinden Booking arama sonuçlarından, gösterge uçuş fiyatları Aviasales Data API üzerinden alınır. Saklanan sonuçlar ve bütçe tahminleri ayrıca işaretlenir. Kesin tutar, oda veya bilet koşulları ve müsaitlik satın alma sayfasında doğrulanır.
          </p>
          <div className="rounded-2xl bg-brand-500/10 p-4 border border-brand-500/20 text-xs">
            <b>Merkez & İletişim:</b> Rotazur Digital Travel Solutions · E-posta: <a href="mailto:destekrotazur@gmail.com" className="font-bold text-brand-600 dark:text-brand-400 underline">destekrotazur@gmail.com</a>
          </div>
        </div></Localize>
      ),
    },
    privacy: {
      title: "Gizlilik & KVKK Politikası",
      subtitle: "Kişisel Verilerin Korunması ve Güvenlik İlkelerimiz",
      icon: ShieldCheck,
      body: (
        <Localize><div className="space-y-4 text-sm leading-relaxed text-black/75 dark:text-white/75">
          <p>
            Rotazur olarak gizliliğinize en üst düzeyde önem veriyoruz. 6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) ve Avrupa Genel Veri Koruma Tüzüğü (GDPR) kapsamında verileriniz güvendedir.
          </p>
          <h4 className="font-bold text-base text-black dark:text-white pt-2">1. Toplanan Veriler</h4>
          <p>
            Sitemizi gezerken aradığınız rotalar, seçtiğiniz gezi tarihleri ve bütçe aralıkları yalnızca size en doğru seyahat planını oluşturmak ve önbelleklemek amacıyla işlenir. E-posta adresiniz yalnızca hesap açma, şifre sıfırlama veya kurduğunuz fiyat alarmlarını iletmek amacıyla kullanılır.
          </p>
          <h4 className="font-bold text-base text-black dark:text-white pt-2">2. Veri Güvenliği & Şifreleme</h4>
          <p>
            Hesap şifreleriniz sunucularımızda asla düz metin olarak saklanmaz; endüstri standardı PBKDF2/SHA-256 kriptografik tuzlama algoritmalarıyla şifrelenir. Oturumlarınız güvenli çerezlerle korunur.
          </p>
          <h4 className="font-bold text-base text-black dark:text-white pt-2">3. Üçüncü Taraflarla Paylaşım</h4>
          <p>
            Rotazur, kullanıcılarının kişisel bilgilerini veya e-posta adreslerini üçüncü taraflara pazarlama amacıyla <strong>kesinlikle satmaz veya kiralamaz</strong>. Otel veya uçak yönlendirmelerinde yalnızca arama parametreleri (şehir, tarih, kişi sayısı) anlaşmalı rezervasyon motoruna aktarılır.
          </p>
        </div></Localize>
      ),
    },
    terms: {
      title: "Kullanım Koşulları",
      subtitle: "Hizmet Şartları & Sorumluluk Beyanı",
      icon: FileText,
      body: (
        <Localize><div className="space-y-4 text-sm leading-relaxed text-black/75 dark:text-white/75">
          <p>
            Rotazur web sitesini kullanarak aşağıdaki kullanım şartlarını kabul etmiş sayılırsınız:
          </p>
          <h4 className="font-bold text-base text-black dark:text-white pt-2">1. Hizmetin Niteliği</h4>
          <p>
            Rotazur bir seyahat acentesi veya bilet satıcısı değildir; yapay zeka ve canlı algoritmalarla seyahat planları, gezi rotaları ve fiyat tahminleri oluşturan bir <strong>bilgi ve rota asistanıdır</strong>.
          </p>
          <h4 className="font-bold text-base text-black dark:text-white pt-2">2. Fiyat ve Rezervasyon Sorumluluğu</h4>
          <p>
            Sitede gösterilen uçak ve otel fiyatları dinamik piyasa koşullarına göre anlık olarak değişebilir. Kullanıcı nihai rezervasyonu tamamlamadan önce bilet veya oda sağlayıcısının (havayolu, Booking.com vb.) ekranındaki son fiyatı ve iptal koşullarını kontrol etmekle yükümlüdür.
          </p>
          <h4 className="font-bold text-base text-black dark:text-white pt-2">3. Fikri Mülkiyet</h4>
          <p>
            Rotazur logosu, marka ismi, rota optimizasyon algoritmaları ve dergi formatındaki seyahat şablonları Rotazur&apos;a aittir. İzinsiz kopyalanamaz veya ticari amaçla çoğaltılamaz.
          </p>
        </div></Localize>
      ),
    },
    cookies: {
      title: "Çerez Politikası",
      subtitle: "Kullanıcı Deneyimini Artıran Çerez Tercihleri",
      icon: Lock,
      body: (
        <Localize><div className="space-y-4 text-sm leading-relaxed text-black/75 dark:text-white/75">
          <p>
            Rotazur, ziyaretçilerimize daha akıcı bir deneyim sunmak için zorunlu ve işlevsel çerezler (cookies) kullanır.
          </p>
          <h4 className="font-bold text-base text-black dark:text-white pt-2">Kullandığımız Çerez Türleri</h4>
          <ul className="list-disc pl-5 space-y-1.5">
            <li><strong>Zorunlu Çerezler:</strong> Güvenli oturum açma ve hesap yönetimi için gereklidir.</li>
            <li><strong>İşlevsel Çerezler:</strong> Gece/gündüz modu tercihiniz, son aradığınız rotalar ve seçili para biriminizi hatırlamak için kullanılır.</li>
            <li><strong>Performans Çerezleri:</strong> Sitemizin hızını ve hata oranlarını ölçümleyerek kesintisiz hizmet vermemizi sağlar.</li>
          </ul>
          <p className="pt-2">
            Tarayıcı ayarlarınızdan çerezleri dilediğiniz zaman silebilir veya engelleyebilirsiniz.
          </p>
        </div></Localize>
      ),
    },
  }[type];

  const Icon = content.icon;

  return (
    <Localize><AnimatePresence>
      <div className="fixed inset-0 z-[1300] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-md"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 w-full max-w-2xl rounded-3xl border border-black/10 bg-white p-6 sm:p-8 shadow-2xl dark:border-white/10 dark:bg-[#0d0e1a] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 border-b border-black/10 pb-5 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-500/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-black dark:text-white">
                  {content.title}
                </h3>
                <p className="text-xs text-black/50 dark:text-white/50">
                  {content.subtitle}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-full text-black/40 hover:bg-black/5 hover:text-black dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="mt-6 max-h-[60vh] overflow-y-auto pr-2 scroll-thin">
            {content.body}
          </div>

          {/* Footer Action */}
          <div className="mt-6 border-t border-black/10 pt-4 flex items-center justify-between dark:border-white/10">
            <span className="text-xs text-black/40 dark:text-white/40">
              © {new Date().getFullYear()} Rotazur · Tüm Hakları Saklıdır
            </span>
            <button
              type="button"
              onClick={onClose}
              className="btn-primary rounded-xl px-5 py-2 text-xs font-bold"
            >
              Anladım & Kapat
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence></Localize>
  );
}
