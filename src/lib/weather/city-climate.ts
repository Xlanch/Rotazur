import { CITIES } from "../cities";
import { expandedClimate } from "../providers/expanded-guides";

export interface ClimateProfile {
  idealMonths: string;
  idealSeason: string;
  summary: string;
  seasonTips: {
    spring: string;
    summer: string;
    autumn: string;
    winter: string;
  };
  packingTips: string;
  bestFor: string;
}

export interface WmoWeatherInfo {
  description: string;
  icon: string; // Emoji
  condition: "clear" | "clouds" | "rain" | "snow" | "thunder";
}

/** WMO Hava Durumu Kodları (Dünya Meteoroloji Örgütü Standartları) */
export const WMO_CODE_MAP: Record<number, WmoWeatherInfo> = {
  0: { description: "Açık ve Güneşli", icon: "☀️", condition: "clear" },
  1: { description: "Çoğunlukla Açık", icon: "🌤️", condition: "clear" },
  2: { description: "Parçalı Bulutlu", icon: "⛅", condition: "clouds" },
  3: { description: "Bulutlu", icon: "☁️", condition: "clouds" },
  45: { description: "Sisli", icon: "🌫️", condition: "clouds" },
  48: { description: "Kırağılı Sis", icon: "🌫️", condition: "clouds" },
  51: { description: "Hafif Çisenti", icon: "🌦️", condition: "rain" },
  53: { description: "Çisenti", icon: "🌦️", condition: "rain" },
  55: { description: "Yoğun Çisenti", icon: "🌧️", condition: "rain" },
  56: { description: "Hafif Dondurucu Çisenti", icon: "🌧️❄️", condition: "snow" },
  57: { description: "Dondurucu Çisenti", icon: "🌧️❄️", condition: "snow" },
  61: { description: "Hafif Yağmurlu", icon: "🌧️", condition: "rain" },
  63: { description: "Yağmurlu", icon: "🌧️", condition: "rain" },
  65: { description: "Kuvvetli Yağmurlu", icon: "🌧️⚡", condition: "rain" },
  66: { description: "Hafif Dondurucu Yağmur", icon: "🌧️❄️", condition: "snow" },
  67: { description: "Kuvvetli Dondurucu Yağmur", icon: "🌧️❄️", condition: "snow" },
  71: { description: "Hafif Kar Yağışlı", icon: "🌨️", condition: "snow" },
  73: { description: "Kar Yağışlı", icon: "❄️", condition: "snow" },
  75: { description: "Yoğun Kar Yağışlı", icon: "❄️☃️", condition: "snow" },
  77: { description: "Kar Taneli", icon: "🌨️", condition: "snow" },
  80: { description: "Hafif Sağanak Yağış", icon: "🌦️", condition: "rain" },
  81: { description: "Sağanak Yağış", icon: "🌧️", condition: "rain" },
  82: { description: "Şiddetli Sağanak", icon: "⛈️", condition: "rain" },
  85: { description: "Hafif Kar Sağanağı", icon: "🌨️", condition: "snow" },
  86: { description: "Yoğun Kar Sağanağı", icon: "❄️🌨️", condition: "snow" },
  95: { description: "Gök Gürültülü Fırtına", icon: "⛈️", condition: "thunder" },
  96: { description: "Dolulu Fırtına", icon: "⛈️🧊", condition: "thunder" },
  99: { description: "Şiddetli Dolulu Fırtına", icon: "⛈️⚡", condition: "thunder" },
};

export function getWeatherInfo(code: number): WmoWeatherInfo {
  return WMO_CODE_MAP[code] || { description: "Değişken Hava", icon: "🌤️", condition: "clouds" };
}

/** 26 Şehrin Detaylı "Ne Zaman Gidilmeli?" İklim ve Gezi Rehberi */
export const CITY_CLIMATE_GUIDES: Record<string, ClimateProfile> = {
  belgrad: {
    idealMonths: "Mayıs - Eylül",
    idealSeason: "İlkbahar & Yaz",
    summary: "Tuna ve Sava nehirleri kenarında açık hava kulüpleri, festivaller ve yemyeşil parklar için en keyifli dönem.",
    seasonTips: {
      spring: "Ağaçların yeşerdiği, Kalemegdan parkında yürüyüş için en ılıman dönem (18-22°C).",
      summer: "Ada Ciganlija gölünde yüzme ve nehir üstü eğlence botları (splavovi) çok hareketli (28-33°C).",
      autumn: "Bohem Skadarlija sokaklarında sıcak kahve ve yerel lezzetler için ideal melankoli.",
      winter: "Soğuk ve karlı geçebilir; müze ve kafe gezileri için bütçe dostu dönem (0-5°C).",
    },
    packingTips: "Gündüz rahat spor ayakkabı, akşamları nehir esintisine karşı hafif rüzgarlık.",
    bestFor: "Tarih, yürüyüş ve nehir kenarı açık hava eğlencesi",
  },
  saraybosna: {
    idealMonths: "Mayıs - Ekim",
    idealSeason: "İlkbahar & Erken Sonbahar",
    summary: "Vadi havası ilkbahar ve sonbaharda çok ferahtır. Başçarşı'da açık hava kahvesi ve dağ manzaraları büyüleyicidir.",
    seasonTips: {
      spring: "Doğanın uyandığı, Miljacka nehri kıyısında yürüyüşün en güzel olduğu zaman.",
      summer: "Saraybosna Film Festivali ile şehir cıvıl cıvıl, akşamları serin dağ esintisi.",
      autumn: "Sarı Tabya'da gün batımında kızıla bürünen vadi manzarası nefes kesici.",
      winter: "Kış sporları ve kayak için Bjelašnica & Jahorina dağları çok popüler.",
    },
    packingTips: "Dağ yamacı yokuşlu sokaklar için sağlam tabanlı ayakkabı ve akşam serinliği için polar.",
    bestFor: "Kültür, gastronomi ve vadi manzaraları",
  },
  kotor: {
    idealMonths: "Mayıs - Ekim",
    idealSeason: "Yaz & Erken Sonbahar",
    summary: "Fiyort koylarında deniz, tekne turları ve San Giovanni kalesi tırmanışı için güneşli aylar en idealidir.",
    seasonTips: {
      spring: "Turist kalabalığı yokken surlar arasında sakin fotoğrafçılık ve ılık hava.",
      summer: "Deniz, Adriyatik koyları ve plaj partileri zirvede (28-34°C).",
      autumn: "Deniz suyu hala ılıktır, sakin ve romantik bir hava hakimdir.",
      winter: "Yağışlı geçebilir ama tarihi taş sokaklar çok huzurludur.",
    },
    packingTips: "Kale basamakları için kaymaz ayakkabı, deniz kıyafeti ve şapka.",
    bestFor: "Fiyort manzarası, tekne turu ve tarihi kale keşfi",
  },
  uskup: {
    idealMonths: "Nisan - Haziran, Eylül - Ekim",
    idealSeason: "İlkbahar & Sonbahar",
    summary: "Yaz aylarındaki bunaltıcı sıcaklar yerine ılık ilkbahar ve sonbahar günleri Taş Köprü ve Ohrid Gölü için harikadır.",
    seasonTips: {
      spring: "Türk Çarşısı'nda gezmek ve Matka Kanyonu'nda kano yapmak için harika hava.",
      summer: "Sıcaklık 35°C'yi bulabilir; öğleden sonraları Ohrid Gölü kıyısı tercih edilmeli.",
      autumn: "Ohrid Gölü kıyısında huzurlu sonbahar tonları ve uygun fiyatlar.",
      winter: "Hafif karlı ve sakin; geleneksel Makedon güveçlerini tatmak için ideal.",
    },
    packingTips: "Kanyon yürüyüşü için rahat ayakkabı ve güneş kremi.",
    bestFor: "Göl kenarı dinlenme, kanyon keşfi ve Osmanlı mirası",
  },
  tiflis: {
    idealMonths: "Mayıs - Haziran, Eylül - Ekim",
    idealSeason: "İlkbahar & Sonbahar",
    summary: "Kafkas dağları esintisiyle rengarenk cumbalı evler ve sülfür banyolarının keyfi ilkbahar ve bağ bozumu sonbaharında çıkar.",
    seasonTips: {
      spring: "Narikala Kalesi'ne teleferikle çıkış ve botanik bahçesi yürüyüşü için kusursuz hava.",
      summer: "Sıcak geçer, akşamları Shardeni caddesinde açık hava canlı müzik çok popülerdir.",
      autumn: "Rtveli (bağ bozumu) festivali ile Gürcü şarapları ve Khinkali şöleni.",
      winter: "Ilık geçen kış aylarında tarihi kükürtlü hamamlarda sıcacık dinlenme.",
    },
    packingTips: "Arnavut kaldırımlı sokaklar için düz tabanlı ayakkabı ve katmanlı giysiler.",
    bestFor: "Gastronomi, mimari fotoğrafçılık ve şarap kültürü",
  },
  baku: {
    idealMonths: "Nisan - Haziran, Eylül - Kasım",
    idealSeason: "İlkbahar & Sonbahar",
    summary: "'Rüzgarlar Şehri' Hazar kıyısında aşırı sıcak veya fırtınalı olmadan rahat gezmek için bahar ayları idealdir.",
    seasonTips: {
      spring: "Haydar Aliyev Merkezi ve Bulvar boyunca deniz kenarı yürüyüşü çok ferahtır.",
      summer: "Hazar Denizi plajları (Bilgah, Mardakan) hareketlidir ama şehir içi sıcaktır.",
      autumn: "Rüzgarın ılık estiği, Alev Kuleleri ışık şovunu izlemek için en keyifli aylar.",
      winter: "Rüzgarlı ve serindir, kış aylarında müze ve İçerişehir kapalı mekanları rahattır.",
    },
    packingTips: "Hazar kıyısının meşhur rüzgarına karşı iyi bir rüzgarlık veya ceket.",
    bestFor: "Fütüristik mimari, Hazar bulvarı ve tarihi İçerişehir",
  },
  budapeste: {
    idealMonths: "Mayıs - Eylül",
    idealSeason: "İlkbahar & Yaz",
    summary: "Tuna Nehri kıyısında Parlamento binası ışıklandırması ve Széchenyi termal havuzları için altın aylar.",
    seasonTips: {
      spring: "Margit Adası'nda piknik ve Buda Kalesi tepesinden panoramik seyir.",
      summer: "Sziget Festivali, nehir turları ve ruin barlarda açık hava eğlencesi.",
      autumn: "Termal hamamlarda serin havaya karşı sıcak suların tadını çıkarma zamanı.",
      winter: "Avrupa'nın en büyüleyici Noel pazarları Vörösmarty meydanında kurulur.",
    },
    packingTips: "Termal havuzlar için mayo/terlik ve nehir kenarı yürüyüşleri için rahat spor ayakkabı.",
    bestFor: "Termal hamamlar, gece nehir turu ve tarihi mimari",
  },
  prag: {
    idealMonths: "Mayıs - Haziran, Eylül - Ekim",
    idealSeason: "İlkbahar & Sonbahar",
    summary: "Karl Köprüsü ve Astronomik Saat kulesini aşırı turist kalabalığı olmadan masalsı bir havada deneyimleyin.",
    seasonTips: {
      spring: "Petrin Tepesi'nde çiçek açan kiraz ağaçları ve nehirde kuğular.",
      summer: "Açık hava bira bahçeleri (Letna Parkı manzaralı) ve gece canlılığı.",
      autumn: "Sisli altın sonbahar tonlarıyla gotik kulelerin en fotojenik hali.",
      winter: "Eski Şehir Meydanı'nda sıcak trdelník tatlısı eşliğinde romantik Noel pazarı.",
    },
    packingTips: "Tarihi taş sokaklar için kesinlikle rahat bir spor ayakkabı.",
    bestFor: "Gotik mimari, romantik yürüyüşler ve yerel lezzetler",
  },
  roma: {
    idealMonths: "Nisan - Haziran, Eylül - Ekim",
    idealSeason: "İlkbahar & Sonbahar",
    summary: "Kolezyum ve Vatikan'ı kavurucu yaz sıcaklarında kuyruk beklemeden gezmek için bahar ayları rakipsizdir.",
    seasonTips: {
      spring: "Trastevere sokaklarında açık havada pizza, gelato ve 22°C civarı güneş.",
      summer: "35°C üzerine çıkabilir; öğle sıcağında müzeler, akşamları serin meydanlar önerilir.",
      autumn: "Ilık Roma güneşi 'Ottobrata Romana' ile açık hava kafeleri çok keyiflidir.",
      winter: "Akdeniz kışı ılımandır (10-15°C), müzelerde kalabalık minimum seviyededir.",
    },
    packingTips: "Günde 15-20 bin adım atılacağı için en rahat yürüyüş ayakkabınız ve güneş gözlüğü.",
    bestFor: "Açık hava müzesi sokaklar, antik tarih ve İtalyan mutfağı",
  },
  barselona: {
    idealMonths: "Mayıs - Ekim",
    idealSeason: "Geç İlkbahar, Yaz & Erken Sonbahar",
    summary: "Gaudi'nin renkli mimarisi ile Akdeniz plajlarının (Barceloneta) birleştiği enerjik Akdeniz cenneti.",
    seasonTips: {
      spring: "Park Güell ve Sagrada Familia'yı terlemeden rahatça gezme zamanı.",
      summer: "Deniz, plaj kulüpleri, çatı bar partileri ve tapas geceleri.",
      autumn: "Deniz suyu eylül ayında hala sıcaktır, turist yoğunluğu azalır.",
      winter: "Güneşli ve ılıman (14-17°C); alışveriş ve kültür turları için ideal.",
    },
    packingTips: "Güneş kremi, plaj giysisi, rahat sandalet ve hırsızlığa karşı çapraz çanta.",
    bestFor: "Mimari, plaj keyfi, tapas ve canlı gece hayatı",
  },
  paris: {
    idealMonths: "Mayıs - Eylül",
    idealSeason: "İlkbahar & Erken Sonbahar",
    summary: "Sen Nehri kıyısında kruvasan, Lüksemburg Bahçesi'nde dinlenme ve Eyfel Kulesi gün batımları.",
    seasonTips: {
      spring: "Bahçelerin rengarenk açtığı ve teras kafelerin dolup taştığı en zarif dönem.",
      summer: "Uzun günler (22:00'ye kadar aydınlık) ve Seine kenarında yaz festivalleri.",
      autumn: "Montmartre tepesinde sarı yapraklar eşliğinde bohem yürüyüşler.",
      winter: "Işıklar şehri unvanının hakkını veren Şanzelize ışıklandırmaları ve müzeler.",
    },
    packingTips: "Şık ama rahat bir yürüyüş ayakkabısı ve ani yağmurlara karşı kompakt şemsiye.",
    bestFor: "Sanat, moda, kafe kültürü ve romantik anlar",
  },
  amsterdam: {
    idealMonths: "Nisan - Eylül",
    idealSeason: "Bahar & Yaz",
    summary: "Kanallar boyunca bisiklet sürmek, lale tarlaları ve Vondelpark'ta dinlenmek için güneşli dönem.",
    seasonTips: {
      spring: "Keukenhof lale bahçelerinin açıldığı ve Kral Günü (27 Nisan) coşkusu.",
      summer: "Kanal turları, açık hava terasları ve gece yarısına kadar aydınlık gökyüzü.",
      autumn: "Kanal kenarlarında dökülen yapraklar ve müze gezileri (Van Gogh, Rijksmuseum).",
      winter: "Amsterdam Işık Festivali kanalları süsler, sıcak çikolata ve kafe keyfi.",
    },
    packingTips: "Rüzgar ve ani yağmur geçirmeyen bir mont ve bisiklet için rahat kıyafetler.",
    bestFor: "Kanal turları, bisiklet kültürü ve sanat müzeleri",
  },
  atina: {
    idealMonths: "Nisan - Haziran, Eylül - Kasım",
    idealSeason: "İlkbahar & Sonbahar",
    summary: "Akropolis tepesine tırmanmak ve Plaka sokaklarında taverna keyfi için yazın kavurucu sıcağını atlatmak şart.",
    seasonTips: {
      spring: "Zeytin ağaçları altında ılıman esintilerle tarihi tapınakları keşfetme vakti.",
      summer: "40°C sıcaklık görülebilir; akşam serinliğinde açık hava sinemaları ve deniz kıyısı.",
      autumn: "Deniz hala sıcaktır, Atina Rivierası ve antik alanlar çok ferahtır.",
      winter: "Ilıman Akdeniz kışı; sıra beklemeden müze gezmek ve bütçe dostu konaklama.",
    },
    packingTips: "Akropolis mermerleri çok kaygan olduğu için kaydırmaz tabanlı ayakkabı ve güneş şapkası.",
    bestFor: "Antik tarih, taverna müzikleri ve Ege lezzetleri",
  },
  viyana: {
    idealMonths: "Mayıs - Eylül & Aralık",
    idealSeason: "Yaz & Noel Sezonu",
    summary: "Saray bahçeleri ve klasik müzik için yaz ayları; masalsı Noel pazarları için ise aralık ayı büyüleyicidir.",
    seasonTips: {
      spring: "Schönbrunn Sarayı gül bahçeleri ve Ring caddesinde bisiklet keyfi.",
      summer: "Tuna Kanalı kıyısında açık hava kafeleri ve Viyana Opera Festivali.",
      autumn: "Tarihi Viyana kafelerinde (Café Central) sıcak Sachertorte ve melange keyfi.",
      winter: "Belediye Meydanı (Rathausplatz) buz pateni pisti ve ünlü Noel pazarları.",
    },
    packingTips: "Şık kıyafetler (özellikle operaya gidecekseniz) ve kışın kalın kaban.",
    bestFor: "Klasik müzik, imparatorluk sarayları ve tarihi kafe kültürü",
  },
  bangkok: {
    idealMonths: "Kasım - Şubat",
    idealSeason: "Kuru ve Serin Sezon",
    summary: "Muson yağmurları ve aşırı nem bittiğinde tapınakları ve sokak lezzetlerini keşfetmek için yılın en mükemmel zamanı.",
    seasonTips: {
      spring: "Yılın en sıcak dönemi; Nisan ayında çılgın su festivali Songkran kutlanır.",
      summer: "Muson dönemi; kısa ama yoğun sağanaklar olur, otel ve uçuş fiyatları çok ucuzdur.",
      autumn: "Kasım ayında Loy Krathong ışık festivali ile nehirler mumlarla aydınlanır.",
      winter: "28-30°C ile nemsiz, pırıl pırıl gökyüzü ve açık hava gece pazarları.",
    },
    packingTips: "İnce pamuklu/keten giysiler, tapınaklar için omuz ve dizleri örten örtü/pantolon.",
    bestFor: "Sokak lezzetleri, görkemli Budist tapınakları ve gece pazarları",
  },
  tokyo: {
    idealMonths: "Mart - Mayıs, Ekim - Kasım",
    idealSeason: "İlkbahar (Sakura) & Sonbahar (Koyo)",
    summary: "İlkbaharda kiraz çiçekleri (Sakura), sonbaharda ise kızıl akçaağaç yaprakları ile görsel bir şölen.",
    seasonTips: {
      spring: "Mart sonu - Nisan başı pembe kiraz çiçekleri altında piknik (Hanami).",
      summer: "Havai fişek festivalleri (Hanabi) ve yaz panayırları; nem ve sıcaklık yüksektir.",
      autumn: "Mükemmel 18-22°C sıcaklık, berrak gökyüzü ve tapınak bahçelerinde kızıl yapraklar.",
      winter: "Açık ve güneşli ama serin; Fuji Dağı manzarasını şehirden görme ihtimali en yüksek dönem.",
    },
    packingTips: "Günde 20 bin adım ve tapınaklarda ayakkabı çıkarma için kolay giyilen rahat spor ayakkabı.",
    bestFor: "Fütüristik teknoloji, tapınaklar, anime ve dünya lideri gastronomi",
  },
  tiran: {
    idealMonths: "Mayıs - Ekim",
    idealSeason: "İlkbahar & Yaz",
    summary: "Renkli binaları, İskender Bey Meydanı ve yakındaki Dajti Dağı teleferiği için güneşli Akdeniz ayları.",
    seasonTips: {
      spring: "Blloku semtinde açık hava kafeleri ve yemyeşil parklar.",
      summer: "Adriyatik sahillerine (Durrës) günübirlik kaçışlar ve açık hava konserleri.",
      autumn: "Ilık ve sakin; Bunk'Art müzelerini keşfetmek için harika bir atmosfer.",
      winter: "Ilıman geçer; bütçeyle dolu dolu bir Balkan kaçamağı.",
    },
    packingTips: "Güneş gözlüğü ve rahat yürüyüş ayakkabısı.",
    bestFor: "Balkan kültürü, renkli meydanlar ve uygun bütçeli tatil",
  },
  batum: {
    idealMonths: "Haziran - Eylül",
    idealSeason: "Yaz",
    summary: "Karadeniz kıyısında palmiyeli bulvar, plajlar, modern mimari ve dev botanik bahçesi için yaz dönemi vazgeçilmezdir.",
    seasonTips: {
      spring: "Batum Botanik Bahçesi'nde subtropikal bitkilerin çiçek açtığı ferah dönem.",
      summer: "Karadeniz'de yüzme, sahil kulüpleri ve Ali ve Nino anıtında gün batımı.",
      autumn: "Sakinleşen sahil şeridi ve Acaristan haçapurisının tadını çıkarma vakti.",
      winter: "Ilıman ve yağışlı; deniz manzaralı modern otellerde ekonomik konaklama.",
    },
    packingTips: "Deniz kıyafeti, terlik ve yağmurluk (bölge subtropikaldir).",
    bestFor: "Sahil bulvarı bisiklet turu, botanik bahçesi ve deniz tatili",
  },
  sarm: {
    idealMonths: "Ekim - Nisan",
    idealSeason: "Sonbahar, Kış & Erken İlkbahar",
    summary: "Kızıldeniz'in mercan resifleri ve dalış dünyası için yazın kavurucu çöl sıcağı yerine ılıman aylar en keyiflisidir.",
    seasonTips: {
      spring: "Deniz suyu 25°C, rüzgar tatlı esiyor; su sporları için mükemmel zaman.",
      summer: "40°C üzerine çıkar; sadece su altı dalış odaklı gidenler için uygundur.",
      autumn: "Denizin en sıcak olduğu dönem; Ras Muhammed milli parkında rengarenk balıklar.",
      winter: "Türkiye'de kar yağarken 24°C güneşli sıcaklıkta denize girme fırsatı.",
    },
    packingTips: "Şnorkel/maske, deniz ayakkabısı (mercanlar için zorunlu) ve yüksek faktörlü güneş kremi.",
    bestFor: "Dünya standartlarında dalış, şnorkel, çöl safarisi ve kış güneşi",
  },
  semerkant: {
    idealMonths: "Nisan - Mayıs, Eylül - Ekim",
    idealSeason: "İlkbahar & Sonbahar",
    summary: "İpek Yolu'nun kalbinde Registan Meydanı'nın turkuaz kubbelerini kavurucu çöl sıcağı olmadan keşfetmek için.",
    seasonTips: {
      spring: "Nevruz kutlamaları ve çiçek açan badem ağaçları eşliğinde 20-24°C ideal hava.",
      summer: "Çöl iklimi nedeniyle 40°C sıcaklıklar görülür; sabah erken saatler gezilmelidir.",
      autumn: "Kavun, nar ve kuru meyve pazarlarının en bereketli olduğu altın sezon.",
      winter: "Soğuk ve zaman zaman karlı; masalsı mavi kubbeler karlar altında çok etkileyicidir.",
    },
    packingTips: "Güneş şapkası, güneş gözlüğü ve tarihi anıtlara saygılı hafif giysiler.",
    bestFor: "Turkuaz çinili camiler, İpek Yolu tarihi ve otantik pazarlar",
  },
  kisinev: {
    idealMonths: "Mayıs - Ekim",
    idealSeason: "İlkbahar & Sonbahar",
    summary: "Avrupa'nın en yeşil başkentlerinden birinde devasa şarap mahzenleri (Mileștii Mici) ve sakin parklar.",
    seasonTips: {
      spring: "Stefan cel Mare parkında çiçekler ve açık hava kafeleri.",
      summer: "Göl kenarlarında piknik ve açık hava şarap tadımları.",
      autumn: "Ekim ayında Ulusal Şarap Günü festivali ile tüm şehir bayram yerine döner.",
      winter: "Kışın yer altı şarap galerileri sabit 12-14°C sıcaklığıyla sıcacık bir gezi sunar.",
    },
    packingTips: "Rahat bir ayakkabı ve yer altı mahzenleri için yanınıza alacağınız bir hırka.",
    bestFor: "Dünyanın en büyük şarap mahzenleri, huzurlu parklar ve ekonomik gezi",
  },
  londra: {
    idealMonths: "Mayıs - Eylül",
    idealSeason: "Yaz & Erken Sonbahar",
    summary: "Hyde Park'ta güneşlenme, Thames nehri yürüyüşleri ve West End müzikalleri için en uzun ve güneşli günler.",
    seasonTips: {
      spring: "Notting Hill'de açan mor salkımlar ve kraliyet parklarında laleler.",
      summer: "Akşam 21:30'a kadar güneşli hava, çatı barları ve açık hava festivalleri.",
      autumn: "Turuncu yapraklarla kaplanan St. James Parkı ve ücretsiz dünya çapı müzeler.",
      winter: "Oxford Street büyüleyici ışıkları ve Hyde Park Winter Wonderland.",
    },
    packingTips: "Her mevsim çıkabilecek yağmura karşı şemsiye/trençkot ve yürüyüş ayakkabısı.",
    bestFor: "Müzeler, West End tiyatroları, tarihi sokaklar ve pub kültürü",
  },
  berlin: {
    idealMonths: "Mayıs - Eylül",
    idealSeason: "Yaz",
    summary: "Spree nehri kenarında plaj barları, açık hava pazarları ve Mauerpark karaoke eğlencesi için yaz ayları eşsizdir.",
    seasonTips: {
      spring: "Tiergarten'da bisiklet turları ve Müzeler Adası'nda açık hava kahveleri.",
      summer: "Göllere (Wannsee) kaçışlar, açık hava sinemaları ve bitmeyen gece hayatı.",
      autumn: "Berlin Işık Festivali (Festival of Lights) ile tarihi binaların ışık şovları.",
      winter: "Gendarmenmarkt Noel pazarı ve zengin sanat galerileri.",
    },
    packingTips: "Rahat sneaker, katmanlı spor giyim ve bisiklet kiralamak için esnek kıyafetler.",
    bestFor: "Modern tarih, sokak sanatı, tekno müzik ve alternatif kültür",
  },
  lizbon: {
    idealMonths: "Nisan - Ekim",
    idealSeason: "İlkbahar, Yaz & Sonbahar",
    summary: "Yılda 300 gün güneş alan şehirde sarı tramvaylar, miradouro seyir tepeleri ve Belém turtaları.",
    seasonTips: {
      spring: "Jakaranfa ağaçlarının mor çiçekleriyle bezenen meydanlar ve ılık okyanus havası.",
      summer: "Haziran ayında Santo António festivali ile sokaklarda ızgara sardalya ve müzik.",
      autumn: "Ilık okyanus esintisi, Sintra masal şatolarını kalabalıksız gezmek için en iyi dönem.",
      winter: "Avrupa'nın en ılıman kışlarından biri (15°C); Fado evlerinde şarap keyfi.",
    },
    packingTips: "Dik ve kaygan beyaz kaldırımlar için kesinlikle tutuşu güçlü spor ayakkabı.",
    bestFor: "Seyir terasları (Miradouros), tramvay yolculuğu, fado ve deniz ürünleri",
  },
  bali: {
    idealMonths: "Nisan - Ekim",
    idealSeason: "Kuru Sezon",
    summary: "Düşük nem oranı, masmavi gökyüzü ve pirinç teraslarında yürüyüş için kuru sezon en kusursuz dönemdir.",
    seasonTips: {
      spring: "Pirinç teraslarının yemyeşil olduğu ve şelalelerin coştuğu nemsiz başlangıç.",
      summer: "Sörf dalgalarının en temiz olduğu, Ubud'da yoga ve plaj kulüpleri dönemi.",
      autumn: "Sakinleşen plajlar, tapınak gün batımları (Tanah Lot, Uluwatu).",
      winter: "Yağmur sezonudur; genellikle öğleden sonra 1-2 saatlik ferahlatıcı tropik sağanaklar olur.",
    },
    packingTips: "Hafif keten giysiler, terlik, tapınaklar için sarong ve sivrisinek koruyucu sprey.",
    bestFor: "Tropikal doğa, tapınaklar, sörf, yoga ve gün batımı plaj kulüpleri",
  },
  dubai: {
    idealMonths: "Kasım - Mart",
    idealSeason: "Kış (Dubai Baharı)",
    summary: "Yazın 45°C'lik çöl sıcağı yerine 24-28°C deniz ve havuz keyfi sunan Dubai'nin altın sezonu.",
    seasonTips: {
      spring: "Mart ayı sonuna kadar hava açık havada gezmek, Miracle Garden ve tema parklar için harika.",
      summer: "Dışarısı çok sıcaktır; devasa klimalı AVM'ler, kapalı kayak pisti ve akvaryumlar tercih edilir.",
      autumn: "Ekim sonundan itibaren deniz suyu ve akşam çöl safarileri çok keyifli hale gelir.",
      winter: "25°C mükemmel sıcaklık; JBR plajı, Burj Khalifa manzarası ve açık hava restoranları.",
    },
    packingTips: "Güneş gözlüğü, mayo, plaj kıyafeti ve AVM'lerin sert klimalarına karşı ince bir şal.",
    bestFor: "Ultra lüks mimari, çöl safarisi, tema parklar ve kış deniz tatili",
  },
};

// Takma adlar ve alternatif ID eşleşmeleri
for (const city of CITIES) if (city.guideSource) CITY_CLIMATE_GUIDES[city.id] = expandedClimate(city);
CITY_CLIMATE_GUIDES["sarm-el-seyh"] = CITY_CLIMATE_GUIDES["sarm"];
CITY_CLIMATE_GUIDES["kotor-budva"] = CITY_CLIMATE_GUIDES["kotor"];
CITY_CLIMATE_GUIDES["uskup-ohrid"] = CITY_CLIMATE_GUIDES["uskup"];

