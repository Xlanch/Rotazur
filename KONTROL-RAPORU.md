# Rotazur — 24 Ekim 2026 kontrol sonucu

## Son durum — kalan sorunların denetimi

Cüzdan/grup hesaplaşmasında dil desteğinin yuvarladığı kuruşlar geri getirildi. Kur kaynakları ve kayıtlı planlar için sayı/taban/tarih doğrulaması sıkılaştırıldı; sabit kurların güncelmiş gibi tarihlenmesi kaldırıldı. Fiyat alarmında tarayıcı depolaması yüzünden yanlış başarısızlık, çift gönderim ve eski hesap/şehir isteklerinin yeni pencereyi etkilemesi düzeltildi. Pano/tema hataları ve rehberde kalan bazı karışık dil parçaları giderildi. **182 test**, TypeScript, hedefli güvenlik taraması ve üretim derlemesi başarılı; bilinen bağımlılık açığı **0**. Dokuz bileşenin tasarım sınıfları, genel CSS, e-posta modülü ve bağımlılıklar aynı kaldı. Ücretli hizmet veya e-posta gönderimi açılmadı. Ayrıntılar [kalan sorunlar denetiminde](KALAN-SORUNLAR-DENETIMI-2026-10-24.md).

## Önceki durum — sekiz dilde rota ekranı

Ana sayfada kalan dil kapsamı rota ekranı, otel/uçuş koşulları, 100 şehir rehberi ve yardımcı pencerelere genişletildi. 10.053 güncel metin/şablon yedi çeviri sözlüğünde kapsanır. Tarih/sayı/para biçimleri, Arapça yönü, ilk açılış dili, sekme başlıkları ve çevrimdışı dil dosyaları düzeltildi. Sekiz dil üretim ekranında doğrulandı; 25 otel ve rezervasyon bağlantıları dil değişiminde korundu. **173 test**, TypeScript ve üretim derlemesi başarılı; bağımlılık açığı 0. Genel CSS ve incelenen 49 TSX dosyasının className değerleri değişmedi. Ayrıntılar [dil denetimi raporunda](DIL-DENETIMI-2026-10-24.md).

## Önceki durum — 100 şehirde otel ve uçuş denetimi

Dört hatalı bölge/havalimanı sorgusu düzeltildi. Kapsam 2.498 tesis ve 2.482 kaynak GPS kaydına ulaştı. Uçuşlarda 14 gece sınırı, süre sonu, para birimi ve önbellek kontrolü; fiyatlarda kuruş hassasiyeti ve esnek tarih düzeltmeleri yapıldı. **163 test** geçti. Ayrıntılar [24 Ekim denetim raporunda](OTEL-UCUS-DENETIMI-2026-10-24.md). Aşağıdaki bölümler önceki aşamaların kaydıdır.

## Önceki durum — 100 şehir ve ücretsiz uçuş otomasyonu

100 şehir için 2.492 Booking tesis kaydı alındı; 2.475 tesisin adres/kimlik/GPS kaydı birlikte doğrulandı. Saklanan 22–26 Kasım fiyatı başka tarih veya kişi sayısı için kullanılmaz. Ücretsiz Aviasales Data API uçuş akışı ve Türkiye saatiyle 00:00/12:00 yerel görevi eklendi; fiyatlar gösterge olarak etiketlenir. Ayrıntılar ve sınırlar [SEHIR-VE-UCUS-GUNCELLEMESI.md](SEHIR-VE-UCUS-GUNCELLEMESI.md) dosyasındadır. Aşağıdaki bölümler önceki aşamaların tarihçesidir.

## Önceki durum — ilk üç ek güvenlik maddesi ve şifre geçmişi

- Kullanıcı isteğiyle yeni/sıfırlanan şifrelerde alt sınır **10**; ortak tarayıcı/sunucu politikası ve yerel yaygın şifre kontrolü eklendi. Mevcut şifreyle giriş korunur; yeni şifre seçerken mevcut ve önceki beş şifre reddedilir. Geçmiş düz metin içermez, yalnızca tuzlu özetleri tutar ve başarılı değişikliklerle bundan sonra oluşur.
- Sıfırlamanın ağır şifre/geçmiş işlemleri asenkron ve SQLite yazma kilidi dışında; ikinci aşamada OTP/hesap/şifre tekrar kontrol edilir. Geçmiş, yeni şifre, kod tüketimi ve oturum iptali birlikte commit/rollback olur. Yarış veya hata eski bir kodu/oturumu geri getiremez.
- Üretim kayıt/kurtarma talepleri hesap var/yok/Google türünden bağımsız aynı 200 gövdesiyle yanıtlanır; teslimat/test kodu bilgisi açıklanmaz. Hesap kontrolü ve mevcut gönderim işlemi yanıt tamamlandıktan sonra Next `after()` ile çalışır. Hatalı/eksik/süresi geçmiş OTP yanıtları da aynılaştırıldı. Yeni e-posta servisi kurulmadı veya gerçek gönderim açılmadı.
- Ortak JSON okuyucusuna toplam 10 saniye, gerçek bayt sınırı, istemci iptali ve katı UTF-8 kontrolü eklendi. Plan e-posta uç noktası 64 KiB sınırını artık gövdeyi okurken uygular. Büyük/yavaş/bozuk istekler gönderim sınırına ulaşmadan reddedilir; hiçbir SMTP ayarı veya şablon değiştirilmedi.
- Girişte modern/eski özetli ve bulunmayan hesaplar aynı modern + eski scrypt hesaplama sırasından geçer. Özet maliyetinden kaynaklanan hesap varlığı/türü zamanlama farkı azaltıldı; kapasite sınırı korunur. Mutlak sabit ağ yanıt süresi iddia edilmez.
- **135 test**, TypeScript, 163 dosyada hedefli statik güvenlik kontrolü ve `npm audit` (0 bilinen açık) geçti. Son kaynaklarla ayrı kopyada `npm run build` tamamlandı. AuthModal içindeki **168 `className` niteliği** değişiklik öncesiyle aynı; genel CSS, Navbar ve e-posta modülünün dosya özetleri de aynı. Üretim tarayıcısında kayıt alanının `minLength=10`, `maxLength=1024` ve mevcut görünümü doğrulandı.
- SMTP/dış API anahtarları boş olan ayrı üretim test sunucusunda kayıt/kurtarma yanıtlarının eşitliği, mevcut ve önceki şifrenin reddi, sıfırlamada oturum iptali, büyük gövde için **413**, yavaş gövde için **10.019 saniyede 408** doğrulandı. Yalnızca geçici test hesapları kullanıldı ve temizlendi. Gerçek veritabanının şifreli yedeği alınıp geçici veritabanında geri açılabildiği doğrulandı.
- Ayrıntılar [GUVENLIK-VE-YAYIN.md](GUVENLIK-VE-YAYIN.md) dosyasında. Ücretli servis, abonelik, ek kredi ve fiyat API sorgusu kullanılmadı; e-posta kurulumu ertelendi.

## Önceki durum — ücretsiz güvenlik güçlendirmeleri

- Yeni parola özetleri OWASP'ın scrypt `N=16384, r=8, p=5` profiline taşındı. Eski şifreler başarılı girişte kendiliğinden yükseltilir. Girişteki hesaplama asenkron ve işçi başına dört işlemle sınırlıdır; bekleyen sınırsız kuyruk oluşmaz. Doğrulama sırasında yapılan şifre sıfırlaması, eski şifreyle oturum açılmasını engeller.
- Oturum anahtarlarının kendisi yerine SHA-256 özeti saklanır. Doğrulanmış eski oturumlar çerezleri bozulmadan işlemsel olarak dönüştürülür; önceki güvenilmez oturumlar etkinleştirilmez. Veritabanındaki özetin çerez olarak tekrar kullanılması testte reddedildi.
- Her HTML isteğinde taze nonce üreten CSP eklendi. Üretimde betikler için `unsafe-inline`/`unsafe-eval` kullanılmaz; Leaflet ve animasyonların inline stilleri korunur. Next betikleri, tema ve JSON-LD nonce eşleşmesiyle çalışır. Kişiselleştirilmiş HTML önbelleğe alınmaz; nonce için sayfalar dinamik render edilir.
- Hassas sunucu modülleri `server-only` sınırıyla korundu. `npm run build`, güvenlik taraması/TypeScript/regresyon testleri/bağımlılık denetimi başarısızsa durur. `npm start` HTTPS site URL'si ve temel üretim ayarlarını kontrol eder; gerçek TLS ve proxy yapılandırması yayın ortamında ayrıca doğrulanmalıdır.
- Ücretsiz `npm run backup:db` komutu eklendi: SQLite WAL dahil tutarlı yedek → AES-256-GCM şifreleme → geçici veritabanına geri açma → bütünlük kontrolü. Gerçek yerel veritabanının yedeği alındı ve doğrulandı. Yedek/anahtar proje ve OneDrive dışında, yalnızca mevcut kullanıcı ve SYSTEM erişimli klasörde tutulur. Düzenli yedek zamanlaması kurulmadı.
- **123 test**, TypeScript, 159 dosyada hedefli statik güvenlik kontrolü, `npm audit` (0 bilinen açık) ve ayrı kopyada üretim derlemesi geçti. Üretim HTTP kontrolünde ana sayfa, offline ve hakkımızda sayfalarında nonce/ilk betikler/`no-store` doğrulandı; anonim plan API erişimi 401 döndü.
- Üretim tarayıcısında ana sayfa → Roma planı geçişi, haritanın mutlak konumlanan panoları, uydu katmanı ve çevrimdışı paket hazırlığı doğrulandı; CSP engelleme hatası görülmedi. Ayrı test sunucusu kapatıldıktan sonra `/offline` üzerinden kayıtlı Roma planı yeniden açıldı; tarih, seçili otel ve ₺57.977 bütçe korundu. Bu son adımda yeni canlı fiyat sorgusu yapılmadı. Görsel: `rotazur-guvenlik-cevrimdisi.png`. Asıl localhost:3000 geliştirme sunucusu açık bırakıldı.
- Genel CSS, Navbar ve e-posta modülünün SHA-256 özetleri yedekle birebir aynı. Ücretli servis/abonelik, SMTP kurulumu ve internete yayın yapılmadı; üretim tarayıcı kontrolü ayrı kopyada ücretli sağlayıcı anahtarları boş bırakılarak çalıştırıldı. Ayrıntılar [GUVENLIK-VE-YAYIN.md](GUVENLIK-VE-YAYIN.md).

## Önceki durum — otel GPS ve ücretsiz uydu

- Harita doğruluğunu bozan eksik Leaflet yapısal CSS yüklemesi bulundu: döşeme/işaretçi panoları `static` kalıyordu. CSS kök layout'a taşındı; yeni sayfa yüklemesinde panolar, döşemeler ve işaretçilerin hizalanması tarayıcıda doğrulandı. Genel stil dosyası ve Navbar değiştirilmedi.
- Booking kimliği, ülke/tesis URL yolu, adres ve GPS kaynak kaydı birbirine bağlandı. Eksik veya uyuşmayan kayıt otel iğnesi/yol tarifi olarak kullanılmaz. Eski planların veya tahmini katalogların noktaları şehir merkezine taşınarak otelmiş gibi sunulmaz.
- Oteller sekmesinde dönen bütün uygun tesisler ayrı işaretlerle gösterilir; Bangkok canlı kontrolünde 25/25 tesis görüldü. İşaretçi seçimi kartı ve odağı değiştirir. Google Harita bağlantısının şehir merkezi yerine seçili otelin tam koordinatını açması düzeltildi. Eski check-in koordinatları navigasyonda yeni otelin kaynak noktasının yerini alamaz.
- ESA WorldCover Sentinel-2 2021 / Terrascope genel WMTS ile **anahtarsız ve ücretsiz** uydu görünümü eklendi. CC BY 4.0 atfı, 2021 yılı ve yaklaşık 10 m sınırı görünür; bina girişi veya güncel görüntü garantisi verilmez. Sokak/uydu aynı EPSG:3857/XYZ sistemini ve aynı GPS noktalarını kullanır. Uydu hatasında/zaman aşımında sokak görünümüne dönülür. Ücretli hesap/paket açılmadı.
- 26 şehir için kaynak/projeksiyon testleri geçti. Canlı WMTS kapsam denemesinde 16 şehirde PNG tamamlandı; 10 şehirde ağ zaman aşımı/bağlantı sıfırlanması nedeniyle tam görüntü doğrulanamadı. Bangkok daha sonra tarayıcıda hem sokak hem yüklenmiş uydu görüntüsüyle, aynı `13.7606315,100.4965923` noktası üzerinde doğrulandı. Kesintisiz uydu servisi veya tüm tesislerin fiziksel giriş kapılarının bağımsız doğrulaması iddia edilmez.
- **115 otomatik test**, TypeScript, 152 dosyada hedefli statik güvenlik kontrolü ve ayrı kopyada üretim derlemesi geçti. Görseller `rotazur-otel-sokak-konum.png` ve `rotazur-otel-uydu-konum.png`. Detaylar [HARITA-KONUM-KONTROLU.md](HARITA-KONUM-KONTROLU.md).
- E-posta kurulumu/gönderimi, fiyat otomasyonu ve siteyi internete yayımlama yapılmadı. SerpApi kota korumaları değiştirilmedi; uydu katmanı SerpApi kotasını kullanmaz.

## Önceki durum — Booking fiyat karşılaştırması

- Kullanıcının Bangkok örneği canlı kaynak ve Booking tarayıcı ekranıyla karşılaştırıldı: Bang lumphu home stay, 22–26 Kasım 2026, 2 yetişkin / 1 oda. 1.551,46 TL konaklama + 108,60 TL ek vergi = **1.660,06 TL**. Booking ekranı **1.660 TL** gösterdi. Eski kartta ana tutar olan 387,86 TL vergisiz gecelik bedeldi; yeni kart ana tutarı bütün konaklamanın bilinen ücretlerle toplamı olarak gösteriyor. Gecelik ortalama 415,02 TL ve kişi başı ortalama ayrı yazılıyor.
- Ortak düzeltme 26 şehir için geçerli. TRY kaynak tutarı korunuyor; diğer para birimlerine çevrim yaklaşık olarak etiketleniyor. Bağlantılar aynı tarih, yetişkin/oda sayısı, sıfır çocuk, TRY ve toplam fiyat görünümünü taşıyor. Çelişkili tekrar parametreleri, çocuk yaşları ve esnek tarih sonuçları kabul edilmiyor; kaynaktan gelen gerçek teklif kimliği korunuyor, kaynak oturumu paylaşılmıyor.
- Mobil/tablet/masaüstü bilgisi arama ve eşzamanlı istek anahtarına eklendi. Oda/yatak adetleri, iptal, ön ödeme, öğün ve fırsat koşulları kaynaktan korunuyor. İstenen oda sayısı kesin özel oda kapasitesi olarak sunulmuyor. On dakikadan eski kayıtlar geçmiş arama fiyatı olarak etiketleniyor.
- **Kalan dış servis sınırı:** Roma RAHIMA GUEST HOUSe 2 örneğinde kaynak ve anonim Booking oturumu aynı koşullarda farklı tutarlar döndürdü. Bu nedenle bütün otellerde birebir fiyat eşitliği sağlandı denilemez. SerpApi arama sonucu kesin Booking ürününü veya ziyaretçi oturumunu sabitlemiyor. Ülke/üyelik/cihaz/ödeme koşullarına bağlı farklar için uydurma katsayı uygulanmadı. Ayrıntılar [BOOKING-ENTEGRASYONU.md](BOOKING-ENTEGRASYONU.md) dosyasındadır.
- **106 test geçti.** Yeni testler Bangkok fiyatını, 26 şehir × 4 yetişkin sayısı × 3 gece sayısı kombinasyonunda bütçeyi, 26 şehir × 3 cihaz türünü, bağlantı/çocuk/esnek tarih tutarlılığını ve teklif/yaşlanma koşullarını kapsıyor. Bu geniş matrisler izole yanıtlarla çalışır; tüm şehirlerdeki bütün oteller canlı sorgulanmadı. TypeScript, 147 dosyalık hedefli statik güvenlik taraması ve ayrı kopyada üretim derlemesi geçti.
- Tarayıcıda gerçek yerel kart, aynı otelin Booking bağlantısı, toplam ve EUR yaklaşık dönüşümü kontrol edildi. Görsel kayıt: `rotazur-booking-toplam-fiyat.png`. Genel stil ve Navbar değiştirilmedi.
- Son SerpApi hesap kontrolü: **Free Plan / aylık 0 dolar**, 11 kullanılan / 239 kalan sorgu, 0 ek kredi. Hesap ayarı, ücretli paket, ek kredi veya otomasyon açılmadı. E-posta işi ertelenmiş kalır.

## Önceki durum — otel fiyat kaynağı ve navigasyon (anahtar eklenmeden önce)

- **99 test geçti:** önceki 74 teste, navigasyon/ağ/Story için 13 ve Booking sağlayıcısı/kota için 12 test eklendi. TypeScript, 146 dosyada hedefli statik kontroller ve paket taraması geçti. Son kaynakların ayrı kopyada üretim derlemesi kontrol edildi.
- Dış JSON/görsel yanıtlarının gerçek bayt sınırı ve toplam zaman aşımı var. HTTP veya bozuk veri hataları otomatik olarak tekrar sorgulanmaz. Görseller doğrulanan içerik türüyle, tekilleştirilmiş sınırlı önbellekle sunulur.
- Navigasyonda yinelenen son/başlangıç otel noktası kaldırıldı. Uzun yürüyüş rotaları mobil uyumlu parçalara; toplu taşıma rotası sıralı bacaklara ayrılır. İkinci bölümün QR/link güncellemesi ve kopyalanması tarayıcıda doğrulandı. Mesafe kuş uçuşu olarak etiketlendi.
- Boş tarih, 14 geceden uzun arama ve geçersiz kişisel aktivite saati engellenir. Yıl sonu dönüş tarihi, boş tarih ve `25:99` hatası tarayıcıda kontrol edildi. Paylaşım ve navigasyonda başarı yalnızca pano işlemi tamamlandıktan sonra gösterilir. Story görselinde eski şehir isteği yeni görseli değiştiremez; PNG hazırlama ve paylaşım hataları görünürdür.
- Kullanıcının Booking isteği için SerpApi Booking Search entegrasyonu hazırlandı. **Anahtar bulunmadığından gerçek Booking fiyatı alınmadı ve canlı fiyat etkin değildir.** Kaynak şemasıyla izole testler yapıldı. Ayrıntılar ve etkinleştirme adımları [BOOKING-ENTEGRASYONU.md](BOOKING-ENTEGRASYONU.md) dosyasındadır.
- Booking ile yüzde yüz fiyat/kapasite uyumu iddiaları kaldırıldı; bütçe tahmini, gerçek sağlayıcı yanıtı ve doğrulanmamış konum ayrıldı. Doğrulanmamış otel noktaları haritada gösterilmez. Oda/grup toplamı ikinci kez çarpılmaz ve doğrulanmış teklifte kuruşlar korunur.
- Ücretli abonelik, Booking/SerpApi hesabı veya 00.00/12.00 zamanlanmış görev oluşturulmadı. Site internete yayımlanmadı. E-posta kurulumu/gönderimleri sonraya bırakıldı.
- Son tarayıcı kontrolünde Roma otel kartlarında tahmin/katalog etiketleri ve tarih/kişi/oda parametreleri görüldü. Harita doğrulanmamış otel iğnesi göstermedi; şehir haritası olduğunu belirtti. Görsel kayıt: `rotazur-booking-hazirlik.png`. Genel stil, Navbar ve e-posta taşıma dosyası geliştirme öncesi yedekle aynı.

## Derin inceleme — son geliştirme grubu

Bulunan sorunlar önem sırasına göre giderildi:

1. **Kimlik doğrulama:** Kayıt doğrulama ve şifre sıfırlama kodlarının okunması, tüketilmesi, kullanıcı/şifre değişikliği ve oturum işlemleri aynı SQLite işlemi içine alındı. Bir kod paralel çalışan süreçlerde yalnızca bir kez kullanılabilir. İşlem hatasında şifre, kod ve oturumlar birlikte geri alınır. Var olan hesabın eski kayıt kodu giriş yapamaz. Kod denemeleri, geçersiz/geçmiş son kullanma tarihi, farklı kaynak ve istek boyutu kontrolleri eklendi. Gönderim uç noktaları ve rehber önizlemesine de kaynak, boyut ve istek sıklığı koruması eklendi; SMTP taşıma kodu değiştirilmedi.
2. **Bağımlılık güvenliği:** `npm audit`, Next.js altındaki PostCSS 8.4.31 için dosya okuma ve HTML çıktısı açıkları bildirdi. Next.js ana sürümü değiştirilmeden `overrides.postcss=8.5.31` ile tüm PostCSS kopyaları düzeltildi. Kilit dosyası güncellendi; `npm ls postcss` ve geliştirme bağımlılıkları dahil `npm audit` sonucunda bilinen açık sayısı 0.
3. **Alarm kayıtları:** Eşzamanlı JSON dosyası yazımları yerine API ve mevcut senkronizasyon betiğinin ortak kullandığı işlemsel SQLite deposu getirildi. Eski `data/price_alerts.json` dosyası silinmeden bir kez aktarılır. Sahipsiz eski kayıtlar bir e-posta eşleşmesine göre kullanıcıya bağlanmaz. Alarm silme ve tetikleme sahiplik/işlem korumalıdır. E-posta gönderimi açılmadı.
4. **Gezi durumu:** Aktivitelerin işaretleri sıra numarası yerine kalıcı kimliğe bağlandı. Eski kayıtlardaki işaretler açılışta dönüştürülür. Kişisel aktiviteler sıralama işleminden sonra ayrı tutulur; sonraki otel/uçuş/yemek paketi değişimi bunları silmez. Aynı kimliği taşıyan durakların tamamlandı işaretleri seçim değişimlerinde korunur. Şehir değişiminde eski mekân isteği iptal edilir ve eski sonuçlar yeni şehrin listesine yazılmaz.
5. **Oturum ve hata görünürlüğü:** Gecikmiş oturum sorgusu başarılı giriş/çıkışı geçersiz kılamaz. Başarısız çıkış işlemi kullanıcıyı yanlışlıkla çıkmış göstermez. Oturum yanıtı önbelleğe alınmaz. Alarm penceresi hesap değişince eski listeyi gizler ve isteği iptal eder; silme hatasını gösterir. Pencere gezinme çubuğunun üstünde açılır.
6. **Harç bilgisi:** Eski 500 TL çıkış harcı, GİB'in 2026 rehberine göre 1.250 TL olarak güncellendi. Muafiyetler için kaynak bağlantısı eklendi. Bu tutar 2027 ve sonraki yıllara otomatik taşınmaz ve yaş/muafiyet bilinmeden plan bütçesine eklenmez. Diğer ülkelerin vize kuralları bu incelemede tek tek resmî kaynaklarla doğrulanmadı; kart genel hazırlık bilgisi olarak etiketlendi.

Doğrulama sonucu:

- **74 otomatik test geçti** (önceki 62 + 12 yeni test). Yeni testler paralel kayıt/şifre sıfırlama, hata geri alma, 6 paralel alarm yazıcısı, eski veri aktarımı, sahiplik, kod deneme sınırları, güvenli önizleme girdileri, aktivite kimliği ve geciken oturum yanıtını içerir.
- TypeScript, 138 dosyada hedefli statik güvenlik kontrolü ve iki ortak JavaScript dosyasının sözdizimi kontrolü geçti.
- Son kaynaklar ve güncel paketlerle **Next.js üretim derlemesi geçti**. Geçici kopya gerçek kullanıcı veritabanını veya `.env.local` dosyasını içermez. Yanlış klasörde başlayan ilk derleme durduruldu; geliştirme sunucusu yeniden açıldı ve son derleme ayrı klasörde tamamlandı.
- Tarayıcıda kişisel aktivite eklendi, Trastevere ve kişisel aktivite tamamlandı olarak işaretlendi, rota sıralaması çalıştırıldı, ardından ekonomik ve konforlu paket seçildi. Otel Hotel Ranieri'den Hotel Eden'a değiştiğinde kişisel aktivite ve iki tamamlandı işareti korundu. Deneme aktivitesi kalıcı plana kaydedilmedi. Kaydetme/yeniden açma ve çevrimdışı davranışlar otomatik testlerde doğrulandı.
- Alarm penceresinin giriş gerektiren durumu ve 2026 harç etiketi tarayıcıda kontrol edildi. Görsel kayıt: `rotazur-aktivite-koruma.png`.
- Genel stil dosyası, Navbar ve `src/lib/email.ts` geliştirme öncesi yedekle aynı. Yeni ücretli servis/abonelik açılmadı; SMTP testi veya gerçek kullanıcıyla hesap açma/şifre değiştirme yapılmadı.

GİB kaynağı (23 Ekim 2026 kontrolü): https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fonceki-dokumanlar%2F2026_Yurt_Disina_Cikis_Harci.pdf

PostCSS duyuruları: https://github.com/advisories/GHSA-qx2v-qp2m-jg93 ve https://github.com/advisories/GHSA-r28c-9q8g-f849

E-posta kurulumu ve gönderimleri sonraya bırakıldı. Bu kontroller incelenen akışları kapsar; canlı dağıtım ortamı, e-posta teslimatı ve tüm ülke mevzuatı doğrulaması yapılmış değildir.

## Önceki geliştirme grubu

Önceki grubun kayıtları aşağıda korunmuştur.

- 62 otomatik test geçti; önceki güvenlik, uçuş/tarih, bütçe, ticari servis, kayıt ve çevrimdışı testleri de bu sayıya dahildir.
- TypeScript kontrolü ve Next.js üretim derlemesi geçti. Derleme, açık geliştirme sunucusunu etkilememek için ayrı geçici çalışma kopyasında yapıldı.
- 133 dosyada hedefli statik güvenlik kuralları geçti.
- Giriş ve herkese açık formlarda istek sınırları, sahte IP başlıkları, farklı kaynaktan gelen istekler, bozuk/büyük JSON ve adres uzunlukları test edildi. Bu testler gerçek kullanıcı veritabanına veya SMTP'ye bağlanmaz.
- Bavul listesinde bir eşyanın silinmesinin diğer işaretleri değiştirmediği doğrulandı. Önceki kontrolden kalan işaret, tarayıcı ve sunucu yeniden açıldıktan sonra da yerindeydi.
- Aynı şehre 5–8 Kasım ve 6–9 Kasım için açılan iki seyahatin bavul ve hazırlık listelerinin ayrı olduğu tarayıcıda doğrulandı. Hazırlık işareti sayfa yeniden yüklendiğinde korundu. Kontrol için oluşturulan eşya ve işaretler sonrasında kaldırıldı.
- Rehber önizlemesinde bölüm seçeneklerinin açılıp kapandığı ve kopyalama işleminin başarı durumunu doğru gösterdiği doğrulandı. Kopyalanan metnin bölüm seçimlerine uyması ve bilinmeyen saatleri doldurmaması otomatik testlerle kontrol edildi.
- Üç yolculu örnekte gecelik grup otel fiyatı 5.400 TL, üç gecelik toplam 16.200 TL olarak önizlendi; oda sayısı ikinci kez çarpılmadı.
- Yerel para dönüşümleri, cüzdan ve şehir araçlarında aynı plan kurlarıyla hesaplanır. Canlı uç nokta kontrolünde 21 para birimi için çapraz kur vardı ve 26 şehrin tamamı kapsanıyordu. Veri bulunmadığında yaklaşık referans kur açıkça belirtilir.
- İlk ziyarette kullanılabilir çevrimdışı paket yoksa yavaş sayfa veya yeni statik dosyalar 8 saniyede kesilmez. Hazır paket varsa zaman aşımında çevrimdışı yedek açılır. Her iki durum ve önceki paketin korunması test edildi.
- Genel stil dosyası ve Navbar, geliştirme öncesi yedekle aynı. Önizleme ekran görüntüsü sohbetin görselleştirme klasörüne kaydedildi.

E-posta kurulumu ve gönderimleri sonraya bırakıldı. E-posta sağlayıcısı, doğrulama kodu gönderimi ve plan e-postası gönderim kodları bu geliştirme grubunda değiştirilmedi. Yeni ücretli abonelik açılmadı.

Geliştirme sunucusu: http://localhost:3000
