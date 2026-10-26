export type LanguageCode = "tr" | "en" | "de" | "ru" | "zh" | "es" | "fr" | "ar";

export interface LanguageMeta {
  code: LanguageCode;
  label: string;
  nativeName: string;
  flag: string;
  dir?: "ltr" | "rtl";
}

export const LANGUAGES: LanguageMeta[] = [
  { code: "tr", label: "Türkçe", nativeName: "Türkçe", flag: "🇹🇷" },
  { code: "en", label: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "de", label: "Deutsch", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "ru", label: "Русский", nativeName: "Русский", flag: "🇷🇺" },
  { code: "zh", label: "中文", nativeName: "中文 (简体)", flag: "🇨🇳" },
  { code: "es", label: "Español", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", label: "Français", nativeName: "Français", flag: "🇫🇷" },
  { code: "ar", label: "العربية", nativeName: "العربية", flag: "🇸🇦", dir: "rtl" },
];

export interface Translations {
  // Navigation
  discover: string;
  myRoutes: string;
  signIn: string;
  signOut: string;
  mySavedRoutes: string;
  currencySelector: string;
  tagline: string;

  // Hero
  heroBadge: string;
  heroTitle1: string;
  heroTitle2: string;
  heroSubtitle: string;

  // Search Form
  presetsTitle: string;
  presetRome: string;
  presetTbilisi: string;
  presetBelgrade: string;
  presetBackpacker: string;
  presetParis: string;
  presetKotor: string;
  whereFrom: string;
  whereTo: string;
  anywhere: string;
  departure: string;
  returnDate: string;
  nights: string;
  totalBudget: string;
  perPerson: string;
  travelers: string;
  comfort: string;
  comfortEco: string;
  comfortStd: string;
  comfortLux: string;
  interests: string;
  interestHistory: string;
  interestFood: string;
  interestNature: string;
  interestNightlife: string;
  interestPhoto: string;
  interestMuseum: string;
  interestBeach: string;
  createPlan: string;
  findRoutes: string;
  loadingPlan: string;

  // How It Works & Features
  howItWorks: string;
  howItWorksTitle: string;
  howItWorksDesc: string;
  step1Title: string;
  step1Desc: string;
  step2Title: string;
  step2Desc: string;
  step3Title: string;
  step3Desc: string;

  // Popular routes
  popularRoutes: string;
  popularRoutesDesc: string;
  viewAll: string;
  viewPlan: string;

  // FAQ
  faqBadge: string;
  faqTitle: string;
  faqSubtitle: string;
  faq1Q: string;
  faq1A: string;
  faq2Q: string;
  faq2A: string;
  faq3Q: string;
  faq3A: string;
  faq4Q: string;
  faq4A: string;

  // Plan View
  dailyRoute: string;
  flightHotel: string;
  restaurants: string;
  budgetSummary: string;
  visaGuide: string;
  offlinePack: string;
  downloadPdf: string;
  shareRoute: string;
  saveRoute: string;
  saved: string;
  agencySavings: string;
  agencySavingsDesc: string;
  viewTickets: string;
  bookFlight: string;
  bookHotel: string;
  perNight: string;
  dayLabel: string;

  // Cookie
  cookieText: string;
  cookieAccept: string;
  cookieDecline: string;
}

export const DICTIONARY: Record<LanguageCode, Translations> = {
  tr: {
    discover: "Keşfet",
    myRoutes: "Rotalarım",
    signIn: "Giriş Yap",
    signOut: "Çıkış Yap",
    mySavedRoutes: "Kayıtlı Rotalarım",
    currencySelector: "Para Birimi",
    tagline: "Your Travel Route",

    heroBadge: "Rotazur · Canlı fiyatlar & Yapay zekâ destekli seyahat planlama",
    heroTitle1: "Bütçeni söyle,",
    heroTitle2: "rotanı biz çizelim.",
    heroSubtitle: "En ucuz uçuşlar, bütçene uygun oteller, ucuz mekânlar ve gün gün gezi planı — hepsi tek ekranda, saniyeler içinde.",

    presetsTitle: "Popüler Gezi Konseptleri (1-Tıkla Doldur)",
    presetRome: "Hafta Sonu Roma",
    presetTbilisi: "Pasaportsuz Tiflis",
    presetBelgrade: "Vizesiz Belgrad",
    presetBackpacker: "Ekonomik Sırt Çantalı",
    presetParis: "Romantik Paris",
    presetKotor: "Kotor & Sahil",
    whereFrom: "Nereden",
    whereTo: "Nereye",
    anywhere: "✨ Fark etmez — bütçeme göre öner",
    departure: "Gidiş",
    returnDate: "Dönüş",
    nights: "gece",
    totalBudget: "Toplam bütçe",
    perPerson: "Kişi başı",
    travelers: "Kişi",
    comfort: "Konfor",
    comfortEco: "Tasarruflu",
    comfortStd: "Dengeli",
    comfortLux: "Konforlu",
    interests: "İlgi alanların",
    interestHistory: "Tarih",
    interestFood: "Yemek",
    interestNature: "Doğa",
    interestNightlife: "Gece Hayatı",
    interestPhoto: "Fotoğraf",
    interestMuseum: "Müze",
    interestBeach: "Deniz",
    createPlan: "Planımı oluştur",
    findRoutes: "Bütçeme uygun rotaları bul",
    loadingPlan: "Hazırlanıyor...",

    howItWorks: "Nasıl Çalışır?",
    howItWorksTitle: "3 Adımda Hayalindeki Kusursuz Seyahat",
    howItWorksDesc: "Saatlerce seyahat blogları veya karmaşık Excel tablolarıyla uğraşmaya son. Rotazur tüm süreci saniyeler içinde otomatikleştirir.",
    step1Title: "Bütçeni & Şehrini Seç",
    step1Desc: "Nereden gitmek istediğini, seyahat tarihini ve toplam bütçeni gir. Yapay zekâmız harcama dağılımını dengeler.",
    step2Title: "Canlı Fiyatlar & Akıllı Rota",
    step2Desc: "2026 canlı uçakları, Booking.com ve alternatif otelleri karşılaştır. Gezilecek noktalar gün gün akıllıca gruplansın.",
    step3Title: "Tek Tıkla Rezervasyon & PDF",
    step3Desc: "En uygun kanaldan rezervasyonunu tamamla, profesyonel dergi formatındaki A4 PDF seyahat rehberini cebine indir.",

    popularRoutes: "Popüler rotalar",
    popularRoutesDesc: "2 kişi, 3 gece, dengeli konfor için hazır planlar",
    viewAll: "Tümünü keşfet",
    viewPlan: "Planı gör",

    faqBadge: "Sıkça Sorulan Sorular",
    faqTitle: "Aklınıza Takılan",
    faqSubtitle: "Her Şey",
    faq1Q: "Rotazur hizmeti tamamen ücretsiz mi?",
    faq1A: "Evet, %100 ücretsizdir! Rotazur üzerinde bütçenizi hesaplamak, rota oluşturmak ve A4 PDF rehber indirmek için hiçbir ücret ödemezsiniz.",
    faq2Q: "Otel ve uçak fiyatları ne kadar güncel?",
    faq2A: "Oteller SerpApi Booking arama sonuçlarından, uçuş gösterge fiyatları Aviasales geçmiş aramalarından alınır. Saklanan fiyatların koşulları ve kontrol zamanı belirtilir. Başka tarihler ayrı sorgulanır; kesin fiyat ve müsaitlik satıcıda doğrulanır.",
    faq3Q: "Rezervasyonumu doğrudan Rotazur üzerinden mi yapıyorum?",
    faq3A: "Rotazur sizi resmi sağlayıcıların güvenli (256-bit SSL şifreli) sayfalarına yönlendirir. Kredi kartı bilgileriniz asla sitemizde saklanmaz.",
    faq4Q: "Vizesiz gidebileceğim şehirleri nasıl bulurum?",
    faq4A: "Arama formunda ve 'Keşfet' sayfasında Belgrad, Saraybosna, Tiflis gibi vizesiz destinasyonları tek tıkla listeleyebilirsiniz.",

    dailyRoute: "Günlük Rota",
    flightHotel: "Uçuş & Otel",
    restaurants: "Restoranlar",
    budgetSummary: "Bütçe Özeti",
    visaGuide: "Vize & Giriş",
    offlinePack: "İnternetsiz Paket",
    downloadPdf: "PDF İndir",
    shareRoute: "Paylaş",
    saveRoute: "Kaydet",
    saved: "Kaydedildi",
    agencySavings: "Tur Acentesi Tasarrufu",
    agencySavingsDesc: "Acentelerin yüksek kâr marjları yerine kendi rotanı planlayarak ortalama %31 tasarruf sağlarsın.",
    viewTickets: "Biletleri Gör",
    bookFlight: "Bileti Al",
    bookHotel: "Otele Bak",
    perNight: "gecelik",
    dayLabel: "Gün",

    cookieText: "Rotazur, size en iyi seyahat deneyimini sunmak ve tercihlerinizi hatırlamak için çerezleri kullanır.",
    cookieAccept: "Kabul Et",
    cookieDecline: "Reddet",
  },

  en: {
    discover: "Discover",
    myRoutes: "My Routes",
    signIn: "Sign In",
    signOut: "Sign Out",
    mySavedRoutes: "My Saved Routes",
    currencySelector: "Currency",
    tagline: "Your Travel Route",

    heroBadge: "Rotazur · Live prices & AI-powered smart travel planning",
    heroTitle1: "Name your budget,",
    heroTitle2: "we'll map your route.",
    heroSubtitle: "Cheapest flights, handpicked hotels, hidden gems, and smart day-by-day itineraries — all on one screen in seconds.",

    presetsTitle: "Popular Travel Concepts (1-Click Fill)",
    presetRome: "Weekend in Rome",
    presetTbilisi: "Passport-free Tbilisi",
    presetBelgrade: "Visa-free Belgrade",
    presetBackpacker: "Budget Backpacker",
    presetParis: "Romantic Paris",
    presetKotor: "Kotor & Beach",
    whereFrom: "Origin",
    whereTo: "Destination",
    anywhere: "✨ Anywhere — recommend by budget",
    departure: "Departure",
    returnDate: "Return",
    nights: "nights",
    totalBudget: "Total budget",
    perPerson: "Per person",
    travelers: "Travelers",
    comfort: "Comfort",
    comfortEco: "Economy",
    comfortStd: "Balanced",
    comfortLux: "Luxury",
    interests: "Interests",
    interestHistory: "History",
    interestFood: "Food",
    interestNature: "Nature",
    interestNightlife: "Nightlife",
    interestPhoto: "Photo",
    interestMuseum: "Museum",
    interestBeach: "Beach",
    createPlan: "Generate My Route",
    findRoutes: "Find routes for my budget",
    loadingPlan: "Preparing...",

    howItWorks: "How It Works",
    howItWorksTitle: "Your Dream Trip in 3 Simple Steps",
    howItWorksDesc: "No more spending hours reading travel blogs or managing spreadsheets. Rotazur automates everything in seconds.",
    step1Title: "Pick Budget & City",
    step1Desc: "Select departure, dates, and total budget. Our AI smartly balances spending across flights, hotels, and food.",
    step2Title: "Live Prices & Smart Itinerary",
    step2Desc: "Compare 2026 live flights and Booking.com hotels. Daily attractions are geographically clustered to minimize travel time.",
    step3Title: "1-Click Booking & PDF",
    step3Desc: "Book via verified official providers and download a magazine-grade A4 PDF travel guide straight to your phone.",

    popularRoutes: "Popular Destinations",
    popularRoutesDesc: "Curated plans for 2 people, 3 nights, balanced comfort",
    viewAll: "Explore All",
    viewPlan: "View Plan",

    faqBadge: "Frequently Asked Questions",
    faqTitle: "Everything You",
    faqSubtitle: "Need to Know",
    faq1Q: "Is Rotazur completely free?",
    faq1A: "Yes, 100% free! Creating custom itineraries, checking live prices, and downloading A4 PDF travel guides costs nothing.",
    faq2Q: "How accurate are the flight and hotel prices?",
    faq2A: "Hotels use SerpApi Booking search results; indicative flights use past Aviasales searches. Stored prices show their search conditions and check time. Other dates require a separate query. Confirm final prices and availability with the seller.",
    faq3Q: "Do I book directly on Rotazur?",
    faq3A: "Rotazur directs you to official provider websites with secure 256-bit SSL encryption. We never store your credit card info.",
    faq4Q: "How can I filter visa-free destinations?",
    faq4A: "Use the 'Anywhere' option or visit our Discover page to view visa-free cities with a single click.",

    dailyRoute: "Daily Itinerary",
    flightHotel: "Flight & Hotel",
    restaurants: "Restaurants",
    budgetSummary: "Budget Summary",
    visaGuide: "Visa & Entry",
    offlinePack: "Offline Pack",
    downloadPdf: "Download PDF",
    shareRoute: "Share",
    saveRoute: "Save",
    saved: "Saved",
    agencySavings: "Agency Savings",
    agencySavingsDesc: "Save an average of ~31% by planning directly instead of paying heavy travel agency markups.",
    viewTickets: "View Tickets",
    bookFlight: "Book Flight",
    bookHotel: "Book Hotel",
    perNight: "/ night",
    dayLabel: "Day",

    cookieText: "Rotazur uses cookies to provide the best travel experience and remember your preferences.",
    cookieAccept: "Accept",
    cookieDecline: "Decline",
  },

  de: {
    discover: "Entdecken",
    myRoutes: "Meine Routen",
    signIn: "Anmelden",
    signOut: "Abmelden",
    mySavedRoutes: "Gespeicherte Routen",
    currencySelector: "Währung",
    tagline: "Your Travel Route",

    heroBadge: "Rotazur · Live-Preise & KI-gestützte Reiseplanung",
    heroTitle1: "Nenne dein Budget,",
    heroTitle2: "wir planen deine Route.",
    heroSubtitle: "Günstigste Flüge, handverlesene Hotels, Geheimtipps und tagesgenaue Pläne — alles auf einem Bildschirm in Sekunden.",

    presetsTitle: "Beliebte Reisekonzepte (1-Klick)",
    presetRome: "Wochenende in Rom",
    presetTbilisi: "Passfreies Tiflis",
    presetBelgrade: "Visafreies Belgrad",
    presetBackpacker: "Günstiger Backpacker",
    presetParis: "Romantisches Paris",
    presetKotor: "Kotor & Küste",
    whereFrom: "Abflugort",
    whereTo: "Zielort",
    anywhere: "✨ Egal — nach Budget vorschlagen",
    departure: "Hinflug",
    returnDate: "Rückflug",
    nights: "Nächte",
    totalBudget: "Gesamtbudget",
    perPerson: "Pro Person",
    travelers: "Reisende",
    comfort: "Komfort",
    comfortEco: "Sparsam",
    comfortStd: "Ausgewogen",
    comfortLux: "Luxus",
    interests: "Interessen",
    interestHistory: "Geschichte",
    interestFood: "Kulinarik",
    interestNature: "Natur",
    interestNightlife: "Nachtleben",
    interestPhoto: "Foto",
    interestMuseum: "Museum",
    interestBeach: "Strand",
    createPlan: "Meinen Plan erstellen",
    findRoutes: "Routen für mein Budget finden",
    loadingPlan: "Wird vorbereitet...",

    howItWorks: "So funktioniert's",
    howItWorksTitle: "Deine Traumreise in 3 einfachen Schritten",
    howItWorksDesc: "Keine stundenlangen Blogs oder Tabellen mehr. Rotazur automatisiert den gesamten Prozess in Sekunden.",
    step1Title: "Budget & Stadt wählen",
    step1Desc: "Gib Abflugort, Reisedaten und Gesamtbudget ein. Unsere KI verteilt das Budget optimal.",
    step2Title: "Live-Preise & Smarte Route",
    step2Desc: "Vergleiche 2026 Live-Flüge und Booking.com-Hotels. Sehenswürdigkeiten werden nach Lage gruppiert.",
    step3Title: "1-Klick Buchung & PDF",
    step3Desc: "Buche über offizielle Anbieter und lade den hochwertigen A4 PDF-Reiseführer direkt herunter.",

    popularRoutes: "Beliebte Routen",
    popularRoutesDesc: "Pläne für 2 Personen, 3 Nächte, ausgewogener Komfort",
    viewAll: "Alle entdecken",
    viewPlan: "Plan ansehen",

    faqBadge: "Häufig gestellte Fragen",
    faqTitle: "Alles, was Sie",
    faqSubtitle: "wissen müssen",
    faq1Q: "Ist Rotazur komplett kostenlos?",
    faq1A: "Ja, zu 100% kostenlos! Die Reiseplanung, Preisvergleiche und der PDF-Download sind völlig gebührenfrei.",
    faq2Q: "Wie aktuell sind die Preise?",
    faq2A: "Hotels stammen aus SerpApi-Booking-Suchergebnissen, Flugrichtpreise aus früheren Aviasales-Suchen. Bedingungen und Prüfzeit werden angezeigt. Andere Daten benötigen eine neue Suche. Endpreis und Verfügbarkeit beim Anbieter prüfen.",
    faq3Q: "Buche ich direkt über Rotazur?",
    faq3A: "Rotazur leitet Sie direkt zu offiziellen Anbietern mit 256-Bit SSL-Verschlüsselung weiter.",
    faq4Q: "Wie finde ich visafreie Ziele?",
    faq4A: "Wählen Sie 'Egal' im Suchformular, um visafreie Städte sofort nach Budget gefiltert zu sehen.",

    dailyRoute: "Tagesplan",
    flightHotel: "Flug & Hotel",
    restaurants: "Restaurants",
    budgetSummary: "Budgetübersicht",
    visaGuide: "Visum & Einreise",
    offlinePack: "Offline-Paket",
    downloadPdf: "PDF herunterladen",
    shareRoute: "Teilen",
    saveRoute: "Speichern",
    saved: "Gespeichert",
    agencySavings: "Agentur-Ersparnis",
    agencySavingsDesc: "Sparen Sie durchschnittlich ~31%, indem Sie direkt buchen statt Agenturaufschläge zu zahlen.",
    viewTickets: "Tickets ansehen",
    bookFlight: "Flug buchen",
    bookHotel: "Hotel ansehen",
    perNight: "/ Nacht",
    dayLabel: "Tag",

    cookieText: "Rotazur verwendet Cookies, um Ihnen das beste Reiseerlebnis zu bieten.",
    cookieAccept: "Akzeptieren",
    cookieDecline: "Ablehnen",
  },

  ru: {
    discover: "Исследовать",
    myRoutes: "Мои маршруты",
    signIn: "Войти",
    signOut: "Выйти",
    mySavedRoutes: "Сохраненные маршруты",
    currencySelector: "Валюта",
    tagline: "Your Travel Route",

    heroBadge: "Rotazur · Актуальные цены и умное ИИ-планирование путешествий",
    heroTitle1: "Назовите ваш бюджет,",
    heroTitle2: "мы построим маршрут.",
    heroSubtitle: "Самые дешевые авиабилеты, проверенные отели, секретные места и план по дням — все на одном экране за секунды.",

    presetsTitle: "Популярные идеи для поездки (в 1 клик)",
    presetRome: "Выходные в Риме",
    presetTbilisi: "Тбилиси без загранпаспорта",
    presetBelgrade: "Безвизовый Белград",
    presetBackpacker: "Эконом-бэкпекинг",
    presetParis: "Романтичный Париж",
    presetKotor: "Котор и побережье",
    whereFrom: "Откуда",
    whereTo: "Куда",
    anywhere: "✨ Куда угодно — по бюджету",
    departure: "Туда",
    returnDate: "Обратно",
    nights: "ночей",
    totalBudget: "Общий бюджет",
    perPerson: "На человека",
    travelers: "Человек",
    comfort: "Комфорт",
    comfortEco: "Эконом",
    comfortStd: "Баланс",
    comfortLux: "Люкс",
    interests: "Интересы",
    interestHistory: "История",
    interestFood: "Еда",
    interestNature: "Природа",
    interestNightlife: "Ночная жизнь",
    interestPhoto: "Фото",
    interestMuseum: "Музеи",
    interestBeach: "Море",
    createPlan: "Создать маршрут",
    findRoutes: "Найти маршруты под бюджет",
    loadingPlan: "Подготовка...",

    howItWorks: "Как это работает",
    howItWorksTitle: "Путешествие мечты в 3 простых шага",
    howItWorksDesc: "Забудьте о часах чтения блогов и таблицах Excel. Rotazur сделает все за секунды.",
    step1Title: "Выберите бюджет и город",
    step1Desc: "Укажите город вылета, даты и бюджет. Наш ИИ сбалансирует расходы на перелет, жилье и еду.",
    step2Title: "Живые цены и умный маршрут",
    step2Desc: "Сравните актуальные рейсы 2026 года и отели Booking.com. Достопримечательности сгруппированы по районам.",
    step3Title: "Бронирование в 1 клик и PDF",
    step3Desc: "Забронируйте по лучшим ценам и скачайте красивый PDF-путеводитель формата А4 прямо на телефон.",

    popularRoutes: "Популярные направления",
    popularRoutesDesc: "Готовые планы на 2 человек, 3 ночи, оптимальный комфорт",
    viewAll: "Смотреть все",
    viewPlan: "Посмотреть план",

    faqBadge: "Часто задаваемые вопросы",
    faqTitle: "Все, что нужно",
    faqSubtitle: "знать о Rotazur",
    faq1Q: "Сервис Rotazur полностью бесплатный?",
    faq1A: "Да, абсолютно бесплатный! Составление планов, актуальные цены и скачивание PDF-гайдов не стоят ни копейки.",
    faq2Q: "Насколько точны цены на отели и билеты?",
    faq2A: "Отели получены из результатов SerpApi Booking, ориентировочные авиабилеты — из прошлых поисков Aviasales. Указаны условия и время проверки. Для других дат нужен новый поиск. Итоговую цену и наличие проверяйте у продавца.",
    faq3Q: "Оплата происходит на Rotazur?",
    faq3A: "Rotazur перенаправляет вас на официальные сайты партнеров с 256-битным SSL-шифрованием.",
    faq4Q: "Как найти безвизовые страны?",
    faq4A: "Выберите опцию 'Куда угодно' или перейдите в раздел 'Исследовать', чтобы увидеть безвизовые города.",

    dailyRoute: "Маршрут по дням",
    flightHotel: "Перелет и отель",
    restaurants: "Рестораны",
    budgetSummary: "Сводка бюджета",
    visaGuide: "Виза и въезд",
    offlinePack: "Офлайн-пакет",
    downloadPdf: "Скачать PDF",
    shareRoute: "Поделиться",
    saveRoute: "Сохранить",
    saved: "Сохранено",
    agencySavings: "Экономия турфирм",
    agencySavingsDesc: "Экономьте в среднем ~31%, планируя поездку напрямую без наценок агентств.",
    viewTickets: "Купить билеты",
    bookFlight: "Купить билет",
    bookHotel: "Выбрать отель",
    perNight: "/ ночь",
    dayLabel: "День",

    cookieText: "Rotazur использует файлы cookie для наилучшего качества работы сервиса.",
    cookieAccept: "Принять",
    cookieDecline: "Отклонить",
  },

  zh: {
    discover: "探索",
    myRoutes: "我的行程",
    signIn: "登录",
    signOut: "退出登录",
    mySavedRoutes: "已保存行程",
    currencySelector: "货币",
    tagline: "Your Travel Route",

    heroBadge: "Rotazur · 实时价格与AI智能旅行规划平台",
    heroTitle1: "输入您的预算，",
    heroTitle2: "我们来定制完美路线。",
    heroSubtitle: "超值航班、严选酒店、地道小吃与按天规划的智能行程 — 数秒内一览无余。",

    presetsTitle: "热门旅行灵感（一键填入）",
    presetRome: "罗马周末游",
    presetTbilisi: "免护照第比利斯",
    presetBelgrade: "免签贝尔格莱德",
    presetBackpacker: "高性价比背包客",
    presetParis: "浪漫巴黎",
    presetKotor: "科托尔海滨",
    whereFrom: "出发地",
    whereTo: "目的地",
    anywhere: "✨ 探索任意地点 — 根据预算推荐",
    departure: "去程日期",
    returnDate: "返程日期",
    nights: "晚",
    totalBudget: "总预算",
    perPerson: "人均",
    travelers: "人数",
    comfort: "舒适度",
    comfortEco: "经济型",
    comfortStd: "舒适平衡",
    comfortLux: "尊享奢华",
    interests: "兴趣偏好",
    interestHistory: "历史文化",
    interestFood: "美食品鉴",
    interestNature: "自然风光",
    interestNightlife: "夜生活",
    interestPhoto: "拍照打卡",
    interestMuseum: "博物馆",
    interestBeach: "海滨沙滩",
    createPlan: "生成我的行程",
    findRoutes: "按预算查找路线",
    loadingPlan: "正在为您规划...",

    howItWorks: "使用流程",
    howItWorksTitle: "只需3步，开启梦幻之旅",
    howItWorksDesc: "告别繁琐的攻略搜索和Excel表格。Rotazur在几秒内为您自动化安排一切。",
    step1Title: "选择预算与城市",
    step1Desc: "输入出发地、日期和预算，AI智能平衡机票、酒店和餐饮消费。",
    step2Title: "实时价格与智能路线",
    step2Desc: "对比2026实时机票与Booking.com酒店，按地理位置聚合景点以缩减步行时间。",
    step3Title: "一键预订与PDF导出",
    step3Desc: "直连官方保障平台预订，并将高清杂志级A4 PDF旅行手册下载到手机中。",

    popularRoutes: "热门目的地",
    popularRoutesDesc: "2人3晚舒适平衡精选方案",
    viewAll: "探索全部",
    viewPlan: "查看行程",

    faqBadge: "常见问题解答",
    faqTitle: "关于Rotazur的",
    faqSubtitle: "所有疑问解答",
    faq1Q: "Rotazur完全免费吗？",
    faq1A: "是的，100%完全免费！行程规划、实时比价以及下载A4 PDF旅行手册均不收取任何费用。",
    faq2Q: "机票与酒店价格准确吗？",
    faq2A: "酒店来自 SerpApi Booking 搜索结果，机票参考价来自 Aviasales 历史搜索。保存的价格会注明搜索条件和检查时间。其他日期需重新查询，最终价格和余量请向卖方确认。",
    faq3Q: "是在Rotazur直接付款吗？",
    faq3A: "我们会将您安全跳转至各大官方平台（具备256位SSL加密），我们绝不保存您的银行卡信息。",
    faq4Q: "如何查找免签目的地？",
    faq4A: "在搜索中选择'探索任意地点'或访问'探索'页面，即可一键筛选免签与落地签城市。",

    dailyRoute: "每日行程",
    flightHotel: "机票与酒店",
    restaurants: "精选美食",
    budgetSummary: "预算明细",
    visaGuide: "签证与入境",
    offlinePack: "离线旅行包",
    downloadPdf: "下载PDF手册",
    shareRoute: "分享行程",
    saveRoute: "收藏行程",
    saved: "已收藏",
    agencySavings: "相比旅行社节省",
    agencySavingsDesc: "自主定制省去传统旅行社的高额中介费用，平均可节省约31%开销。",
    viewTickets: "查看门票",
    bookFlight: "预订航班",
    bookHotel: "预订酒店",
    perNight: "/ 晚",
    dayLabel: "第",

    cookieText: "Rotazur使用Cookie以提供更佳的旅行体验并保存您的个性化偏好。",
    cookieAccept: "接受",
    cookieDecline: "拒绝",
  },

  es: {
    discover: "Descubrir",
    myRoutes: "Mis Rutas",
    signIn: "Iniciar Sesión",
    signOut: "Cerrar Sesión",
    mySavedRoutes: "Mis Rutas Guardadas",
    currencySelector: "Moneda",
    tagline: "Your Travel Route",

    heroBadge: "Rotazur · Precios en vivo y planificación inteligente con IA",
    heroTitle1: "Dinos tu presupuesto,",
    heroTitle2: "nosotros trazamos tu ruta.",
    heroSubtitle: "Vuelos más baratos, hoteles seleccionados, rincones secretos y planes día a día — todo en una pantalla en segundos.",

    presetsTitle: "Conceptos de viaje populares (1 clic)",
    presetRome: "Fin de semana en Roma",
    presetTbilisi: "Tiflis sin pasaporte",
    presetBelgrade: "Belgrado sin visado",
    presetBackpacker: "Mochilero económico",
    presetParis: "París romántico",
    presetKotor: "Kotor y playa",
    whereFrom: "Origen",
    whereTo: "Destino",
    anywhere: "✨ Cualquier lugar — sugerir por presupuesto",
    departure: "Ida",
    returnDate: "Vuelta",
    nights: "noches",
    totalBudget: "Presupuesto total",
    perPerson: "Por persona",
    travelers: "Viajeros",
    comfort: "Confort",
    comfortEco: "Económico",
    comfortStd: "Equilibrado",
    comfortLux: "Lujo",
    interests: "Intereses",
    interestHistory: "Historia",
    interestFood: "Gastronomía",
    interestNature: "Naturaleza",
    interestNightlife: "Vida nocturna",
    interestPhoto: "Fotografía",
    interestMuseum: "Museos",
    interestBeach: "Playa",
    createPlan: "Crear mi plan",
    findRoutes: "Buscar rutas según mi presupuesto",
    loadingPlan: "Preparando...",

    howItWorks: "Cómo Funciona",
    howItWorksTitle: "El viaje de tus sueños en 3 sencillos pasos",
    howItWorksDesc: "Olvídate de pasar horas en blogs o tablas de Excel. Rotazur lo automatiza todo en segundos.",
    step1Title: "Elige presupuesto y ciudad",
    step1Desc: "Indica origen, fechas y presupuesto total. Nuestra IA equilibra vuelos, hoteles y comidas.",
    step2Title: "Precios en vivo y ruta inteligente",
    step2Desc: "Compara vuelos en tiempo real y hoteles de Booking.com. Las visitas se agrupan por cercanía.",
    step3Title: "Reserva en 1 clic y PDF",
    step3Desc: "Reserva en canales oficiales y descarga la guía de viaje en PDF A4 directamente en tu móvil.",

    popularRoutes: "Rutas populares",
    popularRoutesDesc: "Planes listos para 2 personas, 3 noches, confort equilibrado",
    viewAll: "Explorar todo",
    viewPlan: "Ver plan",

    faqBadge: "Preguntas Frecuentes",
    faqTitle: "Todo lo que",
    faqSubtitle: "necesitas saber",
    faq1Q: "¿Rotazur es completamente gratis?",
    faq1A: "¡Sí, 100% gratis! Calcular presupuestos, crear rutas y descargar guías en PDF no tiene coste alguno.",
    faq2Q: "¿Qué tan actualizados están los precios?",
    faq2A: "Los hoteles proceden de búsquedas SerpApi Booking y los vuelos orientativos de búsquedas anteriores de Aviasales. Se indican condiciones y hora de consulta. Otras fechas requieren otra búsqueda; confirma precio final y disponibilidad con el vendedor.",
    faq3Q: "¿La reserva se hace en Rotazur?",
    faq3A: "Rotazur te redirige a las plataformas oficiales con cifrado SSL de 256 bits.",
    faq4Q: "¿Cómo encontrar destinos sin visado?",
    faq4A: "Elige 'Cualquier lugar' en el buscador o visita 'Descubrir' para filtrar destinos sin visado en 1 clic.",

    dailyRoute: "Itinerario diario",
    flightHotel: "Vuelo y hotel",
    restaurants: "Restaurantes",
    budgetSummary: "Resumen de presupuesto",
    visaGuide: "Visado y entrada",
    offlinePack: "Paquete sin conexión",
    downloadPdf: "Descargar PDF",
    shareRoute: "Compartir",
    saveRoute: "Guardar",
    saved: "Guardado",
    agencySavings: "Ahorro frente a agencias",
    agencySavingsDesc: "Ahorra un promedio de ~31% planificando directamente sin las altas comisiones de agencia.",
    viewTickets: "Ver entradas",
    bookFlight: "Reservar vuelo",
    bookHotel: "Ver hotel",
    perNight: "/ noche",
    dayLabel: "Día",

    cookieText: "Rotazur utiliza cookies para ofrecerte la mejor experiencia de viaje y recordar tus preferencias.",
    cookieAccept: "Aceptar",
    cookieDecline: "Rechazar",
  },

  fr: {
    discover: "Découvrir",
    myRoutes: "Mes Itinéraires",
    signIn: "Connexion",
    signOut: "Déconnexion",
    mySavedRoutes: "Itinéraires enregistrés",
    currencySelector: "Devise",
    tagline: "Your Travel Route",

    heroBadge: "Rotazur · Prix en direct & Planification de voyage par IA",
    heroTitle1: "Indiquez votre budget,",
    heroTitle2: "nous traçons votre route.",
    heroSubtitle: "Vols les moins chers, hôtels sélectionnés, pépites cachées et programme jour par jour — le tout en quelques secondes.",

    presetsTitle: "Concepts de voyage populaires (1 clic)",
    presetRome: "Week-end à Rome",
    presetTbilisi: "Tbilissi sans passeport",
    presetBelgrade: "Belgrade sans visa",
    presetBackpacker: "Routard économique",
    presetParis: "Paris romantique",
    presetKotor: "Kotor & Plage",
    whereFrom: "Départ",
    whereTo: "Destination",
    anywhere: "✨ Peu importe — suggérer selon budget",
    departure: "Aller",
    returnDate: "Retour",
    nights: "nuits",
    totalBudget: "Budget total",
    perPerson: "Par personne",
    travelers: "Voyageurs",
    comfort: "Confort",
    comfortEco: "Économique",
    comfortStd: "Équilibré",
    comfortLux: "Luxe",
    interests: "Centres d'intérêt",
    interestHistory: "Histoire",
    interestFood: "Gastronomie",
    interestNature: "Nature",
    interestNightlife: "Vie nocturne",
    interestPhoto: "Photo",
    interestMuseum: "Musées",
    interestBeach: "Plage",
    createPlan: "Créer mon plan",
    findRoutes: "Trouver selon mon budget",
    loadingPlan: "Préparation...",

    howItWorks: "Comment ça marche",
    howItWorksTitle: "Votre voyage de rêve en 3 étapes simples",
    howItWorksDesc: "Finies les heures passées sur des blogs ou des tableurs. Rotazur automatise tout en quelques secondes.",
    step1Title: "Choisissez budget et ville",
    step1Desc: "Entrez votre ville de départ, vos dates et votre budget. L'IA équilibre l'ensemble de vos dépenses.",
    step2Title: "Prix en direct et itinéraire malin",
    step2Desc: "Comparez les vols en direct et les hôtels Booking.com. Les visites sont regroupées par quartier.",
    step3Title: "Réservation en 1 clic et PDF",
    step3Desc: "Réservez via les plateformes officielles et téléchargez votre guide de voyage PDF A4 directement.",

    popularRoutes: "Itinéraires populaires",
    popularRoutesDesc: "Plans prêts pour 2 personnes, 3 nuits, confort équilibré",
    viewAll: "Tout explorer",
    viewPlan: "Voir le plan",

    faqBadge: "Questions Fréquentes",
    faqTitle: "Tout ce que vous",
    faqSubtitle: "devez savoir",
    faq1Q: "Rotazur est-il entièrement gratuit ?",
    faq1A: "Oui, 100% gratuit ! La création de plans, la comparaison des prix et le téléchargement du PDF sont gratuits.",
    faq2Q: "Les prix sont-ils à jour ?",
    faq2A: "Les hôtels proviennent de SerpApi Booking et les vols indicatifs de recherches Aviasales antérieures. Les conditions et la date de vérification sont indiquées. De nouvelles dates nécessitent une autre recherche. Confirmez le prix final et la disponibilité auprès du vendeur.",
    faq3Q: "La réservation s'effectue-t-elle sur Rotazur ?",
    faq3A: "Rotazur vous redirige directement vers les sites partenaires officiels hautement sécurisés (SSL 256 bits).",
    faq4Q: "Comment filtrer les destinations sans visa ?",
    faq4A: "Choisissez 'Peu importe' dans la recherche ou rendez-vous sur la page 'Découvrir' pour un accès direct.",

    dailyRoute: "Itinéraire du jour",
    flightHotel: "Vol & Hôtel",
    restaurants: "Restaurants",
    budgetSummary: "Récapitulatif du budget",
    visaGuide: "Visa & Formalités",
    offlinePack: "Pack hors-ligne",
    downloadPdf: "Télécharger PDF",
    shareRoute: "Partager",
    saveRoute: "Enregistrer",
    saved: "Enregistré",
    agencySavings: "Économies d'agence",
    agencySavingsDesc: "Économisez en moyenne ~31% en planifiant directement sans les marges des agences de voyage.",
    viewTickets: "Voir les billets",
    bookFlight: "Réserver le vol",
    bookHotel: "Voir l'hôtel",
    perNight: "/ nuit",
    dayLabel: "Jour",

    cookieText: "Rotazur utilise des cookies pour vous offrir la meilleure expérience de voyage.",
    cookieAccept: "Accepter",
    cookieDecline: "Refuser",
  },

  ar: {
    discover: "استكشف",
    myRoutes: "رحلاتي",
    signIn: "تسجيل الدخول",
    signOut: "تسجيل الخروج",
    mySavedRoutes: "رحلاتي المحفوظة",
    currencySelector: "العملة",
    tagline: "Your Travel Route",

    heroBadge: "روتازور · أسعار مباشرة وتخطيط سفر بالذكاء الاصطناعي",
    heroTitle1: "حدد ميزانيتك،",
    heroTitle2: "وسنرسم لك خطتك.",
    heroSubtitle: "أرخص الرحلات الجوية، أفضل الفنادق المختارة، الأماكن المميزة وخطة ذكية يومية — كل ذلك في شاشة واحدة بثوانٍ.",

    presetsTitle: "أفكار سفر مميزة (بنقرة واحدة)",
    presetRome: "عطلة في روما",
    presetTbilisi: "تبليسي بالبطاقة",
    presetBelgrade: "بلغراد بدون تأشيرة",
    presetBackpacker: "حقيبة ظهر اقتصادية",
    presetParis: "باريس الرومانسية",
    presetKotor: "كوتور والساحل",
    whereFrom: "من أين",
    whereTo: "إلى أين",
    anywhere: "✨ أي مكان — اقترح حسب الميزانية",
    departure: "المغادرة",
    returnDate: "العودة",
    nights: "ليالٍ",
    totalBudget: "الميزانية الإجمالية",
    perPerson: "للشخص",
    travelers: "المسافرون",
    comfort: "الراحة",
    comfortEco: "اقتصادي",
    comfortStd: "متوازن",
    comfortLux: "فاخر",
    interests: "الاهتمامات",
    interestHistory: "تاريخ",
    interestFood: "طعام",
    interestNature: "طبيعة",
    interestNightlife: "سهر",
    interestPhoto: "تصوير",
    interestMuseum: "متاحف",
    interestBeach: "شاطئ",
    createPlan: "أنشئ خطتي",
    findRoutes: "ابحث عن وجهات بميزانيتي",
    loadingPlan: "جارٍ التحضير...",

    howItWorks: "كيف يعمل؟",
    howItWorksTitle: "رحلة أحلامك في 3 خطوات بسيطة",
    howItWorksDesc: "وداعاً للبحث الطويل في المدونات وجداول البيانات. روتازور يتولى كل شيء خلال ثوانٍ.",
    step1Title: "اختر الميزانية والمدينة",
    step1Desc: "حدد مدينة الإقلاع والتواريخ والميزانية، والذكاء الاصطناعي يوزع النفقات بذكاء.",
    step2Title: "أسعار مباشرة وخطة ذكية",
    step2Desc: "قارن أسعار رحلات 2026 وفنادق Booking.com مع تجميع ذكي للأماكن القريبة يومياً.",
    step3Title: "حجز بنقرة واحدة وPDF",
    step3Desc: "احجز عبر المزودين المعتمدين ونزل دليلك السياحي بصيغة PDF A4 المطبوع على هاتفك.",

    popularRoutes: "وجهات شهيرة",
    popularRoutesDesc: "خطط جاهزة لشخصين، 3 ليالٍ، مستوى راحة متوازن",
    viewAll: "استكشف الكل",
    viewPlan: "عرض الخطة",

    faqBadge: "الأسئلة الشائعة",
    faqTitle: "كل ما تحتاج",
    faqSubtitle: "إلى معرفته",
    faq1Q: "هل خدمة روتازور مجانية بالكامل؟",
    faq1A: "نعم، مجانية 100%! لن تدفع أي رسوم لحساب ميزانيتك، إنشاء مسار رحلتك أو تنزيل دليل PDF.",
    faq2Q: "ما مدى دقة أسعار الطيران والفنادق؟",
    faq2A: "الفنادق من نتائج بحث SerpApi Booking، وأسعار الطيران إرشادية من عمليات بحث Aviasales السابقة. تظهر الشروط ووقت التحقق، وتتطلب التواريخ الأخرى بحثاً جديداً. تحقق من السعر النهائي والتوافر لدى البائع.",
    faq3Q: "هل يتم الحجز والدفع على روتازور؟",
    faq3A: "نوجهك مباشرة إلى مواقع المزودين الرسمية المعتمدة والمشفرة بتقنية 256-bit SSL.",
    faq4Q: "كيف يمكنني العثور على وجهات بدون تأشيرة؟",
    faq4A: "اختر 'أي مكان' في شريط البحث أو صفحة 'استكشف' لتصفية المدن بدون تأشيرة بنقرة واحدة.",

    dailyRoute: "الخطة اليومية",
    flightHotel: "الطيران والفندق",
    restaurants: "المطاعم",
    budgetSummary: "ملخص الميزانية",
    visaGuide: "التأشيرة والدخول",
    offlinePack: "حزمة أوفلاين",
    downloadPdf: "تحميل PDF",
    shareRoute: "مشاركة",
    saveRoute: "حفظ",
    saved: "تم الحفظ",
    agencySavings: "توفير وكالات السفر",
    agencySavingsDesc: "وفر ما يقارب 31% بالتخطيط المباشر وتجنب عمولات وكالات السفر المرتفعة.",
    viewTickets: "عرض التذاكر",
    bookFlight: "حجز التذكرة",
    bookHotel: "عرض الفندق",
    perNight: "/ ليلة",
    dayLabel: "اليوم",

    cookieText: "يستخدم روتازور ملفات تعريف الارتباط لتقديم أفضل تجربة سفر وتذكر تفضيلاتك.",
    cookieAccept: "قبول",
    cookieDecline: "رفض",
  },
};
