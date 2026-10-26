# 100 şehir otel ve uçuş denetimi — 24 Ekim 2026

## Sonuç ve kapsam

100 şehrin kayıtları, fiyat/kişi/gece hesapları, arama bağlantıları ve konum eşleşmeleri incelendi. 100 şehir için **2.498 Booking tesis kaydı**, bunların **2.482'sinde** kimlik/adres/tesis yolu/GPS bağlantısı var. Eksik kaynak kaydı olan 16 tesis haritada doğrulanmış otel olarak gösterilmez.

Bu denetim bütün otellerin o anki Booking ekranını tek tek karşılaştırma iddiası değildir. Fiyatlar tarih, kişi, oda, cihaz, iptal koşulu ve hesap fırsatlarına bağlıdır. Otel arşivinin koşulları 22–26 Kasım 2026 / 2 yetişkin / 1 oda / masaüstüdür. Başka koşullar ayrı sorgulanır; kota yoksa bütçe tahmini etiketi korunur.

## Düzeltilen sorunlar

1. **Yanlış şehir/bölge seçimi:** Cenevre'nin eski 25 kaydı merkezden 53–65 km uzaktaydı. Cork sorgusu kontluk, Münih sorgusu havalimanı çevresi, Abu Dabi sorgusu emirlik geneli sonuçları getiriyordu. Dört sorgu sadeleştirildi ve yalnızca dört ücretsiz aramayla kaynak sonuçları yenilendi. Yeni mesafeler: Cenevre **0,2–5,5 km**, Cork **0,2–24,1 km**, Münih **0,7–11,5 km**, Abu Dabi **1,6–42,3 km**. Şehir üretim betiği de bu sorguları korur.
2. **Konum kabul sınırı:** 150 km'lik genel şehir çemberi 50 km'ye indirildi; ada hedefi Bali için 150 km kullanılır. Kaynağın bildirdiği hedef adı varsa şehir adlarıyla karşılaştırılır; göl/kanton/kontluk/havalimanı sonuçları şehir diye kabul edilmez. Mesafe kartta kuş uçuşu olarak belirtilir. Bu bir idari sınır veya bina giriş kapısı doğrulaması değildir.
3. **Yanlış konaklama süresi:** Uçuş otomasyonu 60 geceye kadar teklif kabul ediyordu; eski 355 kaydın 79'u sitenin 14 gece sınırını aşıyordu. Artık 1–14 gece kabul edilir. Aynı istek sayısıyla daha geniş sonuç kümesi incelenerek uygun teklif seçilir.
4. **Eski/geçersiz uçuş fiyatı:** Varsa kaynak `expires_at` ve `found_at` alanları korunur. Süresi dolmuş, 48 saatten eski kaynak zamanı olan, yanlış para birimli, tek yön, bozuk saatli veya kalkışı geçmiş açık saat dilimli teklif elenir. Disk ve bellek önbelleği bu kontrolü atlayamaz. Yeni otomasyon kaydı eski bellek kaydının önüne geçer. Kaynak zamanı yoksa uydurulmaz.
5. **Tutar hassasiyeti:** Kişi başı uçuşun yolcu sayısıyla çarpımında kuruşlar korunur. Otelin bilinen konaklama toplamı bütçe ve konfor paketi hesabında yeniden tam liraya yuvarlanmaz veya oda sayısıyla tekrar çarpılmaz.
6. **Dayanaksız tarih indirimi:** Esnek tarihlere otomatik uygulanan %14 fiyat indirimi kaldırıldı. Alternatifler tahmin olarak kalır; doğrulanmış tasarruf vaadi verilmez ve tarih değişince yeni sorgu yapılır.
7. **Bağlantı koşulları:** Google uçuş arama metni kişi sayısını taşır; bütçe satırının başlığı havayolu filtresi olarak gönderilmez. Aviasales'in yıl içermeyen kısa bağlantısının yanlış yılı açabileceği durumda yıl bilgili Skyscanner aramasına geçilir. Booking bağlantılarındaki çelişkili eski tarih/esneklik/kişi yan parametreleri temizlenir; gerçek teklif kimlikleri korunur. Başka konaklama koşullarında eski yardımcı otel bağlantıları taşınmaz.
8. **Gidiş-dönüş aktarması:** Konfor seçimi artık iki yöndeki aktarmayı da kontrol eder. Veri olmayan bir hedefte 4–5 yıldızlı otel varmış gibi paket başlığı gösterilmez.
9. **Dayanaksız acente karşılaştırması:** Plan toplamına %45 ekleyerek üretilen hayali acente fiyatı ve buradan türetilen %31 net kazanç kaldırıldı. Kart düzeni korunarak karşı teklif gerektiği belirtilir. Konaklama ipucundaki kaynaksız %35–45 tasarruf vaadi de kaldırıldı.

## Ücretsiz gerçek kaynak kontrolleri

- Otel onarımı öncesinde her çağrı için SerpApi hesabının Free Plan, aylık ücret 0, ek kredi 0 ve yeterli kalan ücretsiz hak bilgisi doğrulandı. Uygulamanın kalıcı 200/31 gün sınırı korundu. Dört onarım tamamlandığında tekrar çalıştırma yeni sorgu yapmaz.
- Ücretsiz Aviasales Data API ile **485/485 rota** yeniden sorgulandı: **351 rota güncellendi, 134 rotada uygun sonuç bulunamadı, 0 servis hatası**. En az bir uygun fiyatı olan şehir sayısı **91**. Son tarama: **24 Ekim 07:48 Türkiye saati**. Kaynağın tarih ve veri kapsamına göre bu sayılar değişir; bulunmayan uçuşlar üretilmez.
- 00:00 / 12:00 Europe/Istanbul yerel görevi korunur. Bilgisayar ve kullanıcı oturumu açık olmalıdır. Ücretli uçuş sağlayıcısına geçiş, ek kredi, kart, abonelik veya internete yayın açılmadı. E-posta kurulumu ve gönderimleri ertelenmiş kaldı.

## Güvenlik bağımlılığı

Son yayın kontrolü Nodemailer adres ayrıştırıcısındaki orta önem dereceli açıkları bildirdi. Yalnızca mevcut paket **10.1.4** sürümüne güncellendi; SMTP ayarları veya e-posta akışı etkinleştirilmedi. Yamalanan sürüm [resmî güvenlik duyurusunda](https://github.com/advisories/GHSA-85x2-q946-cp5h) belirtilir. Güncelleme sonrası `npm audit`: **0 bilinen açık**.

## Doğrulama

- **163/163 otomatik test** geçti. Yeni matris: 100 şehirde 1/5/14 gece ve 1/2/4/9 yetişkin için **1.200 otel senaryosu**; 100 şehir × beş kalkış × dört kişi seçimi için **2.000 uçuş senaryosu**. Bunlar ağ veya kota kullanmayan sınır yanıtlarıyla testlerdir.
- Gerçek otel dosyalarında ülke/kimlik/GPS, fiyat toplamı ve bağlantı koşulları kontrol edildi. Süresi dolan önbellek, para birimi, tarih yılı, kaynak şehri, kişi sayısı, kuruş ve esnek tarih testleri eklendi.
- TypeScript ve 179 dosyayı kapsayan hedefli statik güvenlik kontrolleri geçti. Son metin düzeltmelerinden sonra 163 test ve üretim derlemesi yeniden başarılı oldu; `npm audit` toplam 0 açık bildirdi.
- Yedek: OneDrive dışındaki `AppData/Local/Rotazur/backups/hotel-flight-audit-20261024-073311`. Kaynaklar, betikler ve önceki fiyat kayıtları saklandı; rapora gizli anahtar veya kişisel hesap bilgisi yazılmadı.

## Son kontrol notu

- Üretim derlemesi ayrı geçici dizinde yapıldı; açık localhost geliştirme derlemesinin üstüne yazılmadı. Derlenen 155 kaynak dosyasının güncel proje ile SHA-256 karşılaştırmasında fark yok.
- Cenevre üretim ekranında 25 otel, 25 kaynak GPS işareti, doğru tarih/kişi bağlantıları, sokak ve ücretsiz uydu katmanı görüntülendi. Uydu kaynağının 2021 / yaklaşık 10 metre bilgisi görünür; bina girişi kesinliği iddiası yok. Tarayıcı konsolunda hata bulunmadı.
- Gerçek HTTP kontrolünde 5 gece / 4 yetişkin araması 25 tesis kimliğini ve GPS kaydını korudu; eski 4 gece / 2 yetişkin fiyatı taşımadı. Booking bağlantıları yeni tarih ve grubu taşıdı, uçuş bütçe tahmini olarak etiketlendi ve bütçe kuruş toplamı tutarlıydı. Bu kontrol anahtarsız yalıtılmış sunucuda yapıldı; ek SerpApi hakkı harcanmadı.
- `localhost:3000` ana sayfa ve salt okunur otomasyon durum adresi HTTP 200 döndürdü. Geçici test sunucusu ve sekmesi kapatıldı; kullanıcının localhost sunucusu açık bırakıldı.
- Genel stil dosyası, Navbar ve e-posta modülü yedekle aynı. Kart düzeni korunup yanıltıcı tutar/metinler düzeltildi.
- Görseller: `rotazur-cenevre-otel-kontrolu-20261024.png`, `rotazur-cenevre-uydu-kontrolu-20261024.png`.

## Kaynak belgeleri

- [SerpApi Booking araması ve hedef alanı](https://serpapi.com/booking-search-api)
- [Aviasales Data API: fiyatların geçmiş aramalara dayanması ve alanlar](https://support.travelpayouts.com/hc/en-us/articles/203956163-Aviasales-Data-API)
- [Aviasales kısa arama bağlantısı biçimi](https://support.travelpayouts.com/hc/en-us/articles/5711895629714-Aviasales-affiliate-links)
