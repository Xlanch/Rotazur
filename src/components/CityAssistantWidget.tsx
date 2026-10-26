"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";
import { useLanguage } from "./LanguageContext";
import { assistantIntent } from "@/lib/i18n/assistant-intent";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { tl } from "@/lib/format";
import { getCityCurrencyInfo, getCityPassInfo } from "@/lib/providers/city-tools";
import type { Comfort, PlanResponse } from "@/lib/types";

interface CityAssistantWidgetProps {
  data: PlanResponse;
  budgetTier: Comfort;
}

interface ChatMsg {
  role: "assistant" | "user";
  text: string;
}

export function CityAssistantWidget({ data, budgetTier }: CityAssistantWidgetProps) {
  const { translate } = useLanguage();
  const { tl } = useLocaleFormat();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "assistant",
      text: `Merhaba! 👋 Ben **${data.city.name} (${data.city.country})** Akıllı Seyahat Asistanınızım. Şu an **${budgetTier.toUpperCase()}** bütçe modundasınız. Aşağıdaki hazır sorulardan birine tıklayabilir veya merak ettiğiniz her şeyi bana sorabilirsiniz!`,
    },
  ]);

  const curInfo = getCityCurrencyInfo(data.city, data.rates);
  const passInfo = getCityPassInfo(data.city);

  const generateSmartAnswer = (q: string): string => {
    const low = assistantIntent(q).toLocaleLowerCase("tr-TR");
    const tierRests = (data.restaurants || []).filter((r) => r.tier === budgetTier);
    const allRests = data.restaurants || [];
    const mc = data.budgetGuide?.mealCosts?.[budgetTier];
    const getCat = (c: string) => data.budgetGuide?.categoryAdvice?.find((x) => x.category === c);

    if (low.includes("yağmur") || (low.includes("hava") && !low.includes("havaliman")) || low.includes("kapalı") || low.includes("soğuk")) {
      const museums = data.days
        .flatMap((d) => d.activities)
        .filter((a) => a.kind === "gezi")
        .slice(0, 3)
        .map((a) => a.title)
        .join(", ");
      const cafe = allRests.find((r) => r.category === "kafe-tatli") || allRests[0];
      return `🌧️ **${data.city.name} Yağmurlu / Kapalı Hava Planı (${budgetTier.toUpperCase()} Mod):**\n\n1. **Kapalı Müzeler & Kültür:** Açık hava yürüyüşleri yerine rotanızdaki **${museums || "merkez müzeleri"}** öne çekin. (${passInfo.freeMuseumTip})\n2. **Tarihi Kafe & Lezzet Molası:** Yağmur dinene kadar **${cafe?.name || "merkezdeki tarihi kafelerde"}** (${cafe?.neighborhood || "Merkez"}) oturup meşhur *${cafe?.signatureDish || "yerel tatlıları"}* (~${cafe?.avgPricePerPersonEur || 6} €) deneyin.\n3. **Kapalı Çarşı & Pasajlar:** ${getCat("alisveris")?.[budgetTier] || "Merkezdeki kapalı pazarları ve kültür pasajlarını gezin."}`;
    }

    if (low.includes("havaliman") || low.includes("transfer") || low.includes("ulaşım") || low.includes("metro") || low.includes("taksi")) {
      const ulasim = getCat("ulasim");
      return `🚇 **${data.city.name} Havalimanı & Şehir İçi Ulaşım Rehberi:**\n\n• **💚 Tasarruflu:** ${ulasim?.tasarruflu}\n• **💙 Dengeli:** ${ulasim?.dengeli}\n• **💜 Konforlu:** ${ulasim?.konforlu}\n\n🎟️ **Önerilen Kart:** ${passInfo.transportCardName} (~${passInfo.transportPassPriceEur} €). ${ulasim?.extraTip || ""}`;
    }

    if (low.includes("yemek") || low.includes("restoran") || low.includes("ne yenir") || low.includes("ucuz") || low.includes("lezzet")) {
      const restList = (tierRests.length > 0 ? tierRests : allRests.slice(0, 3))
        .map((r) => `• **${r.name}** (${r.neighborhood}): *${r.signatureDish}* — Kişi başı **${tl(r.avgPricePerPersonTry)}** (~${r.avgPricePerPersonEur} €)`)
        .join("\n");
      const dishes = (data.budgetGuide?.localDishesToTry || [])
        .map((d) => `${d.name} (~${d.avgEur}€)`)
        .join(", ");
      return `🍽️ **${data.city.name} (${budgetTier.toUpperCase()}) Yeme-İçme & Restoran Önerilerim:**\n\n${restList}\n\n🥘 **Mutlaka Denenecek Yöresel Tatlar:** ${dishes}\n📊 **Günlük Ortalama Öğün Bütçesi:** Kahvaltı ${tl(mc?.breakfastTry || 250)}, Öğle ${tl(mc?.lunchTry || 450)}, Akşam ${tl(mc?.dinnerTry || 700)} (Toplam: **${tl(mc?.dailyTotalTry || data.dailyFoodTry)}/gün**).`;
    }

    if (low.includes("gece") || low.includes("güvenli") || low.includes("akşam") || low.includes("eğlence") || low.includes("bar")) {
      const konak = getCat("konaklama");
      return `🌙 **${data.city.name} Akşam Yürüyüşü, Gece Hayatı & Güvenlik:**\n\n• **En Canlı & Güvenli Bölgeler:** ${konak?.dengeli || "Tarihi eski şehir merkezi ve ana yaya bulvarları akşam saatlerinde oldukça canlı ve güvenlidir."}\n• **Akşam Önerisi:** Akşam yemeği için **${allRests[2]?.name || "merkezdeki yerel restoranları"}** tercih edebilir, ardından nehir/sahil hattında veya ana meydanda yürüyüş yapabilirsiniz.\n• **⚠️ Dikkat:** ${data.budgetGuide?.touristTrapsToAvoid?.[0] || "Turistik meydanlardaki menüsüz mekanlardan kaçının."} Acil durum numarası: **${data.city.emergencyPhone || "112"}**.`;
    }

    if (low.includes("para") || low.includes("kur") || low.includes("döviz") || low.includes("kart") || low.includes("atm") || low.includes("bahşiş")) {
      return `💱 **${data.city.name} Para Birimi, Kur & Ödeme Kuralları:**\n\n• **Yerel Para Birimi:** ${curInfo.name} (**${curInfo.code}** — 1 EUR ≈ ${curInfo.perEur} ${curInfo.code}).\n• **ATM & Döviz Uyarısı:** ${curInfo.atmWarning}\n• **Bahşiş Kuralı:** ${curInfo.tippingRule}`;
    }

    if (low.includes("müze") || low.includes("bilet") || low.includes("kart") || low.includes("pass") || low.includes("ücretsiz")) {
      return `🎟️ **${data.city.name} Müze & Şehir Kartı Stratejisi:**\n\n• **Resmi Kart:** ${passInfo.passName} (${passInfo.priceEur} €) — ${passInfo.includes}\n• **Ücretsiz İpucu:** ${passInfo.freeMuseumTip}\n• **Uzman Tavsiyesi:** ${passInfo.officialHint}`;
    }

    if (low.includes("otel") || low.includes("nerede kalınır") || low.includes("mahalle") || low.includes("konaklama")) {
      const konak = getCat("konaklama");
      return `🏨 **${data.city.name} İçin 3 Bütçeye Göre Nerede Kalınır?**\n\n• **💚 Tasarruflu:** ${konak?.tasarruflu}\n• **💙 Dengeli:** ${konak?.dengeli}\n• **💜 Konforlu:** ${konak?.konforlu}\n\n💡 **İpucu:** ${konak?.extraTip}`;
    }

    // Genel akıllı yanıt
    return `✨ **${data.city.name} (${budgetTier.toUpperCase()} Bütçe Modu) Özeti:**\n\n• **Vize:** ${data.city.visa}\n• **Yerel Para:** ${curInfo.name} (${curInfo.code}, 1 EUR ≈ ${curInfo.perEur} ${curInfo.code})\n• **Önerilen Favori Restoran:** **${tierRests[0]?.name || allRests[0]?.name}** (*${tierRests[0]?.signatureDish || allRests[0]?.signatureDish}*, kişi başı ~${tierRests[0]?.avgPricePerPersonEur || 10} €)\n• **Altın Tasarruf Kuralı:** ${data.budgetGuide?.touristTrapsToAvoid?.[0] || passInfo.officialHint}\n\nBana *"Yağmur yağarsa ne yapılır?"*, *"En iyi restoranlar hangileri?"*, *"Havalimanından merkeze nasıl gidilir?"* veya *"Döviz/ATM tüyoları"* gibi sorular sorabilirsiniz!`;
  };

  const handleAsk = (textToSend?: string) => {
    const q = (textToSend ?? question).trim();
    if (!q) return;
    const reply = generateSmartAnswer(q);
    setMessages((prev) => [...prev, { role: "user", text: textToSend ? translate(q) : q }, { role: "assistant", text: reply }]);
    if (!textToSend) setQuestion("");
  };

  const quickQuestions = [
    "🍽️ Bütçeme göre en iyi restoranlar ve yemek fiyatları?",
    "🚇 Havalimanından merkeze en ucuz nasıl gidilir?",
    "🌧️ Yağmur yağarsa kapalı havada ne yapılır?",
    "🎟️ Müze ve şehir kartı (City Pass) almak mantıklı mı?",
    "💱 Döviz bozdurma, ATM ve bahşiş kuralları neler?",
    "🌙 Akşam yürüyüşü ve güvenli bölgeler neresi?",
  ];

  return (
    <Localize><>
      {/* Sağ Alt Yüzen Asistan Butonu */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-gradient-to-r from-brand-600 via-purple-600 to-fuchsia-500 px-4 py-3 text-xs font-extrabold text-white shadow-2xl shadow-brand-500/40 transition hover:scale-105"
      >
        <Bot className="h-5 w-5" />
        <span>{data.city.name} Rehber Asistanına Sor</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-5 right-5 z-50 flex h-[540px] max-h-[85vh] w-[92vw] max-w-md flex-col overflow-hidden rounded-3xl border border-brand-500/30 bg-white shadow-2xl dark:bg-[#11121c]"
          >
            {/* Üst Başlık */}
            <div className="flex items-center justify-between bg-gradient-to-r from-brand-600 to-fuchsia-600 px-4 py-3.5 text-white">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/20">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-extrabold">{data.city.flag} {data.city.name} Akıllı Asistanı</div>
                  <div className="text-[11px] opacity-85">Aktif Bütçe Modu: {budgetTier.toUpperCase()}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mesaj Geçmişi */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4 scroll-thin">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    translate={m.role === "user" ? "no" : undefined}
                    className={`max-w-[86%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      m.role === "user"
                        ? "bg-brand-600 font-semibold text-white"
                        : "border border-black/10 bg-black/[0.03] text-black/85 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/90"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Hızlı Sorular */}
            <div className="border-t border-black/5 bg-black/[0.02] px-3 py-2 dark:border-white/5 dark:bg-white/[0.02]">
              <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                <MessageSquare className="h-3 w-3" /> Tek Tıkla Hızlı Sorular
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scroll-thin">
                {quickQuestions.map((qq, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleAsk(qq)}
                    className="shrink-0 rounded-xl border border-brand-500/25 bg-brand-500/10 px-2.5 py-1 text-[11px] font-semibold text-brand-700 hover:bg-brand-500/20 dark:text-brand-300"
                  >
                    {qq}
                  </button>
                ))}
              </div>
            </div>

            {/* Soru Yazma Alanı */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
              className="flex items-center gap-2 border-t border-black/10 p-3 dark:border-white/10"
            >
              <input
                type="text"
                placeholder={`${data.city.name} hakkında bir soru sorun...`}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="input-field flex-1 text-xs"
              />
              <button type="submit" className="btn-primary !px-3.5 !py-2 text-xs">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </></Localize>
  );
}
