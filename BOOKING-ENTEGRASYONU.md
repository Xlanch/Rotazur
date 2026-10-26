# Booking fiyat entegrasyonu — 23 Ekim 2026

## Mevcut durum

**23 Ekim akşam güncellemesi:** Kapsam 100 şehre çıktı; ücretsiz tek seferlik aramada 2.492 tesis kaydedildi. İçe aktarma 22–26 Kasım 2026, 2 yetişkin/1 oda içindir. Arşiv fiyatları güncel fiyat olarak sunulmaz; başka tarihler ve kişi sayıları ayrı sorgulanır. Güncel kapsam, kota istisnası ve uçuş otomasyonu [SEHIR-VE-UCUS-GUNCELLEMESI.md](SEHIR-VE-UCUS-GUNCELLEMESI.md) içindedir. Aşağıdaki hesap sayıları ve test adetleri önceki kontrol anını anlatır; 100 şehir için otel otomasyonu kurulmadı. Yeni 00:00/12:00 görevi ücretsiz uçuş/hava/kur içindir ve SerpApi otel kotasını kullanmaz.

SerpApi anahtarı kullanıcı tarafından yerel ortama eklendi ve canlı arama çalışıyor. Son hesap kontrolünde Free Plan, aylık 0 dolar, 11 kullanılan / 239 kalan sorgu ve 0 ek kredi görüldü. Ücretli paket, ek kredi, otomatik yenileme veya fiyat tarama görevi açılmadı. Site bu çalışma sırasında internete yayımlanmadı.

`HOTEL_PRICE_PROVIDER=booking-serpapi` seçimi yerel ayarda etkin. Anahtar frontend koduna veya yanıtlara aktarılmaz. Servis/kota sorunu olduğunda katalog otelleri bütçe tahmini olarak işaretlenir. Katalog otellerinin doğrulanmamış konumları haritada, navigasyonda ve check-in noktalarında otel konumu olarak kullanılmaz. Eski kayıtların otel işaretleri de bu kurala tabidir.

### Fiyat farkı incelemesi

- Kullanıcının örneği: Bangkok, Bang lumphu home stay, 22–26 Kasım 2026, 2 yetişkin / 1 oda. Kaynak 1.551,46 TL konaklama ve 108,60 TL hariç vergi döndürdü. Toplam 1.660,06 TL; aynı koşullarda Booking tarayıcı ekranı 1.660 TL gösterdi. Eski kartta öne çıkarılan 387,86 TL vergisiz gecelik tutardı. Yeni kartta ana fiyat 4 gece için 1.660,06 TL, bilinen ücretlerle gecelik ortalama 415,02 TL. Gerçek site ekranı ve bağlantı parametreleri doğrulandı.
- Karşı örnek: Roma, RAHIMA GUEST HOUSe 2, 5–8 Kasım 2026, 2 yetişkin / 1 oda. SerpApi 6.490,29 TL + 3.039,44 TL ücret döndürürken aynı tarihlerde açılan anonim masaüstü Booking sayfası ilk oda teklifinde yaklaşık 7.996 TL + 2.334 TL gösterdi. Bu fark yalnızca toplam/gecelik gösterim değişikliğiyle çözülemez. Kaynak, ziyaretçinin Booking oturumunu ve kesin oda/fiyat ürününü paylaşmadığından bütün tesislerde birebir eşitlik doğrulanmış değildir.
- Mobil/tablet/masaüstü bağlamı artık HTTP User-Agent üzerinden sorguya iletilir ve eşzamanlı sorgu anahtarında ayrılır. Ülkeye ve üyeliğe özel Booking fiyatları bu servisle eşitlenemez; bir fiyat çarpanı veya uydurma düzeltme uygulanmadı.

Bu entegrasyon Booking.com Demand API veya Booking tarafından verilmiş bir iş ortaklığı onayı değildir. SerpApi, Booking arama sonuçlarını döndüren üçüncü taraf bir hizmettir. Hizmetin hesap ve kullanım koşulları hesabın sahibi tarafından değerlendirilmelidir.

## Canlı aramayı açmak için

1. [SerpApi fiyatlandırma sayfasından](https://serpapi.com/pricing) ücretsiz hesap koşullarını kontrol edip hesabı kendiniz oluşturun. Kontrol tarihinde ücretsiz plan 250 arama/ay ve 50 arama/saat sunuyor. Bu çalışma sırasında hesap, ücretli paket veya ödeme bilgisi oluşturulmadı.
2. Anahtarı sohbet mesajına yazmadan `.env.local` içindeki `SERPAPI_KEY` alanına, üretimde ise hosting ortam değişkenine ekleyin. `HOTEL_PRICE_PROVIDER=booking-serpapi` kalmalıdır. Anahtar frontend koduna veya yanıtlara aktarılmaz.
3. Ortam değişikliğinden sonra sunucuyu yeniden başlatın. Bir şehir, tarih ve kişi sayısıyla yeni plan açın. Gelen otellerin Booking bağlantısı, tarihleri, oda koşulları, TRY tutarı ve konumu gerçek sağlayıcı yanıtıyla kontrol edilmelidir. Yerel canlı testler yapıldı; tüm şehirlerdeki bütün otellerin Booking ekranıyla eşit olduğu iddia edilmez.

`BOOKING_AFFILIATE_ID` ancak Booking tarafından size verilen gerçek bir kimlik varsa kullanılmalıdır. Travelpayouts marker farklı bir programa aittir ve Booking `aid` parametresine artık yazılmaz.

## Veri ve fiyat kuralları

- Uygulamadaki 26 şehrin hepsi aynı sağlayıcı akışını kullanır. Arama, şehir adı, giriş/çıkış tarihi, 1–9 yetişkin, hesaplanan oda sayısı ve TRY ile yapılır. İlk sayfada en fazla 25 sonuç istenir; bütün Booking envanterinin kopyalandığı iddia edilmez. Çocuk yaşları bu arayüzde toplanmıyor.
- Booking otel kimliği ve doğrudan tesis bağlantısı korunur. Yalnızca HTTPS Booking tesis bağlantıları kabul edilir. Farklı tarih/kişi/oda koşulları, çocuk/çocuk yaşı, esnek tarih, uyuşmayan cihaz, çelişkili tekrar parametreleri, başka para birimi, tükenmiş oda, eksik/şehirden çok uzak GPS bilgisi ve mükerrer tesisler elenir. Bağlantılar TRY, sıfır çocuk ve toplam fiyat görünümüne sabitlenir. Kaynak oturum kimlikleri silinir; varsa gerçek oda/teklif kimlikleri korunur, olmayan bir fiyat sabitleme parametresi uydurulmaz.
- Kartın ana fiyatı bütün konaklama bedeli + kaynağın açıkça hariç verdiği bilinen vergi/ücretlerdir. Gecelik ortalama bu toplamdan hesaplanır. Reklamdaki gecelik bedel bütçeyi veya ana fiyatı belirlemez. Oda/kişi sayısıyla ikinci kez çarpılmaz; kuruşlar korunur. Kaynak TRY tutarı gösterilir; diğer para birimlerine çevrim yaklaşık olarak etiketlenir ve Booking döviz kuru olarak sunulmaz.
- Oda adı ve adetleri, yatakhane yatağı gibi birim türleri, varsa iptal/ön ödeme/öğün ve fırsat bilgileri korunur. İstenen oda sayısı, kaynağın kesin özel oda kapasitesi olarak gösterilmez. Aynı oda ve iptal/ödeme koşullarının karşılaştırılması gerektiği kartta açıklanır.
- Bilinmeyen ek ücretler sıfır veya vergi dahil olarak etiketlenmez. Fiyatın kontrol zamanı gösterilir. Son fiyat, iptal ve ödeme koşulları Booking sayfasında doğrulanmalıdır; Genius, ülke, cihaz, hesap ve müsaitlik farkları için yüzde yüz eşitlik garantisi verilmez.
- `no_cache=true` ile yeni kaynak sorgusu istenir. Booking modunda otel ve bütün plan sonucunun uygulama önbelleği kullanılmaz; yalnızca aynı anda gelen aynı istek birleştirilir. On dakikadan eski sağlayıcı yanıtı güncel sonuç olarak kabul edilmez. Açık kartlar yaşlandığında geçmiş arama olarak etiketlenir; eski kayıtlar güncel fiyat diye sunulmaz.
- Sorun veya kota durumunda canlı etiketi kaldırılarak açıkça işaretli bütçe tahminine dönülür. Gerçek Booking fiyatı varmış gibi veri üretilmez.

## Kota ve otomasyon

Bu uygulamanın tüm SerpApi uçuş/otel aramaları birlikte, SQLite üzerinden **son 31 günde 200** ve **son bir saatte 45** dış arama ile sınırlandırılır. Sayaçlar yeniden başlatmada korunur ve paralel süreçler aynı kotayı paylaşır. Ağ hatasında başka taşıyıcıyla ikinci SerpApi isteği gönderilmez. Başarısız denemeler de ihtiyatlı olarak sayılır.

Bu sayaç aynı anahtarın başka sitelerdeki kullanımını veya sağlayıcı hesabının ücretli planını denetleyemez. Ücretsiz hesapta kalmak, otomatik kredi/ücretli yükseltme açmamak ve hesabın kendi kotasını izlemek hesap sahibinin kontrolündedir; sınırsız ücretsiz kullanım sözü verilmez.

Kullanıcının son yönlendirmesiyle otomasyon şimdilik ertelendi. 26 şehri günde iki kez sorgulamak ayda yaklaşık 1.560 arama yapar; bu, ziyaretçi aramaları hariç ücretsiz 250 kotasını aşar. Ayrıca fiyatlar tarihe, kişi/oda sayısına ve koşullara bağlıdır: 00.00/12.00 taraması her rezervasyon için anlık fiyat eşitliği sağlayamaz. İleride Türkiye saatine göre bu iki saat için yayın sunucusunda görev hazırlanabilir; şu anda böyle bir görev kurulmadı.

## Doğrulama ve kaynaklar

106 otomatik test geçti. Yeni kontroller Bangkok örneğini, 26 şehir × 4 kişi seçimi × 3 konaklama süresinde toplam/bütçe hesabını, 26 şehir × 3 cihaz türünü, çocuk/esnek tarih/çelişkili bağlantı parametrelerini, gerçek teklif kimliğinin korunmasını, oda/iptal koşullarını ve eski fiyat etiketini kapsar. Bu şehir matrisleri ücretli/kotalı dış servise gitmeyen test yanıtlarıyla çalışır; 26 şehrin tüm otelleri canlı karşılaştırılmış değildir. TypeScript, yalıtılmış üretim derlemesi ve 147 dosyalık hedefli statik güvenlik kontrolü geçti. E-posta kurulumu ve gönderimleri ertelenmiş kalır.

- [SerpApi Booking Search API ve yanıt şeması](https://serpapi.com/booking-search-api)
- [SerpApi güncel fiyatlandırması](https://serpapi.com/pricing)
- [Booking Demand API erişim ön koşulları](https://developers.booking.com/demand/docs/getting-started/prerequisites)
- [Booking fiyat ve envanter kapsamı açıklaması](https://developers.booking.com/demand/docs/accommodations/search-for-available-properties)
- [Booking fiyat farklarını giderme ve nihai fiyat doğrulama](https://developers.booking.com/demand/docs/accommodations/pricing-troubleshooting)
- [Booking cihaz/ülke/üyelik fiyatları](https://developers.booking.com/demand/docs/accommodations/discounts)
