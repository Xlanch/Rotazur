# 100 şehir ve ücretsiz uçuş güncellemesi — 23 Ekim 2026

24 Ekim: Hatalı bölge aramaları ve ek hesap/önbellek sorunları giderildi; güncel kapsam **2.498 tesis / 2.482 kaynak GPS kaydı**. [Son denetim ve 163 test sonucu](OTEL-UCUS-DENETIMI-2026-10-24.md). Aşağıdaki sayılar ilk genişletme çalışmasının tarihli kaydıdır.

## Şehirler ve oteller

- Mevcut 26 şehir kimliği korundu; Booking'in şehir dizininde bulunan 74 yer eklenerek toplam 100 oldu. Bu seçim resmî bir dünya popülerlik sıralaması değildir.
- 100 şehir için tek seferlik ücretsiz SerpApi Booking araması tamamlandı: **2.492 tesis**, bunların **2.475'inde** tesis kimliği, ülke/tesis yolu, adres ve GPS kaydı birlikte doğrulandı. Eksik kayıtlar haritaya otel iğnesi olarak yerleştirilmez. Fiziksel giriş kapıları bağımsız olarak yerinde doğrulanmış değildir.
- İçe aktarma koşulları: **22–26 Kasım 2026, 2 yetişkin, 1 oda, TRY, masaüstü**. Saklanan fiyatlar geçmiş arama olarak gösterilir; güncel fiyat etiketi taşımaz.
- Başka tarih, gece sayısı, kişi/oda sayısı veya cihaz seçilirse ücretsiz kota içinde yeni Booking araması yapılır. Dört gecelik teklif beş gece için çoğaltılmaz. Kaynak/kota sorunu varsa gerçek tesis bilgileri korunur, tutar açıkça bütçe tahmini olur ve bağlantı yeni koşulları taşır.
- Her şehirde en fazla 25 sonuç vardır; Booking'in tüm otelleri kopyalanmış değildir. Genius, ülke, cihaz, oda ve ödeme koşulları nedeniyle Booking ekranıyla kesin fiyat eşitliği sağlanamaz. Resmî Demand API erişimi henüz yoktur.
- Yeni şehirlerin gezi noktaları, fotoğraf noktaları, yemek bölgeleri, yakın gezileri, havalimanları, saat dilimleri, para birimleri ve genel rehberleri eklendi. Bütçe tahminleri, dış alan yürüyüşleri ve doğrulanmamış tarife/izin koşulları etiketlendi. Uydurma restoran puanı veya yorum sayısı eklenmedi.
- Yeni görsellerin kaynak, yazar ve lisansları `/image-credits` sayfasındadır. Wikimedia konumları ve OurAirports havalimanı verisi kullanıldı.

## Uçuş kaynağı ve fiyatın anlamı

- Var olan sunucu anahtarıyla **ücretsiz Aviasales Data API** kullanılır. Skyscanner API erişimi veya ücretli abonelik açılmadı. Skyscanner bağlantısı, API'den veri alındığı anlamına gelmez.
- `FLIGHT_PRICE_PROVIDER=travelpayouts-data` yerel ortamda etkin. Varsayılan uçuş yolu da ücretsizdir; RapidAPI, Amadeus, Kiwi veya SerpApi'ye otomatik geçmez. Eski adaptörlerin testleri yalnızca açık `legacy-multi-provider` test ayarıyla çalışır.
- Data API geçmiş aramalarda bulunan fiyatları verir. Fiyat **gösterge fiyatıdır**; gerçek zamanlı bilet, bagaj veya grup müsaitliği garantisi değildir. Bir yetişkinin gidiş-dönüş bedeli yolcu sayısıyla çarpıldığında grup toplamı bütçe tahminidir.
- Gerçek gidiş/dönüş tarihi, pozitif kaynak fiyatı ve istenen havalimanı doğrulanır. Kaynağın şehir kodu ile gerçek havalimanı alanı ayrılır; örneğin ANK/ESB ve ROM/FCO eşleşebilir, IST yerine SAW sessizce kullanılamaz.
- Eksik dönüş tarihi, tek yön fiyatından türetilmiş dönüş bedeli, varsayılan uçuş süresi/havayolu ve uydurma sefer numarası kaldırıldı. Eksik saat, aktarma, bagaj ve kabin bilgisi bilinmiyor olarak kalır. Kaynak sonuç vermediğinde tek bir “Uçuş bütçesi tahmini” satırı gösterilir; bu satırda havayolu, sefer numarası veya uçuş saati üretilmez.
- Kaydedilmiş bir uçuş yalnızca **aynı kalkış, varış ve iki tarih** için, son kontrolden itibaren en fazla 12 saat kullanılabilir. Diğer tarihler için kullanıcının koşullarıyla yeni ücretsiz sorgu yapılır; kaynak sonuç vermezse açık bütçe tahmini gösterilir. Anlık sorgu uygulama önbelleği 15 dakikadır.
- Ekrandaki kontrol zamanı kaynağa erişim anıdır; biletin ilk bulunduğu zaman veya fiyatın hâlâ satın alınabildiği an olarak sunulmaz.

## Kurulu otomasyon

- Mevcut Windows görevi: `RotaPlanlayicisi_GunlukFiyatGuncelleme`.
- Zamanlar: **00:00 ve 12:00, Europe/Istanbul**. Başlangıçta kaçırılan görevi çalıştırma ve aynı görevin üst üste binmesini engelleme etkin.
- 100 şehir, 97 farklı hedef havalimanı ve IST/SAW/ESB/ADB/AYT kalkışları: **485 rota sorgusu/çalıştırma**. Genel rota taraması her tarih kombinasyonu için müsaitlik araması değildir.
- Yalnızca ücretsiz Data API, mevcut ücretsiz hava/kur kaynakları çağrılır. **Booking/SerpApi otel kotasını kullanmaz; e-posta veya fiyat alarmı göndermez.**
- İstek başlangıçları en az 300 ms aralıklı ve üç işçiyle sınırlıdır. 401/403/429 yanıtında tarama durur; başka sağlayıcıya veya ücretli servise geçilmez. Yanıt boyutu, istek süresi ve toplam çalışma süresi sınırlıdır.
- Sunucu ve zamanlayıcı aynı motoru ve süreçler arası dosya kilidini kullanır. Dosya atomik değiştirilir; hata kalan eski fiyatın kontrol zamanını yenilemez. Boş kaynak yanıtı eski teklifin yeniymiş gibi kalmasını engeller. Önceki tahmin içeren önbellek sürümleri kullanılmaz.
- Yerel bilgisayar açık ve görev hesabının çalışma koşulları sağlanmış olmalıdır. Bu çalışma siteyi internete yayımlamaz veya 24 saat açık hosting sağlamaz.
- Günlük: `data/sync.log`; fiyat verisi: `data/daily_live_prices.json`. `GET /api/sync-prices` salt durum okur; ziyaretçiler toplu tarama başlatamaz. Zorunlu tetikleme sunucu gizli anahtarını gerektirir.
- Kurulum betiği `scripts/install-flight-task.ps1`, Windows'un yerleşik gizli komut penceresini ve mevcut Node kurulumunu kullanır. Sistem yürütme politikası değiştirilmedi. `scripts/scheduled-sync.cjs --check` ağ isteği olmadan başlatıcıyı kontrol eder.

Son gerçek çalıştırma **23 Ekim 2026 22:34 Türkiye saati** itibarıyla 485/485 rotayı kontrol etti: **351 rota güncellendi, 134 rota için sonuç bulunamadı, 0 ağ/servis hatası**. Beş kalkışın tamamında ve 94 şehirde en az bir teklif bulundu; kalan altı şehre hayalî uçuş eklenmedi. Bu sayılar belirli tarihler için tüm uçuş envanteri veya müsaitlik garantisi değildir. Windows görevi **0 başarılı çıkış koduyla** tamamlandı; sonraki zaman **24 Ekim 00:00** olarak okundu.

## Ücretsiz kullanım sınırları

SerpApi hesabı içe aktarma sırasında Free Plan, aylık ücret 0, aylık sınır 250 ve ek kredi 0 olarak doğrulandı. Uygulama tüm SerpApi aramalarına **200/son 31 gün** sert sınırı uygular. Olağan saatlik sınır 45'tir. Yerel içe aktarıcı, hesap API'sinden doğrulanmış ücretsiz saatlik hakkı kısa süreli bir kayıtla kullanabilir; en fazla 200/saat ve 200/31 gün sınırları yine korunur. Geçersiz, ücretli veya bir saatten eski hak kaydı sınırı yükseltmez. Aynı anahtarın başka uygulamalarda kullanımı bu yerel sayaca dahil değildir.

Ücretli paket, kredi, kart veya otomatik satın alma açılmadı. E-posta kurulumu ve gönderimi sonraya bırakıldı. Ortam, eski fiyat dosyası ve görev XML'i OneDrive dışındaki yerel yedeğe alındı; gizli değerler rapora yazılmaz.

## Doğrulama

- **153/153 otomatik test geçti.** Yeni kontroller 100 şehir/otel arşivini, tarih/kişi/gece değişimlerini, kota korumasını, 485 rota kapsamını, kaynak havalimanı eşleştirmesini, eski fiyatı yenilememe davranışını, süreç kilidini ve yalnızca ücretsiz uçuş yolunu kapsar.
- TypeScript, üretim derlemesi, 176 dosyada hedefli statik güvenlik kontrolü ve `npm audit` geçti; bağımlılık taramasında **0 bilinen açık** bulundu. Bu sonuç tam bir güvenlik denetimi iddiası değildir.
- Ayrı üretim kopyasında Madrid'in 22–26 Kasım otelleri ve **25/25 kaynak GPS işareti**, konaklama toplamları ve geçmiş fiyat etiketi tarayıcıda görüldü. 14–22 Ocak 2027 gerçek Aviasales kaydı ayrı sorgu gerektirmeden plana girdi: **8.506 TL kişi başı / 17.012 TL iki kişi bütçe tahmini**. Eksik varış saatleri üretilmedi.
- Başka tarihe ait Madrid otellerinde eski dört gece fiyatı kullanılmadı; gerçek tesis/GPS kaydı ile bütçe tahmini gösterildi. Pratik priz ve su kartları şehir rehberine bağlandı.
- Genel CSS, Navbar ve e-posta modülünün SHA-256 özetleri başlangıç yedeğiyle aynı. Yeni ücretli sağlayıcı, SMTP, paket veya internet yayını etkinleştirilmedi.
- Asıl localhost:3000 geliştirme sunucusu yeniden başlatıldı. Ana sayfa ve durum uç noktası HTTP 200 verdi; sayfada CSP başlığı doğrulandı. Zamanlayıcının 0 çıkış kodu ve 00:00 sonraki çalıştırması okundu.
- Yeniden başlatılan asıl sunucuda 22–26 Kasım Madrid planı HTTP 200 / `no-store` döndürdü: **25 arşiv oteli ve tarihle eşleşen 8 Aviasales gösterge uçuşu**. Bu uçuş isteği otel/SerpApi kotasını kullanmadı. Üretim tarayıcı kontrolünde konsol hatası görülmedi; test kopyası kapatıldı.
- Görseller: `rotazur-100-sehir-oteller.png`, `rotazur-ucretsiz-ucus-otomasyonu.png`.

## Resmî kaynaklar

- [Aviasales Data API ve prices_for_dates açıklaması](https://support.travelpayouts.com/hc/en-us/articles/203956163-Aviasales-Data-API), [resmî hız sınırları](https://support.travelpayouts.com/hc/en-us/articles/4402565416594-API-rate-limits)
- [Booking şehir dizini](https://www.booking.com/city.en-gb.html), [SerpApi Booking şeması](https://serpapi.com/booking-search-api), [hesap API'si](https://serpapi.com/account-api)
- [Booking Demand API ön koşulları](https://developers.booking.com/demand/docs/getting-started/prerequisites), [fiyat farkları](https://developers.booking.com/demand/docs/accommodations/pricing-troubleshooting)
- [Skyscanner partner başvurusu](https://www.partners.skyscanner.net/contact/travel-api), [OurAirports açık veri](https://ourairports.com/data/)
