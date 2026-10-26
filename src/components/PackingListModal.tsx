"use client";

import { Localize } from "@/components/Localize";
import { useLanguage } from "./LanguageContext";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, CheckCircle2, Luggage, Plus, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import type { City, SearchInput } from "@/lib/types";
import { useLocalRecord } from "@/lib/use-local-record";
import { readLocalRecord } from "@/lib/local-record";
import { tripScope } from "@/lib/trip-expenses";
import { emptyPackingRecord, isPackingRecord, isCheckedMap, isCustomPackingTexts, migratePackingRecord, removePackingItem } from "@/lib/travel-checklists";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  city: Omit<City, "attractions">;
  startDate: string;
  input: SearchInput;
}

interface Item {
  id: string;
  category: "belge" | "elektronik" | "giysi" | "saglik" | "ozel";
  text: string;
  note?: string;
}

export function PackingListModal({ isOpen, onClose, city, startDate, input }: Props) {
  const { translate } = useLanguage();
  const storageKey = `packing_v2_${tripScope(input)}`;
  const legacyKey = `packing_list_${city.id}`;
  const customKey = `packing_custom_${city.id}`;

  const { value: record, update, error } = useLocalRecord(storageKey, emptyPackingRecord, isPackingRecord);
  const { checked, customItems } = record;
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const [newItem, setNewItem] = useState("");

  // LocalStorage'dan kayıtlı işaretleri yükle
  useEffect(() => {
    try {
      setLegacyAvailable(localStorage.getItem(storageKey) === null && (localStorage.getItem(legacyKey) !== null || localStorage.getItem(customKey) !== null));
    } catch { setLegacyAvailable(false); }
    setNewItem("");
  }, [storageKey, legacyKey, customKey, isOpen]);

  const importPrevious = () => {
    if (update((current) => {
      if (localStorage.getItem(storageKey) !== null) return current;
      return migratePackingRecord(readLocalRecord(legacyKey, () => ({}), isCheckedMap), readLocalRecord(customKey, () => [], isCustomPackingTexts));
    })) setLegacyAvailable(false);
  };

  // Değişiklikleri kaydet
  const toggleItem = (id: string) => {
    if (update((current) => ({ ...current, checked: { ...current.checked, [id]: !current.checked[id] } }))) setLegacyAvailable(false);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.trim()) return;
    if (update((current) => {
      if (current.customItems.length >= 100) throw new Error("En fazla 100 özel eşya ekleyebilirsiniz.");
      if (newItem.trim().length > 160) throw new Error("Eşya adı en fazla 160 karakter olabilir.");
      return { ...current, customItems: [...current.customItems, { id: `custom-${crypto.randomUUID()}`, text: newItem.trim() }] };
    })) { setNewItem(""); setLegacyAvailable(false); }
  };

  const handleRemoveCustom = (id: string) => update((current) => removePackingItem(current, id));

  const handleReset = () => {
    if (confirm(translate("Bavul listesindeki tüm işaretleri sıfırlamak istiyor musunuz?"))) {
      update((current) => ({ ...current, checked: {} }));
    }
  };

  // Şehre ve mevsime özel akıllı eşya listesi üret
  const items: Item[] = useMemo(() => {
    const list: Item[] = [];

    // 1. Belgeler & Para
    if (city.visaType === "kimlik") {
      list.push({
        id: "doc-id",
        category: "belge",
        text: "Yeni Çipli T.C. Kimlik Kartı",
        note: "Pasaporta gerek yok, kimliğinizin kırık/yıpranmış olmamasına dikkat edin.",
      });
    } else {
      list.push({
        id: "doc-pass",
        category: "belge",
        text: "Pasaport (En az 6 ay geçerli)",
        note: city.visaType === "schengen" ? "Schengen vizesi kontrol edilmelidir." : "Vizesiz seyahat için yeterlidir.",
      });
    }

    list.push({
      id: "doc-ticket",
      category: "belge",
      text: "Uçak Biletleri & Check-in Barkodu",
      note: "Uçuştan 24 saat önce online check-in yapmayı unutmayın.",
    });

    list.push({
      id: "doc-hotel",
      category: "belge",
      text: "Otel Rezervasyon Ekran Görüntüsü / Çıktısı",
      note: "Pasaport kontrolünde sorulabilir, çevrimdışı kaydedin.",
    });

    list.push({
      id: "doc-money",
      category: "belge",
      text: `Yurtdışı Kullanımına Açık Kredi Kartı & Biraz Nakit (${city.currencyCode || "EUR"})`,
      note: "Banka kartınızın yurtdışı işlemlerini mobil bankacılıktan açın.",
    });

    // 2. Elektronik
    list.push({
      id: "el-powerbank",
      category: "elektronik",
      text: "Taşınabilir Şarj Cihazı (Powerbank)",
      note: "Gün boyu harita ve fotoğraf çekimi için kabin bagajında taşıyın.",
    });

    list.push({
      id: "el-charger",
      category: "elektronik",
      text: "Telefon Şarj Kablosu & Adaptör",
    });

    if (city.id === "londra") {
      list.push({
        id: "el-plug",
        category: "elektronik",
        text: "İngiltere Tip G Priz Adaptörü (3 Dişli)",
        note: "İngiltere prizleri farklıdır, dönüştürücü adaptör şarttır.",
      });
    } else {
      list.push({
        id: "el-plug",
        category: "elektronik",
        text: "Standart Tip C/F Priz Uyumu",
        note: "Türkiye ile uyumludur, dönüştürücü gerekmez.",
      });
    }

    list.push({
      id: "el-esim",
      category: "elektronik",
      text: "Yurtdışı e-SIM veya Operatör Paketi",
      note: "Airalo, Holafly veya operatörünüzün günlük yurtdışı tarifesi.",
    });

    // 3. Mevsime & Şehre Göre Giysiler
    const month = new Date(startDate).getMonth(); // 0: Ocak, 11: Aralık
    const isWinter = month === 11 || month === 0 || month === 1 || month === 2;
    const isSummer = month >= 5 && month <= 8;

    list.push({
      id: "wear-shoes",
      category: "giysi",
      text: "Konforlu Yürüyüş / Spor Ayakkabısı",
      note: "Günde ortalama 15.000 - 20.000 adım atılacağı için denenmiş rahat ayakkabı şart.",
    });

    if (isWinter) {
      list.push({
        id: "wear-warm",
        category: "giysi",
        text: "Termal İçlik, Bere & Sıcak Tutan Eldiven",
        note: "Tarihi meydanlarda açık havada gezerken rüzgardan korur.",
      });
      list.push({
        id: "wear-coat",
        category: "giysi",
        text: "Rüzgar ve Su Geçirmez Kalın Mont",
      });
    } else if (isSummer || city.id === "sarm-el-seyh" || city.id === "bali" || city.id === "bangkok") {
      list.push({
        id: "wear-swim",
        category: "giysi",
        text: "Mayo, Deniz Şortu & Plaj Havlusu",
        note: "Plaj ve tekne turları için hazır bulundurun.",
      });
      list.push({
        id: "wear-sun",
        category: "giysi",
        text: "Güneş Gözlüğü & Koruyucu Şapka",
      });
      list.push({
        id: "wear-light",
        category: "giysi",
        text: "Hafif Keten / Pamuklu Yazlık Kıyafetler",
      });
    } else {
      list.push({
        id: "wear-layer",
        category: "giysi",
        text: "Kat Kat Giyilebilen Hırka / Hafif Yağmurluk",
        note: "Bahar aylarında akşam saatleri serin olabilir.",
      });
    }

    list.push({
      id: "wear-umbrella",
      category: "giysi",
      text: "Kompakt Katlanır Şemsiye",
      note: "Ani yağmurlara karşı çantada taşınması önerilir.",
    });

    // 4. Sağlık & Kişisel Bakım
    list.push({
      id: "med-pain",
      category: "saglik",
      text: "Ağrı Kesici, Mide İlacı & Kişisel İlaçlar",
      note: "Yurtdışında reçetesiz ilaç almak zor ve pahalı olabilir.",
    });

    list.push({
      id: "med-band",
      category: "saglik",
      text: "Yara Bandı & Sürtünme Önleyici Krem",
      note: "Uzun yürüyüşlerde ayak vurmasına karşı hayat kurtarır.",
    });

    list.push({
      id: "med-sunscreen",
      category: "saglik",
      text: "Güneş Kremi (Yüksek Faktörlü)",
    });

    list.push({
      id: "med-wipes",
      category: "saglik",
      text: "Islak Mendil, Dezenfektan & Diş Bakım Seti",
    });

    return list;
  }, [city, startDate]);

  // Tamamlanma yüzdesi
  const totalItemsCount = items.length + customItems.length;
  const completedCount =
    items.filter((it) => !!checked[it.id]).length +
    customItems.filter((item) => !!checked[item.id]).length;
  const percent = totalItemsCount > 0 ? Math.round((completedCount / totalItemsCount) * 100) : 0;

  if (!isOpen) return null;

  const categories = [
    { id: "belge", label: "🛂 Belgeler & Para", color: "text-amber-500" },
    { id: "elektronik", label: "🔌 Elektronik & Şarj", color: "text-blue-500" },
    { id: "giysi", label: "👕 Giysi & Ayakkabı", color: "text-emerald-500" },
    { id: "saglik", label: "💊 Sağlık & Bakım", color: "text-rose-500" },
  ];

  return (
    <Localize><AnimatePresence>
      <div className="fixed inset-0 z-[1200] grid place-items-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-black/10 bg-white/95 p-6 shadow-2xl backdrop-blur-2xl scroll-thin dark:border-white/10 dark:bg-[#0f0e1c]/95 sm:p-8"
        >
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-brand-500/10 text-brand-500 dark:bg-brand-500/20">
                  <Luggage className="h-4 w-4" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                  Akıllı Bavul Hazırlığı
                </span>
              </div>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight">
                {city.flag} {city.name} İçin Ne Almalı?
              </h2>
              <p className="mt-0.5 text-xs text-black/60 dark:text-white/60">
                Şehrin iklimine, vize kurallarına ve seyahat tarihinize göre özel oluşturulan kontrol listesi.
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Bavul listesini kapat"
              className="grid h-8 w-8 place-items-center rounded-full text-black/50 hover:bg-black/5 hover:text-black dark:text-white/50 dark:hover:bg-white/5 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && <p role="alert" className="mt-3 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
          {legacyAvailable && <button type="button" onClick={importPrevious} className="btn-ghost mt-3 text-xs">Önceki şehir listesini bu geziye kopyala</button>}

          {/* İlerleme Çubuğu */}
          <div className="mt-6 rounded-2xl bg-black/[0.03] p-4 dark:bg-white/[0.03]">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Bavul Hazırlık Durumu
              </span>
              <span className="text-brand-600 dark:text-brand-300">
                %{percent} ({completedCount} / {totalItemsCount} Eşya)
              </span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                className="h-full bg-gradient-to-r from-brand-500 to-emerald-500 transition-all duration-300"
              />
            </div>
          </div>

          {/* Eşya Grupları */}
          <div className="mt-6 space-y-6">
            {categories.map((cat) => {
              const catItems = items.filter((it) => it.category === cat.id);
              if (catItems.length === 0) return null;

              return (
                <div key={cat.id}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                    {cat.label}
                  </h3>
                  <div className="mt-2.5 space-y-2">
                    {catItems.map((item) => {
                      const isDone = !!checked[item.id];
                      return (
                        <div
                          key={item.id}
                          onClick={() => toggleItem(item.id)}
                          className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 transition ${
                            isDone
                              ? "border-emerald-500/30 bg-emerald-500/[0.04] opacity-75"
                              : "border-black/5 bg-black/[0.015] hover:border-brand-500/40 hover:bg-black/[0.03] dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-brand-500/40 dark:hover:bg-white/[0.04]"
                          }`}
                        >
                          <button
                            type="button"
                            aria-label={item.text}
                            aria-pressed={isDone}
                            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-lg border transition ${
                              isDone
                                ? "border-emerald-500 bg-emerald-500 text-white"
                                : "border-black/20 dark:border-white/20"
                            }`}
                          >
                            {isDone && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                          </button>
                          <div className="flex-1 text-xs">
                            <div className={`font-bold ${isDone ? "line-through text-black/50 dark:text-white/50" : ""}`}>
                              {item.text}
                            </div>
                            {item.note && (
                              <div className="mt-0.5 text-[11px] text-black/60 dark:text-white/60">
                                {item.note}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Özel Eşyalarım */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-black/50 dark:text-white/50">
                ✨ Kendi Eklediğim Eşyalar ({customItems.length})
              </h3>
              <div className="mt-2.5 space-y-2">
                {customItems.map((item) => {
                  const cKey = item.id;
                  const cText = item.text;
                  const isDone = !!checked[cKey];

                  return (
                    <div
                      key={item.id}
                      className={`flex items-center justify-between rounded-2xl border p-3 transition ${
                        isDone
                          ? "border-emerald-500/30 bg-emerald-500/[0.04] opacity-75"
                          : "border-black/5 bg-black/[0.015] dark:border-white/5 dark:bg-white/[0.02]"
                      }`}
                    >
                      <div
                        onClick={() => toggleItem(cKey)}
                        className="flex flex-1 cursor-pointer items-center gap-3 text-xs"
                      >
                        <button
                          type="button"
                          aria-label={cText}
                          aria-pressed={isDone}
                          className={`grid h-5 w-5 shrink-0 place-items-center rounded-lg border transition ${
                            isDone
                              ? "border-emerald-500 bg-emerald-500 text-white"
                              : "border-black/20 dark:border-white/20"
                          }`}
                        >
                          {isDone && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                        </button>
                        <span translate="no" className={`font-semibold ${isDone ? "line-through text-black/50 dark:text-white/50" : ""}`}>
                          {cText}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveCustom(item.id)}
                        className="rounded-lg p-1 text-black/30 hover:text-rose-500 dark:text-white/30"
                        title="Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}

                {/* Yeni Eşya Ekle Formu */}
                <form onSubmit={handleAddCustom} className="mt-2 flex gap-2">
                  <input
                    type="text"
                    maxLength={160}
                    aria-label="Yeni eşya"
                    placeholder="Örn: Güneş şemsiyesi, lens suyu, tripod..."
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    className="input-field flex-1 text-xs"
                  />
                  <button type="submit" className="btn-primary !py-2 !px-3 text-xs font-bold">
                    <Plus className="h-4 w-4" /> Ekle
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Footer Aksiyonları */}
          <div className="mt-8 flex items-center justify-between border-t border-black/5 pt-4 text-xs dark:border-white/5">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-black/50 hover:text-rose-500 dark:text-white/50"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Listeyi Sıfırla
            </button>
            <button onClick={onClose} className="btn-ghost font-bold">
              Tamamla & Kapat
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence></Localize>
  );
}
