# Kalan sorunlar denetimi — 24 Ekim 2026

Bu turda güvenlik, bütçe gösterimi, kur verisi, kayıtlı planlar, fiyat alarmı ve seçili dildeki ana plan akışları incelendi. Önceki kontrollerin 173 testi başlangıçta geçti. Yeni ücretli hizmet, üyelik veya bağımlılık açılmadı; e-posta gönderim modülü ve ayarları değiştirilmedi.

## Düzeltilen sorunlar

1. **Kuruşların gösterimde kaybolması.** Dil desteğinde aynı isimle kullanılan biçimlendirme işlevi, cüzdan ve grup hesaplaşmasında tutarları tam liraya yuvarlıyordu. İki bileşen artık seçili dilin iki ondalıklı para biçimini kullanıyor. 0,50 TL harcama ve iki yolcu için 0,25 TL hesaplaşma gerçek tarayıcıda doğrulandı. Sekiz dil ve sekiz para biriminde bileşen çıktıları test edildi. İlgili dönüştürme betiği de içe aktarılan işlevlerin takma adlarını koruyor.

2. **Hatalı kur verisinin bütçeye girmesi.** Sunucu, tarayıcı ve kayıtlı planlar sayısal olmayan, negatif, sıfır, sonlu olmayan veya tersine çevrilemeyen kurları reddediyor. API tablosunun bütün para birimlerini içermesi ve TL tabanının 1 olması doğrulanıyor. Kayıtlı eski planlarda eksik isteğe bağlı para birimleri desteklenmeye devam ediyor. Bozuk kayıtlar sessizce silinmiyor veya üzerlerine yazılmıyor. Para biçimlendirmesi hatalı kurla sonsuz tutar üretmek yerine referans kuru kullanıyor.

3. **Yanlış kur güncelliği.** Sabit referans kurlarına sunucunun başlatılma tarihi artık güncelleme tarihi olarak yazılmıyor. Kaynak tarihi yoksa, geçersizse, beş dakikadan fazla gelecekteyse veya yedi günden eskiyse canlı etiketi verilmiyor. Eski geçerli kaydın tarihi korunuyor. Döviz API'si ve mevcut ücretsiz kaynaklar değiştirilmedi; yeni bir veri sağlayıcısı açılmadı.

4. **Fiyat alarmında yanlış başarısızlık ve eski istek sonucu.** Sunucu kaydından sonra tarayıcıya gereksiz ikinci kayıt yazılması kaldırıldı. Depolama izni kapalı olsa da başarılı sunucu kaydı başarılı gösteriliyor; yeni e-posta adresi tarayıcıya ayrıca kopyalanmıyor. Aynı anda çift gönderim engelleniyor. Pencere, şehir, fiyat veya hesap değişiminde önceki istek iptal ediliyor; geç kalan sonuç ve kapatma zamanlayıcısı yeni pencereyi değiştiremiyor. Başarı açıklaması e-posta bildirimlerinin henüz etkin olmadığını belirtiyor. SMTP gönderimi açılmadı.

5. **Pano izni ve tema depolaması.** Konuşma kartı kopyalama düğmesi panonun tamamlanmasını bekliyor. İşlem reddedildiğinde başarılı işareti göstermiyor, seçili dilde hata bildiriyor. Sonraki kopyalamayı veya başka şehri eski işlem sonucu etkilemiyor. Tema tercihi tarayıcı depolamasına yazılamadığında tema düğmesi hata fırlatmıyor.

6. **Birleşen metinlerde kalan dil parçaları.** Günübirlik gezi süreleri, priz/su açıklamaları ve hava durumu kaynak açıklaması birleştirilmeden önce tam metin olarak yerelleştiriliyor. Yerel yedi dil kataloğuna alarm açıklamasının çevirisi eklendi; harici çeviri servisi çalıştırılmadı.

## Kanıtlar ve kapsam

Sonuç: **182/182 test geçti**; hedefli güvenlik taraması, TypeScript ve üretim derlemesi başarılı. `npm audit --include=dev --audit-level=low` sonucu **0 bilinen bağımlılık açığı**. Son derlemenin tarayıcı kontrolünde 0,50 TL / 0,25 TL hesaplaşma ve düzeltilen İngilizce rehber/süre açıklamaları doğrulandı. Ana `http://127.0.0.1:3000` sunucusu HTTP 200 yanıtıyla açık bırakıldı; geçici 3002 sunucusu kapatıldı.

- Başlangıç: `data/remaining-audit-20261024/baseline.log`.
- Son yayın kontrolü: `data/remaining-audit-20261024/release-final.log`.
- Üretim derlemesi: `data/remaining-audit-20261024/production-build.log`; son tarayıcı metni: `data/remaining-audit-20261024/browser-final.txt`.
- Yeni hata senaryoları: `scripts/test-current-audit.cjs` ve kayıt bozulması için `scripts/test-offline.cjs`.
- Tasarım karşılaştırması: `data/remaining-audit-20261024/design-integrity.json`. Değişen dokuz TSX bileşenin bütün `className` değerleri ve genel CSS aynı; e-posta modülü ve bağımlılıklar aynı.
- Görsel kanıt: `rotazur-kurus-kontrolu-20261024.png`.
- Güvenli geri dönüş kopyası: `%LOCALAPPDATA%/Rotazur/backups/remaining-audit-20261024`. Ortam anahtarları ve hesap veritabanı bu kopyaya alınmadı.

Derleme gerçek anahtarları veya hesap veritabanını içermeyen geçici yerel kopyada kontrol edildi. Otel/uçuş regresyonları 100 şehir için mevcut sözleşme, bağlantı ve hesaplamaları sınar; bunlar bütün otellerin bugün yeniden sorgulandığı anlamına gelmez. Mevcut Booking/Aviasales fiyatlarının arama koşulları ve tahmin/kayıt etiketleri korunur. Otel fiyat eşitliği veya yüzde yüz güvenlik garantisi verilmez.
