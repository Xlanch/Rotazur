"use client";

import { useLocaleFormat } from "@/components/useLocaleFormat";

import { Localize } from "@/components/Localize";
import { useLanguage } from "./LanguageContext";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Plus, Sparkles, Trash2, Users, Wallet, X } from "lucide-react";
import type { CurrencyCode } from "@/lib/format";
import { useLocalRecord } from "@/lib/use-local-record";
import { importPlanExpenses, isGroupLedger, roundMoney, settleGroup, type GroupExpenseItem } from "@/lib/trip-expenses";
import { useCurrency } from "./CurrencyContext";

interface ExpenseSplitterModalProps {
  isOpen: boolean;
  onClose: () => void;
  cityId: string;
  cityName: string;
  tripKey: string;
  activityTotalTry: number;
  rates?: Partial<Record<CurrencyCode, number>>;
  travelersCount: number;
  flightTotalTry: number;
  hotelTotalTry: number;
  foodTotalTry: number;
  transportTotalTry: number;
}

export function ExpenseSplitterModal({
  isOpen,
  onClose,
  cityId,
  cityName,
  tripKey,
  activityTotalTry,
  rates: planRates,
  travelersCount,
  flightTotalTry,
  hotelTotalTry,
  foodTotalTry,
  transportTotalTry,
}: ExpenseSplitterModalProps) {
  const { translate } = useLanguage();
  const { fmtMoney: fmtCur } = useLocaleFormat();
  const { currency, rates: currentRates } = useCurrency();
  const rates = { ...currentRates, ...planRates };
  const { value: ledger, update, error: storageError, legacyAvailable, importLegacy } = useLocalRecord(
    'rota_split_v2_' + tripKey,
    () => ({ members: Array.from({ length: Math.max(1, travelersCount) }, (_, i) => i === 0 ? '1. Yolcu (Sen)' : (i + 1) + '. Yolcu'), expenses: [] as GroupExpenseItem[] }),
    isGroupLedger, 'rota_split_' + cityId,
  );
  const { members, expenses } = ledger;
  const [newMemberName, setNewMemberName] = useState('');
  const [memberDrafts, setMemberDrafts] = useState<Record<number, string>>({});
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const selectedPayer = members.includes(paidBy) ? paidBy : members[0];
  const [category, setCategory] = useState<GroupExpenseItem['category']>('yemek');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [actionError, setActionError] = useState('');

  const handleImportPlanExpenses = () => update((current) => importPlanExpenses(current, {
    flight: flightTotalTry, hotel: hotelTotalTry, food: foodTotalTry,
    transport: transportTotalTry, activities: activityTotalTry,
  }));

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newMemberName.trim();
    if (update((current) => {
      if (!clean || clean.length > 80 || current.members.length >= 50 || current.members.some((m) => m.trim().toLocaleLowerCase('tr-TR') === clean.toLocaleLowerCase('tr-TR'))) {
        throw new Error('Her yolcunun farklı ve dolu bir adı olmalıdır (en fazla 50 kişi).');
      }
      return { ...current, members: [...current.members, clean] };
    })) setNewMemberName('');
  };

  const handleRenameMember = (idx: number, newName: string) => {
    const clean = newName.trim(), previous = members[idx];
    const ok = update((current) => {
      if (!clean || clean.length > 80 || current.members.some((m, i) => i !== idx && m.trim().toLocaleLowerCase('tr-TR') === clean.toLocaleLowerCase('tr-TR'))) {
        throw new Error('Yolcu adı boş bırakılamaz veya başka bir yolcuyla aynı olamaz.');
      }
      const old = current.members[idx];
      return { members: current.members.map((m, i) => i === idx ? clean : m),
        expenses: current.expenses.map((expense) => expense.paidBy === old ? { ...expense, paidBy: clean } : expense) };
    });
    setMemberDrafts((drafts) => { const next = { ...drafts }; delete next[idx]; return next; });
    if (ok && paidBy === previous) setPaidBy(clean);
  };

  const handleRemoveMember = (idx: number) => update((current) => {
    const member = current.members[idx];
    if (current.expenses.some((e) => e.paidBy === member)) throw new Error('Bu yolcunun ödeme kaydı var. Önce ilgili harcamaları düzenleyin.');
    if (current.members.length <= 1) throw new Error('En az bir yolcu kalmalıdır.');
    setMemberDrafts({});
    return { ...current, members: current.members.filter((_, i) => i !== idx) };
  });

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = update((current) => {
      const num = roundMoney(Number(amount));
      if (!title.trim() || num <= 0 || !current.members.includes(selectedPayer)) throw new Error('Harcama adı, pozitif tutar ve geçerli bir ödeyen seçin.');
      const item: GroupExpenseItem = { id: 'exp-' + crypto.randomUUID(), title: title.trim(), amountTry: num, paidBy: selectedPayer, category };
      return { ...current, expenses: [item, ...current.expenses] };
    });
    if (ok) { setTitle(''); setAmount(''); }
  };

  const { totalTry, perPersonTry, paidByMember, netByMember, settlements } = useMemo(() => settleGroup(ledger), [ledger]);

  const handleCopySummary = async () => {
    const lines = [
      `📊 *${cityName} Gezisi Grup Masraf Özeti*`,
      `👥 Kişi Sayısı: ${members.length} Kişi`,
      `💰 Toplam Harcama: ${fmtCur(totalTry, currency, rates)}`,
      `👤 Kişi Başı Düşen: ${fmtCur(perPersonTry, currency, rates)}`,
      ``,
      `🔄 *Kim Kime Ne Kadar Göndermeli?*`,
      ...(settlements.length > 0
        ? settlements.map((s) => `• ${s.from} ➔ ${s.to}: *${fmtCur(s.amountTry, currency, rates)}*`)
        : ["• Herkes eşit ödedi, kimsenin borcu yok!"]),
    ];
    try {
      await navigator.clipboard.writeText(translate(lines.join("\n")));
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
    } catch { setActionError("Özet kopyalanamadı. Pano iznini kontrol edin."); }
  };

  if (!isOpen) return null;

  return (
    <Localize><AnimatePresence>
      <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="card relative max-h-[90vh] w-full max-w-3xl overflow-y-auto bg-white p-6 shadow-2xl dark:bg-[#11121c] sm:p-8"
        >
          <button
            onClick={onClose}
            aria-label="Grup kasasını kapat"
            className="btn-ghost absolute right-4 top-4 !p-2 text-black/50 hover:text-black dark:text-white/50 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-fuchsia-500 text-white shadow-lg">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">{cityName} Grup Kasası & Masraf Bölüşme</h2>
              <p className="text-xs text-black/55 dark:text-white/55">
                Kim ne kadar ödedi yazın; kimin kime kaç TL göndereceğini otomatik hesaplayalım (Splitwise sistemi)
              </p>
            </div>
          </div>

          {(storageError || actionError) && <p role="alert" className="mt-3 text-xs text-rose-600 dark:text-rose-400">{storageError || actionError}</p>}
          {legacyAvailable && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">Bu şehir için eski bir kasa kaydı var. <button type="button" onClick={importLegacy} className="font-bold underline">Eski kaydı bu geziye aktar</button></p>}
          {/* 1. YOLCU İSİMLERİ */}
          <div className="mt-6 rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.02]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-black/60 dark:text-white/60">
                👥 Geziye Katılan Kişiler (İsimleri Düzenleyebilirsiniz)
              </span>
              <form onSubmit={handleAddMember} className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Yeni kişi ekle..."
                  aria-label="Yeni yolcu adı"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="input-field !py-1 !px-2.5 text-xs w-36"
                />
                <button type="submit" className="btn-primary !py-1 !px-2.5 text-xs">
                  + Ekle
                </button>
              </form>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {members.map((m, idx) => (
                <div key={idx} className="flex items-center gap-1 rounded-xl border border-black/10 bg-white px-2.5 py-1.5 dark:border-white/10 dark:bg-white/5">
                  <input
                    type="text"
                    value={memberDrafts[idx] ?? m}
                    aria-label={`${idx + 1}. yolcu adı`}
                    onChange={(e) => setMemberDrafts((drafts) => ({ ...drafts, [idx]: e.target.value }))}
                    onBlur={() => handleRenameMember(idx, memberDrafts[idx] ?? m)}
                    className="w-full bg-transparent text-xs font-bold outline-none"
                  />
                  {members.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(idx)}
                      className="text-rose-500 opacity-60 hover:opacity-100"
                      title="Kişiyi sil"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 2. YENİ HARCAMA EKLE VEYA PLANDAN AKTAR */}
          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold">➕ Harcama Ekle</h3>
                <button
                  type="button"
                  onClick={handleImportPlanExpenses}
                  className="inline-flex items-center gap-1 rounded-xl bg-brand-500/15 px-3 py-1 text-xs font-bold text-brand-600 hover:bg-brand-500/25 dark:text-brand-300"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Plandaki Giderleri Otomatik Aktar
                </button>
              </div>

              <form onSubmit={handleAddExpense} className="rounded-2xl border border-black/10 p-4 space-y-3 dark:border-white/10">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="group-expense-title" className="text-[11px] font-semibold opacity-70">Harcama Başlığı</label>
                    <input
                      id="group-expense-title"
                      type="text"
                      placeholder="Örn: Akşam yemeği, Taksi, Bilet"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="input-field mt-1 w-full text-xs"
                    />
                  </div>
                  <div>
                    <label htmlFor="group-expense-amount" className="text-[11px] font-semibold opacity-70">Tutar (₺ TRY)</label>
                    <input
                      id="group-expense-amount"
                      type="number"
                      placeholder="Örn: 2400"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="input-field mt-1 w-full text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="group-expense-payer" className="text-[11px] font-semibold opacity-70">Kim Ödedi?</label>
                    <select
                      id="group-expense-payer"
                      value={selectedPayer}
                      onChange={(e) => setPaidBy(e.target.value)}
                      className="input-field mt-1 w-full text-xs"
                    >
                      {members.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="group-expense-category" className="text-[11px] font-semibold opacity-70">Kategori</label>
                    <select
                      id="group-expense-category"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as GroupExpenseItem["category"])}
                      className="input-field mt-1 w-full text-xs"
                    >
                      <option value="yemek">🍽️ Restoran / Yemek</option>
                      <option value="otel">🏨 Otel / Konaklama</option>
                      <option value="ucus">✈️ Uçak Bileti</option>
                      <option value="ulasim">🚕 Taksi / Ulaşım</option>
                      <option value="diger">🎟️ Müze / Diğer</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn-primary w-full justify-center text-xs py-2.5">
                  <Plus className="h-4 w-4" /> Harcamayı Gruba Ekle
                </button>
              </form>

              {/* Harcama Listesi */}
              <div className="max-h-52 space-y-2 overflow-y-auto pr-1 scroll-thin">
                {expenses.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-black/15 p-5 text-center text-xs text-black/50 dark:border-white/15 dark:text-white/50">
                    Henüz grup harcaması girilmedi. Yukarıdaki <b>&ldquo;Plandaki Giderleri Otomatik Aktar&rdquo;</b> butonuna tıklayarak hemen başlayabilirsiniz!
                  </div>
                ) : (
                  expenses.map((ex) => (
                    <div
                      key={ex.id}
                      className="flex items-center justify-between rounded-xl border border-black/5 bg-black/[0.02] px-3.5 py-2.5 text-xs dark:border-white/5 dark:bg-white/[0.02]"
                    >
                      <div>
                        <div className="font-bold text-black dark:text-white">{ex.title}</div>
                        <div className="text-[11px] text-black/55 dark:text-white/55">
                          Ödeyen: <b className="text-brand-600 dark:text-brand-400">{ex.paidBy}</b>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-extrabold">{fmtCur(ex.amountTry, currency, rates)}</span>
                        <button
                          type="button"
                          onClick={() => update((current) => ({ ...current, expenses: current.expenses.filter((x) => x.id !== ex.id) }))}
                          className="text-rose-500 opacity-60 hover:opacity-100"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. MAHSUPLAŞMA & KİM KİME NE KADAR BORÇLU? */}
            <div className="flex flex-col justify-between rounded-2xl border border-brand-500/30 bg-brand-500/[0.04] p-5">
              <div>
                <div className="flex items-center justify-between border-b border-black/10 pb-3 dark:border-white/10">
                  <div>
                    <div className="text-[11px] font-semibold opacity-70">Toplam Grup Harcaması</div>
                    <div className="text-2xl font-black text-gradient">{fmtCur(totalTry, currency, rates)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-semibold opacity-70">Kişi Başı Pay</div>
                    <div className="text-lg font-extrabold">{fmtCur(perPersonTry, currency, rates)}</div>
                  </div>
                </div>

                {/* Kişi Bazlı Ödeme Durumu */}
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider opacity-60">Kişi Bazlı Bakiye</div>
                  {members.map((m) => {
                    const paid = paidByMember[m] || 0;
                    const net = netByMember[m] || 0;
                    return (
                      <div key={m} className="flex items-center justify-between text-xs">
                        <span className="font-semibold">{m}</span>
                        <div className="text-right">
                          <span className="opacity-65 mr-2">Ödedi: {fmtCur(paid, currency, rates)}</span>
                          <span
                            className={`rounded-md px-1.5 py-0.5 font-bold ${
                              net > 0
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : net < 0
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                : "bg-black/10 text-black/60 dark:bg-white/10 dark:text-white/60"
                            }`}
                          >
                            {net > 0
                              ? `+${fmtCur(net, currency, rates)} Alacaklı`
                              : net < 0
                              ? `${fmtCur(net, currency, rates)} Borçlu`
                              : "Eşit"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Kim Kime Göndermeli? */}
                <div className="mt-5 border-t border-black/10 pt-4 dark:border-white/10">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-300">
                    <Wallet className="h-4 w-4" /> Kim Kime Ne Kadar Göndermeli?
                  </div>

                  {settlements.length === 0 ? (
                    <p className="mt-2 text-xs text-black/60 dark:text-white/60">
                      Şu an kimsenin kimseye borcu bulunmuyor.
                    </p>
                  ) : (
                    <div className="mt-2.5 space-y-2">
                      {settlements.map((s, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-xl bg-white p-3 text-xs shadow-sm dark:bg-white/10"
                        >
                          <div className="flex items-center gap-1.5 font-bold">
                            <span className="text-rose-600 dark:text-rose-400">{s.from}</span>
                            <ArrowRight className="h-3.5 w-3.5 opacity-50" />
                            <span className="text-emerald-600 dark:text-emerald-400">{s.to}</span>
                          </div>
                          <span className="rounded-lg bg-brand-600 px-2.5 py-1 font-black text-white">
                            {fmtCur(s.amountTry, currency, rates)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopySummary}
                className="mt-5 btn-primary w-full justify-center text-xs py-2.5"
              >
                {copiedSummary ? (
                  <>
                    <Check className="h-4 w-4" /> WhatsApp Özeti Kopyalandı ✓
                  </>
                ) : (
                  "📱 Hesap Özeti Metnini Kopyala (WhatsApp Grubu İçin)"
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence></Localize>
  );
}
