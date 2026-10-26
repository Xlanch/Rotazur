import type { City, Comfort } from "../types";
import { expandedCity, expandedTransfers, expandedShopping, expandedPhotos, expandedConnectivity, expandedIdeas, expandedDayTrips } from "./expanded-guides";

// 1. SESLİ TELAFFUZLU KONUŞMA KARTLARI & GARSONA GÖSTER MODU
export type PhraseCategory = "restoran" | "ulasim" | "alisveris" | "acil";

export interface SurvivalPhrase {
  id: string;
  category: PhraseCategory;
  icon: string;
  badge?: string;
  tr: string;
  local: string;
  phonetic: string;
  en: string;
  waiterNote?: string;
}

export interface CityPhrasebook {
  languageName: string;
  speechLang: string; // BCP-47 kodu (örn. "sr-RS", "it-IT", "ja-JP")
  phrases: SurvivalPhrase[];
}

// 2. HAVALİMANI -> ŞEHİR MERKEZİ TRANSFER KARŞILAŞTIRICISI
export interface AirportTransferOption {
  tier: Comfort;
  mode: string;
  name: string;
  durationMin: number;
  frequency: string;
  priceEur: number;
  pricingModel: "per_person" | "per_vehicle";
  whereToBuy: string;
  proTip: string;
}

export interface CityAirportTransferGuide {
  estimated?: boolean;
  airportName: string;
  airportCode: string;
  distanceKm: number;
  options: AirportTransferOption[];
}

// 3. "BURADAN NE ALINIR?" HEDİYELİK & CANLI TAX-FREE HESAPLAYICISI
export interface SouvenirItem {
  id: string;
  tier: Comfort;
  name: string;
  category: string;
  avgEur: number;
  whereToBuy: string;
  description: string;
}

export interface TaxFreeRules {
  verified?: boolean;
  available: boolean;
  minSpendEur: number;
  minSpendLocalLabel: string;
  vatRatePercent: number;
  netRefundPercent: number; // Aracı komisyonu sonrası ele geçen net %
  customsTip: string;
}

export interface CityShoppingGuide {
  taxFree: TaxFreeRules;
  souvenirs: SouvenirItem[];
}

// 4. INSTAGRAM & ALTIN SAAT (GOLDEN HOUR) FOTOĞRAF NOKTALARI
export interface PhotoSpot {
  id: string;
  name: string;
  bestTime: "🌅 Sabah Erken (Kalabalıksız)" | "🌇 Altın Saat / Gün Batımı" | "🌃 Mavi Saat & Gece" | "☀️ Öğle Işığı";
  costEur: number;
  angleTip: string;
  vibe: string;
  lat: number;
  lon: number;
}

// 5. eSIM, İNTERNET, PRİZ & MUSLUK SUYU REHBERİ
export interface CityConnectivityGuide {
  estimated?: boolean;
  esimName: string;
  esimDataLabel: string;
  esimPriceEur: number;
  localSimName: string;
  localSimDataLabel: string;
  localSimPriceEur: number;
  whereToBuySim: string;
  trRoamingDailyTry: number;
  tapWater: {
    drinkable: boolean;
    statusLabel: string;
    detail: string;
  };
  plug: {
    types: string;
    voltage: string;
    adapterNeeded: boolean;
    detail: string;
  };
  essentialApps: { name: string; purpose: string }[];
}

// 6. "ŞU AN 2 SAAT BOŞ VAKTİM VAR" ANLIK RUH HALİ & BÜTÇE ÖNERİCİSİ
export type SpontaneousMood = "kahve" | "yagmur" | "sokak-lezzeti" | "manzara" | "gizli-kesif";

export interface SpontaneousIdea {
  id: string;
  mood: SpontaneousMood;
  title: string;
  duration: string;
  costEur: number;
  neighborhood: string;
  description: string;
  lat: number;
  lon: number;
}

// 7. "BURAYA KADAR GELMİŞKEN..." GÜNÜBİRLİK YAKIN ŞEHİR & KOMŞU ROTALAR
export interface NearbyDayTrip {
  id: string;
  destination: string;
  badge: string;
  transportType: string;
  durationOneWay: string;
  roundTripEur: number;
  highlights: string;
  proTip: string;
}

// DİL VERİTABANI (Ülke / Şehir Bazlı Doğal Çeviriler ve Okunuşlar)
interface LanguagePack {
  languageName: string;
  speechLang: string;
  noPorkLocal: string;
  noPorkPhonetic: string;
  noAlcoholLocal: string;
  noAlcoholPhonetic: string;
  allergyLocal: string;
  allergyPhonetic: string;
  billCardLocal: string;
  billCardPhonetic: string;
  specialtyLocal: string;
  specialtyPhonetic: string;
  taxiMeterLocal: string;
  taxiMeterPhonetic: string;
  airportBusLocal: string;
  airportBusPhonetic: string;
  ticketValidateLocal: string;
  ticketValidatePhonetic: string;
  discountLocal: string;
  discountPhonetic: string;
  taxFreeLocal: string;
  taxFreePhonetic: string;
  pharmacyLocal: string;
  pharmacyPhonetic: string;
  helpPoliceLocal: string;
  helpPolicePhonetic: string;
}

const LANGUAGE_PACKS: Record<string, LanguagePack> = {
  sr: {
    languageName: "Sırpça / Boşnakça",
    speechLang: "sr-RS",
    noPorkLocal: "Молим вас, без свињетине и свињске масти. Не једем свињетину.",
    noPorkPhonetic: "Molim vas, bez svinyetine i svinyske masti. Ne yedem svinyetinu.",
    noAlcoholLocal: "Да ли у овој храни има алкохола или вина? Молим без алкохола.",
    noAlcoholPhonetic: "Da li u ovoy hrani ima alkohola ili vina? Molim bez alkohola.",
    allergyLocal: "Имам алергију на орашасте плодове / глутен / млеко.",
    allergyPhonetic: "İmam alergiyu na oraşaste plodove / gluten / mleko.",
    billCardLocal: "Може ли рачун, молим? Могу ли да платим картицом?",
    billCardPhonetic: "Moje li raçun, molim? Mogu li da platim kartitsom?",
    specialtyLocal: "Шта нам препоручујете од домаћих специјалитета?",
    specialtyPhonetic: "Şta nam preporuçuyete od domaçih spetsiyaliteta?",
    taxiMeterLocal: "Желим на ову адресу. Можете ли укључити таксиметар? Колико отприлике кошта?",
    taxiMeterPhonetic: "Jelim na ovu adresu. Mojete li uklyuçiti taksimetar? Koliko otprilike koşta?",
    airportBusLocal: "Одакле полази аутобус или воз за центар / аеродром?",
    airportBusPhonetic: "Odakle polazi autobus ili voz za tsentar / aerodrom?",
    ticketValidateLocal: "Где се купује или оверава карта за превоз?",
    ticketValidatePhonetic: "Gde se kupuye ili overava karta za prevoz?",
    discountLocal: "Колико ово кошта? Може ли мали попуст за готовину?",
    discountPhonetic: "Koliko ovo koşta? Moje li mali popust za gotovinu?",
    taxFreeLocal: "Да ли издајете Tax-Free формулар за повраћај ПДВ-а?",
    taxFreePhonetic: "Da li izdayete Tax-Free formular za povraçay PDV-a?",
    pharmacyLocal: "Треба ми лек против болова / за прехладу / за стомак.",
    pharmacyPhonetic: "Treba mi lek protiv bolova / za prehladu / za stomak.",
    helpPoliceLocal: "Потребна ми је помоћ. Изгубио сам пасош. Где је полиција?",
    helpPolicePhonetic: "Potrebna mi ye pomoç. İzgubio sam pasoş. Gde ye politsiya?",
  },
  it: {
    languageName: "İtalyanca",
    speechLang: "it-IT",
    noPorkLocal: "Per favore, niente carne di maiale, prosciutto o strutto. Non mangio maiale.",
    noPorkPhonetic: "Per favore, niente karne di mayale, proşutto o strutto. Non manco mayale.",
    noAlcoholLocal: "C'è alcol o vino in questo piatto? Per favore, senza alcol.",
    noAlcoholPhonetic: "Çe alkol o vino in kuesto piatto? Per favore, senza alkol.",
    allergyLocal: "Sono allergico alle noci / al glutine / ai latticini.",
    allergyPhonetic: "Sono allerjiko alle noçi / al glutine / ay lattiçini.",
    billCardLocal: "Il conto, per favore. Posso pagare con la carta?",
    billCardPhonetic: "İl konto, per favore. Posso pagare kon la karta?",
    specialtyLocal: "Qual è il piatto tipico della casa che ci consiglia?",
    specialtyPhonetic: "Kual e il piatto tipiko della kaza ke çi konsilya?",
    taxiMeterLocal: "Vorrei andare a questo indirizzo. Può accendere il tassametro?",
    taxiMeterPhonetic: "Vorrey andare a kuesto indirizzo. Puo aççendere il tassametro?",
    airportBusLocal: "Da dove parte il treno o l'autobus per il centro / l'aeroporto?",
    airportBusPhonetic: "Da dove parte il treno o l'autobus per il çentro / l'aeroporto?",
    ticketValidateLocal: "Dove devo convalidare questo biglietto?",
    ticketValidatePhonetic: "Dove devo konvalidare kuesto bilyetto?",
    discountLocal: "Quanto costa questo? Può fare un piccolo sconto in contanti?",
    discountPhonetic: "Kuanto kosta kuesto? Puo fare un pikkolo skonto in kontanti?",
    taxFreeLocal: "Potete fare il modulo Tax-Free per i turisti extra-UE?",
    taxFreePhonetic: "Potete fare il modulo Tax-Free per i turisti ekstra-UE?",
    pharmacyLocal: "Ho bisogno di un antidolorifico / medicina per il raffreddore.",
    pharmacyPhonetic: "O bizonyo di un antidolorifiko / mediçina per il raffreddore.",
    helpPoliceLocal: "Ho bisogno di aiuto, ho perso il passaporto. Dov'è la polizia?",
    helpPolicePhonetic: "O bizonyo di ayuto, o perso il passaporto. Dove la politsiya?",
  },
  fr: {
    languageName: "Fransızca",
    speechLang: "fr-FR",
    noPorkLocal: "S'il vous plaît, sans porc, sans jambon ni saindoux. Je ne mange pas de porc.",
    noPorkPhonetic: "Sil vu ple, san pork, san jambon ni sendu. Jö nö manj pa dö pork.",
    noAlcoholLocal: "Y a-t-il de l'alcool ou du vin dans ce plat ? Sans alcool, s'il vous plaît.",
    noAlcoholPhonetic: "Yatil dö lalkol u dü ven dan sö pla? San zalkol, sil vu ple.",
    allergyLocal: "J'ai une allergie aux arachides / au gluten / au lactose.",
    allergyPhonetic: "Je ün alerji o zaraşid / o glüten / o laktoz.",
    billCardLocal: "L'addition, s'il vous plaît. Je peux payer par carte ? (Et une carafe d'eau)",
    billCardPhonetic: "Ladisyon, sil vu ple. Jö pö peye par kart? (E ün karaf do)",
    specialtyLocal: "Quelle est la spécialité de la maison que vous recommandez ?",
    specialtyPhonetic: "Kel e la spesyalite dö la mezon kö vu rökomande?",
    taxiMeterLocal: "Je voudrais aller à cette adresse. Pouvez-vous mettre le compteur ?",
    taxiMeterPhonetic: "Jö vudre ale a set adres. Puve vu metr lö kontör?",
    airportBusLocal: "D'où part le train RER ou le bus pour le centre-ville / l'aéroport ?",
    airportBusPhonetic: "Du par lö tren RER u lö büs pur lö santr-vil / laeropor?",
    ticketValidateLocal: "Où dois-je composter ce billet ?",
    ticketValidatePhonetic: "U duaj komposte sö biye?",
    discountLocal: "Combien ça coûte ? Pouvez-vous faire une petite réduction ?",
    discountPhonetic: "Kombyen sa kut? Puve vu fer ün pötit redüksyon?",
    taxFreeLocal: "Faites-vous la détaxe (Tax-Free) pour les touristes ?",
    taxFreePhonetic: "Fet vu la detaks (Tax-Free) pur le turist?",
    pharmacyLocal: "J'ai besoin d'un antidouleur / d'un médicament contre le rhume.",
    pharmacyPhonetic: "Je bözuan dön antidulör / dön medikaman kontr lö rüm.",
    helpPoliceLocal: "J'ai besoin d'aide, j'ai perdu mon passeport. Où est le commissariat ?",
    helpPolicePhonetic: "Je bözuan ded, je perdü mon paspor. U e lö komisarya?",
  },
  es: {
    languageName: "İspanyolca",
    speechLang: "es-ES",
    noPorkLocal: "Por favor, sin carne de cerdo, jamón ni manteca de cerdo. No como cerdo.",
    noPorkPhonetic: "Por favor, sin karne de serdo, hamon ni manteka de serdo. No komo serdo.",
    noAlcoholLocal: "¿Lleva alcohol o vino este plato? Sin alcohol, por favor.",
    noAlcoholPhonetic: "Yeva alkol o vino este plato? Sin alkol, por favor.",
    allergyLocal: "Tengo alergia a los frutos secos / al gluten / a la lactosa.",
    allergyPhonetic: "Tengo alerhiya a los frutos sekos / al gluten / a la laktosa.",
    billCardLocal: "La cuenta, por favor. ¿Puedo pagar con tarjeta?",
    billCardPhonetic: "La kuenta, por favor. Puedo pagar kon tarheta?",
    specialtyLocal: "¿Cuál es el plato típico de la casa que nos recomienda?",
    specialtyPhonetic: "Kual es el plato tipiko de la kasa ke nos rekomienda?",
    taxiMeterLocal: "Quiero ir a esta dirección. ¿Puede poner el taxímetro, por favor?",
    taxiMeterPhonetic: "Kiero ir a esta direksiyon. Puede poner el taksimetro, por favor?",
    airportBusLocal: "¿De dónde sale el autobús o el metro hacia el centro / el aeropuerto?",
    airportBusPhonetic: "De donde sale el autobus o el metro asiya el sentro / el aeropuerto?",
    ticketValidateLocal: "¿Dónde se valida este billete de transporte?",
    ticketValidatePhonetic: "Donde se valida este biyete de transporte?",
    discountLocal: "¿Cuánto cuesta esto? ¿Me puede hacer un pequeño descuento?",
    discountPhonetic: "Kuanto kuesta esto? Me puede aser un pekenyo deskuento?",
    taxFreeLocal: "¿Hacen formulario Tax-Free (DIVA) para turistas?",
    taxFreePhonetic: "Asen formularyo Tax-Free (DIVA) para turistas?",
    pharmacyLocal: "Necesito un analgésico / medicamento para el resfriado o estómago.",
    pharmacyPhonetic: "Nesesito un analhesiko / medikamento para el resfriado o estomago.",
    helpPoliceLocal: "Necesito ayuda, he perdido mi pasaporte. ¿Dónde está la policía?",
    helpPolicePhonetic: "Nesesito ayuda, e perdido mi pasaporte. Donde esta la polisiya?",
  },
  de: {
    languageName: "Almanca",
    speechLang: "de-DE",
    noPorkLocal: "Bitte ohne Schweinefleisch, Speck oder Schweineschmalz. Ich esse kein Schweinefleisch.",
    noPorkPhonetic: "Bitte one Şvayne-flayş, Şpek oder Şvayne-şmalts. İh esse kayn Şvayne-flayş.",
    noAlcoholLocal: "Enthält dieses Gericht Alkohol oder Wein? Bitte ohne Alkohol.",
    noAlcoholPhonetic: "Ent-helt dizes Geriht Alkohol oder Vayn? Bitte one Alkohol.",
    allergyLocal: "Ich habe eine Allergie gegen Nüsse / Gluten / Laktose.",
    allergyPhonetic: "İh habe ayne Alergi gegen Nüsse / Gluten / Laktoze.",
    billCardLocal: "Die Rechnung, bitte. Kann ich mit Karte bezahlen?",
    billCardPhonetic: "Di Rehnung, bitte. Kan ih mit Karte betsalen?",
    specialtyLocal: "Was ist die Spezialität des Hauses, die Sie empfehlen?",
    specialtyPhonetic: "Vas ist di Şpetsyalitet des Hauzes, di Zi empfelen?",
    taxiMeterLocal: "Ich möchte zu dieser Adresse. Können Sie bitte das Taxameter einschalten?",
    taxiMeterPhonetic: "İh möhte tsu dizer Adresse. Können Zi bitte das Taksameter aynşalten?",
    airportBusLocal: "Wo fährt der Zug oder Bus ins Stadtzentrum / zum Flughafen ab?",
    airportBusPhonetic: "Vo fert der Tsug oder Bus ins Ştatt-tsentrum / tsum Flughafen ab?",
    ticketValidateLocal: "Wo muss ich dieses Ticket entwerten?",
    ticketValidatePhonetic: "Vo mus ih dizes Tiket entverten?",
    discountLocal: "Wie viel kostet das? Ist ein kleiner Rabatt bei Barzahlung möglich?",
    discountPhonetic: "Vi fil kostet das? İst ayn klayner Rabat bay Bartsahlung möglih?",
    taxFreeLocal: "Stellen Sie ein Tax-Free-Formular für Touristen aus?",
    taxFreePhonetic: "Ştellen Zi ayn Tax-Free Formular für Turisten aus?",
    pharmacyLocal: "Ich brauche ein Schmerzmittel / Medikament gegen Erkältung.",
    pharmacyPhonetic: "İh brauhe ayn Şmertsmittel / Medikament gegen Erkeltung.",
    helpPoliceLocal: "Ich brauche Hilfe, ich habe meinen Reisepass verloren. Wo ist die Polizei?",
    helpPolicePhonetic: "İh brauhe Hilfe, ih habe maynen Rayzepas ferloren. Vo ist di Politsay?",
  },
  hu: {
    languageName: "Macarca",
    speechLang: "hu-HU",
    noPorkLocal: "Kérem, sertéshús és sertészsír nélkül legyen. Nem eszem sertéshúst.",
    noPorkPhonetic: "Kerem, şerteş-huş eş şerteş-jir nelkül lecyen. Nem esem şerteş-huşt.",
    noAlcoholLocal: "Van ebben az ételben alkohol vagy bor? Kérem, alkohol nélkül.",
    noAlcoholPhonetic: "Van ebben az etelben alkohol vacy bor? Kerem, alkohol nelkül.",
    allergyLocal: "Allergiás vagyok a mogyoróra / gluténra / laktózra.",
    allergyPhonetic: "Alergiaş vacyok a mocyorora / glutenra / laktozra.",
    billCardLocal: "A számlát szeretném kérni. Fizethetek bankkártyával?",
    billCardPhonetic: "A samlat seretnem kerni. Fizethetek bankkartyaval?",
    specialtyLocal: "Melyik helyi specialitást ajánlja nekünk?",
    specialtyPhonetic: "Meyik heyi spetsialitaşt ayanlya nekünk?",
    taxiMeterLocal: "Erre a címre szeretnék menni. Kérem, kapcsolja be a taxiórát.",
    taxiMeterPhonetic: "Erre a tsimre seretnek menni. Kerem, kapçolya be a taksiorat.",
    airportBusLocal: "Honnan indul a 100E busz vagy a metró a belvárosba / repülőtérre?",
    airportBusPhonetic: "Honnan indul a 100E bus vacy a metro a belvaroşba / repülöterre?",
    ticketValidateLocal: "Hol kell érvényesíteni ezt a jegyet?",
    ticketValidatePhonetic: "Hol kell ervenyeşiteni ezt a yecyet?",
    discountLocal: "Mennyibe kerül ez? Kaphatok egy kis kedvezményt?",
    discountPhonetic: "Menyibe kerül ez? Kaphatok ecy kiş kedvezmenyt?",
    taxFreeLocal: "Ki tudják állítani a Tax-Free (ÁFA-visszatérítés) nyomtatványt?",
    taxFreePhonetic: "Ki tudyak allitani a Tax-Free nyomtatvanyt?",
    pharmacyLocal: "Fájdalomcsillapítót / megfázás elleni gyógyszert keresek.",
    pharmacyPhonetic: "Faydalom-çillapitot / megfazaş elleni cyocysert kereşek.",
    helpPoliceLocal: "Segítségre van szükségem, elvesztettem az útlevelemet. Hol a rendőrség?",
    helpPolicePhonetic: "Şegitşegre van şükşegem, elvestettem az utlevelemet. Hol a rendörşeg?",
  },
  cs: {
    languageName: "Çekçe",
    speechLang: "cs-CZ",
    noPorkLocal: "Prosím bez vepřového masa a vepřového sádla. Nejím vepřové.",
    noPorkPhonetic: "Prosim bez veprjoveho masa a veprjoveho sadla. Neyim veprjove.",
    noAlcoholLocal: "Je v tomto jídle alkohol nebo víno? Prosím bez alkoholu.",
    noAlcoholPhonetic: "Ye v tomto yidle alkohol nebo vino? Prosim bez alkoholu.",
    allergyLocal: "Mám alergii na ořechy / lepek / laktózu.",
    allergyPhonetic: "Mam alergii na orjehi / lepek / laktozu.",
    billCardLocal: "Zaplatím, prosím. Mohu platit kartou?",
    billCardPhonetic: "Zaplatim, prosim. Mohu platit kartou?",
    specialtyLocal: "Jakou místní specialitu nám doporučíte?",
    specialtyPhonetic: "Yakou mistni spetsialitu nam doporuçite?",
    taxiMeterLocal: "Chci jet na tuto adresu. Můžete prosím zapnout taxametr?",
    taxiMeterPhonetic: "Htsi yet na tuto adresu. Mujete prosim zapnout taksametr?",
    airportBusLocal: "Odkud jede autobus nebo metro do centra / na letiště?",
    airportBusPhonetic: "Odkud yede autobus nebo metro do tsentra / na letişte?",
    ticketValidateLocal: "Kde si musím označit tuto jízdenku?",
    ticketValidatePhonetic: "Kde si musim oznaçit tuto yizdenku?",
    discountLocal: "Kolik to stojí? Můžete mi dát malou slevu?",
    discountPhonetic: "Kolik to stoyi? Mujete mi dat malou slevu?",
    taxFreeLocal: "Vystavujete formulář Tax-Free pro turisty mimo EU?",
    taxFreePhonetic: "Vistavuyete formular Tax-Free pro turisti mimo EU?",
    pharmacyLocal: "Potřebuji lék proti bolesti / na nachlazení.",
    pharmacyPhonetic: "Potrjebuyi lek proti bolesti / na nahlazeni.",
    helpPoliceLocal: "Potřebuji pomoc, ztratil jsem pas. Kde je policie?",
    helpPolicePhonetic: "Potrjebuyi pomots, ztratil ysem pas. Kde ye politsiye?",
  },
  el: {
    languageName: "Yunanca",
    speechLang: "el-GR",
    noPorkLocal: "Παρακαλώ χωρίς χοιρινό κρέας ή λαρδί. Δεν τρώω χοιρινό.",
    noPorkPhonetic: "Parakalo horis hirino kreas i lardi. Den troo hirino.",
    noAlcoholLocal: "Υπάρχει αλκοόλ ή κρασί σε αυτό το φαγητό; Χωρίς αλκοόλ, παρακαλώ.",
    noAlcoholPhonetic: "İparhi alkool i krasi se afto to fayito? Horis alkool, parakalo.",
    allergyLocal: "Έχω αλλεργία στους ξηρούς καρπούς / στη γλουτένη / στη λακτόζη.",
    allergyPhonetic: "Eho alergia stus ksirus karpus / sti gluteni / sti laktozi.",
    billCardLocal: "Τον λογαριασμό, παρακαλώ. Μπορώ να πληρώσω με κάρτα;",
    billCardPhonetic: "Ton logariasmo, parakalo. Boro na pliroso me karta?",
    specialtyLocal: "Ποιο παραδοσιακό πιάτο μας προτείνετε;",
    specialtyPhonetic: "Pio paradosiako piato mas protinete?",
    taxiMeterLocal: "Θέλω να πάω σε αυτή τη διεύθυνση. Ανοίγετε το ταξίμετρο, παρακαλώ;",
    taxiMeterPhonetic: "Telo na pao se afti ti dieftinsi. Anigete to taksimetro, parakalo?",
    airportBusLocal: "Από πού φεύγει το μετρό ή το λεωφορείο X95 για το κέντρο / αεροδρόμιο;",
    airportBusPhonetic: "Apo pu fevgi to metro i to leoforio X95 ya to kentro / aerodromio?",
    ticketValidateLocal: "Πού ακυρώνω αυτό το εισιτήριο;",
    ticketValidatePhonetic: "Pu akirono afto to isitirio?",
    discountLocal: "Πόσο κοστίζει αυτό; Γίνεται μια καλύτερη τιμή μετρητοίς;",
    discountPhonetic: "Poso kostizi afto? Yinete mia kaliteri timi metritis?",
    taxFreeLocal: "Κάνετε Tax-Free για τουρίστες εκτός ΕΕ;",
    taxFreePhonetic: "Kanete Tax-Free ya turistes ektos EE?",
    pharmacyLocal: "Χρειάζομαι ένα παυσίπονο / φάρμακο για το κρυολόγημα.",
    pharmacyPhonetic: "Hriazome ena pafsipono / farmako ya to kriologima.",
    helpPoliceLocal: "Χρειάζομαι βοήθεια, έχασα το διαβατήριό μου. Πού είναι η αστυνομία;",
    helpPolicePhonetic: "Hriazome voithia, ehasa to diavatirio mu. Pu ine i astinomia?",
  },
  ja: {
    languageName: "Japonca",
    speechLang: "ja-JP",
    noPorkLocal: "豚肉（ポーク）、ベーコン、豚のエキス・ラードは抜いてください。豚肉は食べられません。",
    noPorkPhonetic: "Butaniku (pōku), bēkon, buta no ekisu・rādo wa nuite kudasai. Butaniku wa taberaremasen.",
    noAlcoholLocal: "この料理にお酒やみりんは入っていますか？アルコールなしでお願いします。",
    noAlcoholPhonetic: "Kono ryōri ni osake ya mirin wa haitte imasu ka? Arukōru nashi de onegaishimasu.",
    allergyLocal: "ナッツ / 小麦（グルテン） / 乳製品のアレルギーがあります。",
    allergyPhonetic: "Nattsu / komugi (guruten) / nyūseihin no arerugī ga arimasu.",
    billCardLocal: "お会計をお願いします。クレジットカードで払えますか？",
    billCardPhonetic: "O-kaikei o onegaishimasu. Kurejitto kādo de haraemasu ka?",
    specialtyLocal: "このお店のおすすめの名物料理は何ですか？",
    specialtyPhonetic: "Kono omise no osusume no meibutsu ryōri wa nan desu ka?",
    taxiMeterLocal: "この住所までお願いします。大体いくらぐらいかかりますか？",
    taxiMeterPhonetic: "Kono jūsho made onegaishimasu. Daitai ikura gurai kakarimasu ka?",
    airportBusLocal: "空港 / 市内中心部行きの電車・バス乗り場はどこですか？",
    airportBusPhonetic: "Kūkō / shinai chūshinbu yuki no densha / basu noriba wa doko desu ka?",
    ticketValidateLocal: "この切符・パスはどこで使えますか？",
    ticketValidatePhonetic: "Kono kippu / pasu wa doko de tsukaemasu ka?",
    discountLocal: "これはいくらですか？少し安くなりますか？",
    discountPhonetic: "Kore wa ikura desu ka? Sukoshi yasuku narimasu ka?",
    taxFreeLocal: "免税（Tax-Free）の手続きはできますか？パスポートを持っています。",
    taxFreePhonetic: "Menzei (Tax-Free) no tetsuzuki wa dekimasu ka? Pasupōto o motte imasu.",
    pharmacyLocal: "痛み止め / 風邪薬 / 胃薬を探しています。",
    pharmacyPhonetic: "İtamidome / kazegusuri / igusuri o sagashite imasu.",
    helpPoliceLocal: "助けてください。パスポートをなくしました。交番（警察）はどこですか？",
    helpPolicePhonetic: "Tasukete kudasai. Pasupōto o nakushimashita. Kōban (keisatsu) wa doko desu ka?",
  },
  ka: {
    languageName: "Gürcüce (ve Rusça/İngilizce)",
    speechLang: "ru-RU",
    noPorkLocal: "გთხოვთ, ღორის ხორცის გარეშე (Без свинины, пожалуйста — Я не ем свинину).",
    noPorkPhonetic: "Gthovt, goris hortsis gareşe (Bez svinini, pajalusta).",
    noAlcoholLocal: "ალკოჰოლის და ღვინის გარეშე, გთხოვთ (Без алкоголя и вина, пожалуйста).",
    noAlcoholPhonetic: "Alkoholis da gvinis gareşe, gthovt (Bez alkogolya i vina).",
    allergyLocal: "მაქვს ალერგია თხილზე / გლუტენზე (У меня аллергия на орехи / глютен).",
    allergyPhonetic: "Makvs alergia thilze / glutenze (U menya alergiya na orehi).",
    billCardLocal: "ანგარიში მოგვიტანეთ, გთხოვთ. ბარათით გადავიხდი? (Счёт, пожалуйста. Можно картой?)",
    billCardPhonetic: "Angarişi mogvitanet, gthovt. Baratit gadavihdi? (Sçyot, pajalusta).",
    specialtyLocal: "რას გვირჩევთ ტრადიციული კერძებიდან? (Что посоветуете из грузинских блюд?)",
    specialtyPhonetic: "Ras gvirçevt traditsiuli kerdzebidan?",
    taxiMeterLocal: "ამ მისამართზე მინდა წასვლა. რა ეღირება? (Мне нужно по этому адресу).",
    taxiMeterPhonetic: "Am misamartze minda tsasvla. Ra egireba?",
    airportBusLocal: "საიდან გადის ავტობუსი №337 ცენტრში / აეროპორტში?",
    airportBusPhonetic: "Saidan gadis avtobusi 337 tsentrşi / aeroportşi?",
    ticketValidateLocal: "სად გადავიხადო მგზავრობის საფასური?",
    ticketValidatePhonetic: "Sad gadavihado mgzavrobis safasuri?",
    discountLocal: "რა ღირს ეს? ცოტა დააკლებთ? (Сколько это стоит? Сделаете скидку?)",
    discountPhonetic: "Ra girs es? Tsota daaklebt? (Skolko eto stoit?)",
    taxFreeLocal: "Tax-Free ფორმას აკეთებთ ტურისტებისთვის? (Вы оформляете Tax-Free?)",
    taxFreePhonetic: "Tax-Free formas aketebt turistebistvis?",
    pharmacyLocal: "ტკივილგამაყუჩებელი / გაციების წამალი მჭირდება (Мне нужно обезболивающее).",
    pharmacyPhonetic: "Tkivilgamayuçebeli / gatsiebis tsamali mçirdeba.",
    helpPoliceLocal: "დახმარება მჭირდება, პასპორტი დავკარგე. სად არის პოლიცია?",
    helpPolicePhonetic: "Dahmareba mçirdeba, pasporti davkarge. Sad aris politsia?",
  },
  pt: {
    languageName: "Portekizce",
    speechLang: "pt-PT",
    noPorkLocal: "Por favor, sem carne de porco, presunto ou banha. Não como porco.",
    noPorkPhonetic: "Pur favor, sem karne de porku, prezuntu o banya. Nau komu porku.",
    noAlcoholLocal: "Este prato leva álcool ou vinho? Sem álcool, por favor.",
    noAlcoholPhonetic: "Eşte pratu leva alkol o vinyu? Sem alkol, pur favor.",
    allergyLocal: "Tenho alergia a frutos secos / glúten / lactose.",
    allergyPhonetic: "Tenyu alerjia a frutuş sekuş / gluten / laktoze.",
    billCardLocal: "A conta, por favor. Posso pagar com cartão?",
    billCardPhonetic: "A konta, pur favor. Posu pagar kom kartau?",
    specialtyLocal: "Qual é o prato típico da casa que nos recomenda?",
    specialtyPhonetic: "Kual e u pratu tipiku da kaza ke nuş rekomenda?",
    taxiMeterLocal: "Quero ir para esta morada. Pode ligar o taxímetro, por favor?",
    taxiMeterPhonetic: "Keru ir para eşta morada. Pode ligar u taksimetru, pur favor?",
    airportBusLocal: "De onde parte o metro ou autocarro para o centro / aeroporto?",
    airportBusPhonetic: "De onde parte u metru o autokarru para u sentru / aeroportu?",
    ticketValidateLocal: "Onde devo validar este bilhete Navegante?",
    ticketValidatePhonetic: "Onde devu validar eşte bilyete Navegante?",
    discountLocal: "Quanto custa isto? Pode fazer um pequeno desconto?",
    discountPhonetic: "Kuantu kuşta iştu? Pode fazer um pekenu deşkontu?",
    taxFreeLocal: "Fazem o formulário Tax-Free para turistas fora da UE?",
    taxFreePhonetic: "Fazem u formularyu Tax-Free para turiştaş fora da UE?",
    pharmacyLocal: "Preciso de um analgésico / medicamento para a constipação.",
    pharmacyPhonetic: "Presizu de um analjeziku / medikamentu para a konştipasau.",
    helpPoliceLocal: "Preciso de ajuda, perdi o meu passaporte. Onde fica a polícia?",
    helpPolicePhonetic: "Presizu de ajuda, perdi u meu pasaporte. Onde fika a polisia?",
  },
  ar: {
    languageName: "Arapça & İngilizce",
    speechLang: "ar-AE",
    noPorkLocal: "من فضلك، بدون لحم خنزير أو دهن خنزير (حلال فقط).",
    noPorkPhonetic: "Min fadlik, bidun lahm hinzir (Halal fakat).",
    noAlcoholLocal: "هل يوجد كحول في هذا الطبق؟ بدون كحول من فضلك.",
    noAlcoholPhonetic: "Hal yucad kuhul fi haza el-tabak? Bidun kuhul min fadlik.",
    allergyLocal: "لدي حساسية من المكسرات / الغلوتين / منتجات الألبان.",
    allergyPhonetic: "Ladaya hasasiya min el-mukassarat / el-glutin / el-elban.",
    billCardLocal: "الفاتورة من فضلك. هل يمكنني الدفع بالبطاقة؟",
    billCardPhonetic: "El-fatura min fadlik. Hal yumkinuni el-defi bil-bitaka?",
    specialtyLocal: "ما هو الطبق المحلي المميز الذي تنصحنا به؟",
    specialtyPhonetic: "Ma huva el-tabak el-mahalli el-mumayyaz?",
    taxiMeterLocal: "أريد الذهاب إلى هذا العنوان. هل يمكنك تشغيل العداد من فضلك؟",
    taxiMeterPhonetic: "Uridu el-zehab ila haza el-unvan. Hal yumkinuka teşgil el-addad?",
    airportBusLocal: "من أين ينطلق المترو أو الحافلة إلى وسط المدينة / المطار؟",
    airportBusPhonetic: "Min eyne yantaliku el-metro ev el-hafila ila vasat el-medine?",
    ticketValidateLocal: "أين يمكنني شراء أو تمرير بطاقة المترو؟",
    ticketValidatePhonetic: "Eyne yumkinuni şira bitakat el-metro?",
    discountLocal: "بكم هذا؟ هل يمكنك عمل خصم جيد؟",
    discountPhonetic: "Bikam haza? Hal yumkinuka amel hasm ceyyid?",
    taxFreeLocal: "هل تقدمون نموذج استرداد الضريبة (Tax-Free) للسياح؟",
    taxFreePhonetic: "Hal tukaddimun namuzec Tax-Free lil-suyyah?",
    pharmacyLocal: "أحتاج إلى مسكن للألم / دواء للبرد أو المعدة.",
    pharmacyPhonetic: "Ahtacu ila musakkin lil-elem / deva lil-berd.",
    helpPoliceLocal: "أحتاج إلى مساعدة، فقدت جواز سفري. أين مركز الشرطة؟",
    helpPolicePhonetic: "Ahtacu ila musaada, fakadtu cevaz safari. Eyne merkez el-şurta?",
  },
  en: {
    languageName: "İngilizce",
    speechLang: "en-GB",
    noPorkLocal: "Please, no pork, bacon, ham, or lard in my food. I do not eat pork.",
    noPorkPhonetic: "Pliz, no pork, beykın, hem or lard in may fud. Ay du nat it pork.",
    noAlcoholLocal: "Does this dish contain any alcohol or wine? Alcohol-free, please.",
    noAlcoholPhonetic: "Daz dis diş konteyn eni alkol or vayn? Alkol-fri, pliz.",
    allergyLocal: "I have a severe allergy to nuts / gluten / dairy products.",
    allergyPhonetic: "Ay hev a sivir alerji tu nats / gluten / deri prodakts.",
    billCardLocal: "Could we have the bill, please? Can I pay by contactless card?",
    billCardPhonetic: "Kud vi hev dı bil, pliz? Ken ay pey bay kontaktles kard?",
    specialtyLocal: "What is your signature local dish that you recommend?",
    specialtyPhonetic: "Vat iz yor signıçır lokal diş det yu rekomend?",
    taxiMeterLocal: "I'd like to go to this address. Could you switch on the meter, please?",
    taxiMeterPhonetic: "Ayd layk tu go tu dis adres. Kud yu sviç on dı mitır, pliz?",
    airportBusLocal: "Where does the train or bus to the city centre / airport depart from?",
    airportBusPhonetic: "Ver daz dı treyn or bas tu dı siti sentır / erport dipart from?",
    ticketValidateLocal: "Where do I tap or validate this transport ticket?",
    ticketValidatePhonetic: "Ver du ay tep or valideyt dis transport tikit?",
    discountLocal: "How much is this? Could you offer a better price if I pay cash?",
    discountPhonetic: "Hav maç iz dis? Kud yu ofır a betır prays if ay pey keş?",
    taxFreeLocal: "Do you issue Tax-Free (VAT refund) forms for international tourists?",
    taxFreePhonetic: "Du yu işu Teks-Fri forms for internasyonal turists?",
    pharmacyLocal: "I need a painkiller / cold medicine / stomach relief medicine, please.",
    pharmacyPhonetic: "Ay nid a peynkilır / kold medisin / stamık rilif medisin, pliz.",
    helpPoliceLocal: "I need help, I lost my passport. Where is the nearest police station?",
    helpPolicePhonetic: "Ay nid help, ay lost may pasport. Ver iz dı nirıst polis steyşın?",
  },
};

function getLangKeyForCity(city: Pick<City, "id" | "country">): string {
  const id = city.id.toLowerCase();
  if (["belgrad", "saraybosna", "kotor", "podgoritsa", "uskup"].includes(id)) return "sr";
  if (["roma", "milano", "venedik", "floransa", "napoli"].includes(id)) return "it";
  if (["paris", "nice", "lyon"].includes(id)) return "fr";
  if (["barselona", "madrid", "sevilla"].includes(id)) return "es";
  if (["berlin", "viyana", "munih", "zurih"].includes(id)) return "de";
  if (id === "budapeste") return "hu";
  if (id === "prag") return "cs";
  if (["atina", "selanik", "santorini"].includes(id)) return "el";
  if (["tokyo", "osaka", "kyoto"].includes(id)) return "ja";
  if (["tiflis", "batum", "semerkant", "kisinev"].includes(id)) return "ka";
  if (["lizbon", "porto"].includes(id)) return "pt";
  if (["dubai", "kahire", "sarm-el-seyh", "marakes"].includes(id)) return "ar";
  return "en";
}

export function getCityPhrasebook(city: Pick<City, "id" | "name" | "country">): CityPhrasebook {
  const key = getLangKeyForCity(city);
  const pack = LANGUAGE_PACKS[key] || LANGUAGE_PACKS.en;

  return {
    languageName: pack.languageName,
    speechLang: pack.speechLang,
    phrases: [
      {
        id: "no-pork",
        category: "restoran",
        icon: "🐷❌",
        badge: "Domuz Eti / Yağı Hassasiyeti",
        tr: "Lütfen yemeğimde domuz eti, jambon veya domuz yağı olmasın. Domuz eti yemiyorum.",
        local: pack.noPorkLocal,
        phonetic: pack.noPorkPhonetic,
        en: "Please, no pork, ham, bacon, or lard in my food. I do not eat pork.",
        waiterNote: "NO PORK / NO BACON / NO LARD PLEASE",
      },
      {
        id: "no-alcohol",
        category: "restoran",
        icon: "🍷❌",
        badge: "Alkolsüz Yemek Hassasiyeti",
        tr: "Bu yemekte veya sosunda alkol / şarap var mı? Lütfen alkolsüz olsun.",
        local: pack.noAlcoholLocal,
        phonetic: pack.noAlcoholPhonetic,
        en: "Does this dish or sauce contain alcohol/wine? Alcohol-free, please.",
        waiterNote: "NO ALCOHOL / NO WINE IN COOKING PLEASE",
      },
      {
        id: "allergy",
        category: "restoran",
        icon: "🥜⚠️",
        badge: "Gıda Alerjisi Kartı",
        tr: "Kuruyemiş / gluten / süt ürünlerine karşı alerjim var.",
        local: pack.allergyLocal,
        phonetic: pack.allergyPhonetic,
        en: "I have a food allergy to nuts / gluten / dairy.",
        waiterNote: "FOOD ALLERGY WARNING (NUTS / GLUTEN / DAIRY)",
      },
      {
        id: "bill-card",
        category: "restoran",
        icon: "💳🧾",
        badge: "Hesap & Ödeme",
        tr: "Hesabı alabilir miyiz lütfen? Kredi kartıyla ödeme yapabilir miyim?",
        local: pack.billCardLocal,
        phonetic: pack.billCardPhonetic,
        en: "Could we have the bill, please? Can I pay by credit card?",
      },
      {
        id: "specialty",
        category: "restoran",
        icon: "👨‍🍳✨",
        badge: "Şefin Tavsiyesi",
        tr: "Bize buranın en meşhur yöresel yemeği olarak ne önerirsiniz?",
        local: pack.specialtyLocal,
        phonetic: pack.specialtyPhonetic,
        en: "What is your most famous local dish that you recommend?",
      },
      {
        id: "taxi-meter",
        category: "ulasim",
        icon: "🚕📍",
        badge: "Taksimetre & Adres",
        tr: "Bu adrese gitmek istiyorum. Lütfen taksimetreyi açar mısınız? Yaklaşık ne kadar tutar?",
        local: pack.taxiMeterLocal,
        phonetic: pack.taxiMeterPhonetic,
        en: "I want to go to this address. Please turn on the taximeter.",
      },
      {
        id: "airport-bus",
        category: "ulasim",
        icon: "🚌✈️",
        badge: "Havalimanı & Merkez",
        tr: "Şehir merkezine / havalimanına giden otobüs veya tren nereden kalkıyor?",
        local: pack.airportBusLocal,
        phonetic: pack.airportBusPhonetic,
        en: "Where does the bus or train to the city center / airport depart from?",
      },
      {
        id: "ticket-val",
        category: "ulasim",
        icon: "🎫🚉",
        badge: "Bilet Onaylatma",
        tr: "Bu ulaşım biletini nerede onaylatmam (okutmam) gerekiyor?",
        local: pack.ticketValidateLocal,
        phonetic: pack.ticketValidatePhonetic,
        en: "Where do I validate or tap this transport ticket?",
      },
      {
        id: "discount",
        category: "alisveris",
        icon: "🛍️💶",
        badge: "Fiyat & Pazarlık",
        tr: "Bu ne kadar? Nakit ödesem biraz indirim yapabilir misiniz?",
        local: pack.discountLocal,
        phonetic: pack.discountPhonetic,
        en: "How much is this? Can you give a small discount for cash?",
      },
      {
        id: "tax-free",
        category: "alisveris",
        icon: "🛂📄",
        badge: "Tax-Free (KDV İadesi)",
        tr: "Turistim, havalimanında vergi iadesi için Tax-Free formu düzenleyebilir misiniz?",
        local: pack.taxFreeLocal,
        phonetic: pack.taxFreePhonetic,
        en: "Can you issue a Tax-Free refund form for tourists?",
      },
      {
        id: "pharmacy",
        category: "acil",
        icon: "💊🏥",
        badge: "Eczane & İlaç",
        tr: "Ağrı kesici / soğuk algınlığı ilacı / mide ilacı arıyorum.",
        local: pack.pharmacyLocal,
        phonetic: pack.pharmacyPhonetic,
        en: "I need a painkiller / cold medicine / stomach medicine, please.",
      },
      {
        id: "help-police",
        category: "acil",
        icon: "🚨👮",
        badge: "Acil Yardım & Polis",
        tr: "Yardıma ihtiyacım var, pasaportumu kaybettim. En yakın polis merkezi nerede?",
        local: pack.helpPoliceLocal,
        phonetic: pack.helpPolicePhonetic,
        en: "I need help, I lost my passport. Where is the nearest police station?",
      },
    ],
  };
}

// 2. HAVALİMANI TRANSFER REHBERİ VERİTABANI
const AIRPORT_TRANSFER_MAP: Record<string, CityAirportTransferGuide> = {
  belgrad: {
    airportName: "Belgrad Nikola Tesla Havalimanı",
    airportCode: "BEG",
    distanceKm: 18,
    options: [
      {
        tier: "tasarruflu",
        mode: "🚌 Belediye Otobüsü (Hat 72 & 600)",
        name: "GSP Hat 72 (Zeleni Venac) / Hat 600",
        durationMin: 40,
        frequency: "Her 30 dakikada bir",
        priceEur: 0,
        pricingModel: "per_person",
        whereToBuy: "2025 itibarıyla Belgrad şehir içi toplu taşıma (otobüs/tramvay) herkes için ÜCRETSİZDİR!",
        proTip: "Geliş terminalinin bir üst katındaki (Gidiş önü) duraktan 72 nolu otobüse binerek doğrudan merkez Zeleni Venac'a ücretsiz gidebilirsiniz.",
      },
      {
        tier: "dengeli",
        mode: "🚐 A1 Havalimanı Ekspres Minibüsü",
        name: "A1 Express Shuttle (Slavija Meydanı)",
        durationMin: 30,
        frequency: "Her 20 dakikada bir",
        priceEur: 3.5,
        pricingModel: "per_person",
        whereToBuy: "Otobüste şoföre nakit (400 RSD) veya temassız kartla",
        proTip: "Bavulunuz çoksa belediye otobüsü yerine A1 minibüsü doğrudan Slavija Meydanı'na daha hızlı ve konforlu indirir.",
      },
      {
        tier: "konforlu",
        mode: "🚕 Resmi Kuponlu Taksi / Yandex Go",
        name: "TAXI INFO Gişesi Sabit Fiyat / Yandex Go",
        durationMin: 22,
        frequency: "7/24 Anında",
        priceEur: 26,
        pricingModel: "per_vehicle",
        whereToBuy: "Bagaj alım çıkışındaki resmi 'TAXI INFO' bankosundan bölge fişi alarak (~3.000 RSD)",
        proTip: "Terminal önünde kolunuzdan tutan korsan taksicilere ASLA binmeyin; mutlaka içerideki TAXI INFO gişesinden sabit fiyat kuponu alın veya Yandex Go çağırın.",
      },
    ],
  },
  saraybosna: {
    airportName: "Saraybosna Uluslararası Havalimanı",
    airportCode: "SJJ",
    distanceKm: 9,
    options: [
      {
        tier: "tasarruflu",
        mode: "🚋 Yürüyüş + Dobrinja Troleybüs 103",
        name: "Dobrinja Durağı → Trg Austrije (Hat 103)",
        durationMin: 35,
        frequency: "Her 15 dakikada bir",
        priceEur: 1.0,
        pricingModel: "per_person",
        whereToBuy: "Büfeden 1.80 KM veya şoförden 2.00 KM nakit",
        proTip: "Sadece sırt çantanız varsa terminalden 700 metre yürüyüp Dobrinja'dan 103 nolu troleybüse binerek Başçarşı yakınına 1 €'ya gidebilirsiniz.",
      },
      {
        tier: "dengeli",
        mode: "🚌 Centrotrans Havalimanı Otobüsü",
        name: "Centrotrans Airport Bus (Baščaršija / Vijećnica)",
        durationMin: 25,
        frequency: "Uçuş saatlerine göre (45-60 dk)",
        priceEur: 2.6,
        pricingModel: "per_person",
        whereToBuy: "Otobüste şoföre 5 KM nakit veya kart",
        proTip: "Terminal çıkışının hemen önünden kalkar ve doğrudan Başçarşı (Vijećnica) önüne kadar gider.",
      },
      {
        tier: "konforlu",
        mode: "🚕 Sarajevo Taxi / Žuti Taxi",
        name: "Resmi Havalimanı Taksisi (Kapı Önü)",
        durationMin: 18,
        frequency: "7/24 Anında",
        priceEur: 13,
        pricingModel: "per_vehicle",
        whereToBuy: "Taksimetre ile (~25 KM) nakit Bosna Markı",
        proTip: "Havalimanı merkeze çok yakın olduğu için 2-4 kişiyseniz taksi kişi başı 3-4 €'ya gelir; en pratik seçenektir.",
      },
    ],
  },
  roma: {
    airportName: "Roma Fiumicino (Leonardo da Vinci)",
    airportCode: "FCO",
    distanceKm: 32,
    options: [
      {
        tier: "tasarruflu",
        mode: "🚌 Havalimanı Otobüsü (Terravision / SIT / TAM)",
        name: "Terravision / SIT Bus Shuttle → Roma Termini",
        durationMin: 50,
        frequency: "Her 20–30 dakikada bir",
        priceEur: 7,
        pricingModel: "per_person",
        whereToBuy: "Online veya Terminal 3 çıkışındaki otobüs peronlarından",
        proTip: "Roma'ya en ekonomik ulaşımdır (7 €); Vatikan bölgesinde kalıyorsanız SIT Bus Shuttle doğrudan Piazza Cavour'da da durur.",
      },
      {
        tier: "dengeli",
        mode: "🚆 Leonardo Express / Trenitalia Bölgesel",
        name: "Leonardo Express Kesintisiz Tren (Termini)",
        durationMin: 32,
        frequency: "Her 15 dakikada bir",
        priceEur: 14,
        pricingModel: "per_person",
        whereToBuy: "Havalimanı tren istasyonu otomatlarından veya temassız kartla turnikeden",
        proTip: "Trastevere veya Ostiense tarafında kalıyorsanız 14 €'luk Leonardo Express yerine 8 €'luk FL1 bölgesel trenine binin!",
      },
      {
        tier: "konforlu",
        mode: "🚕 Resmi Beyaz Belediye Taksisi (Sabit Tarife)",
        name: "Comune di Roma Resmi Taksi (Aureliano Surları İçi)",
        durationMin: 40,
        frequency: "7/24 Resmi Taksi Sırası",
        priceEur: 55,
        pricingModel: "per_vehicle",
        whereToBuy: "Terminal çıkışındaki resmi beyaz taksi kuyruğundan (Sabit 55 €)",
        proTip: "Roma merkezine (Aureliano surları içi) resmi beyaz taksi ücreti bagaj dahil kanunen SABİT 55 €'dur. Fazla isteyen olursa kapıdaki resmi tarifeyi gösterin.",
      },
    ],
  },
  paris: {
    airportName: "Paris Charles de Gaulle (CDG)",
    airportCode: "CDG",
    distanceKm: 26,
    options: [
      {
        tier: "tasarruflu",
        mode: "🚌 Belediye Otobüsü (Hat 350 / 351)",
        name: "RATP Hat 350 (Porte de la Chapelle) / 351 (Nation)",
        durationMin: 70,
        frequency: "Her 25 dakikada bir",
        priceEur: 4.3,
        pricingModel: "per_person",
        whereToBuy: "Navigo Easy kart veya Île-de-France Mobilités uygulaması",
        proTip: "Aceleniz yoksa RER treninin yarı fiyatına Paris merkezine ulaştırır.",
      },
      {
        tier: "dengeli",
        mode: "🚆 RER B Banliyö Treni",
        name: "RER B (Gare du Nord / Châtelet / Saint-Michel)",
        durationMin: 35,
        frequency: "Her 10–12 dakikada bir",
        priceEur: 11.8,
        pricingModel: "per_person",
        whereToBuy: "Bilet otomatları veya Bonjour RATP telefon uygulaması",
        proTip: "Biletinizi Paris merkezinde metrodan çıkana kadar ASLA atmayın; çıkış turnikesinde tekrar okutulur, yoksa 50 € ceza kesilir.",
      },
      {
        tier: "konforlu",
        mode: "🚕 Resmi Paris Taksisi (Sabit Tarife)",
        name: "Taxi Parisien (Sağ Yaka 56€ / Sol Yaka 65€)",
        durationMin: 45,
        frequency: "7/24 Resmi Taksi Durağı",
        priceEur: 60,
        pricingModel: "per_vehicle",
        whereToBuy: "Yerdeki mavi 'TAXI' çizgilerini takip ederek resmi duraktan",
        proTip: "CDG'den Paris Sağ Yaka (Opera/Marais) sabit 56 €, Sol Yaka (Eyfel/Saint-Germain) sabit 65 €'dur.",
      },
    ],
  },
  barselona: {
    airportName: "Barselona El Prat Havalimanı",
    airportCode: "BCN",
    distanceKm: 14,
    options: [
      {
        tier: "tasarruflu",
        mode: "🚆 R2 Nord Banliyö Treni veya TMB Otobüs 46",
        name: "Rodalies R2 Nord Treni (Passeig de Gràcia / Sants)",
        durationMin: 27,
        frequency: "Her 30 dakikada bir",
        priceEur: 4.6,
        pricingModel: "per_person",
        whereToBuy: "Terminal 2B tren istasyonu otomatlarından",
        proTip: "Terminal 2B'den kalkan R2 Nord treni hem çok hızlıdır hem de Plaça Espanya otobüsü (Hat 46 - 2.55€) ile birlikte en ekonomik yöntemdir.",
      },
      {
        tier: "dengeli",
        mode: "🚌 Aerobús A1 / A2 Ekspres (7/24)",
        name: "Aerobús → Plaça Espanya & Plaça Catalunya",
        durationMin: 35,
        frequency: "Her 5 dakikada bir (7/24)",
        priceEur: 7.25,
        pricingModel: "per_person",
        whereToBuy: "Duraktaki mavi otomatlardan veya şoförden temassız kartla",
        proTip: "Ücretsiz Wi-Fi ve USB şarj imkanı vardır; her 5 dakikada bir kalktığı için bekleme derdi olmaz.",
      },
      {
        tier: "konforlu",
        mode: "🚕 Resmi Siyah-Sarı Taksi / Cabify",
        name: "Barcelona Oficial Taxi / Cabify",
        durationMin: 22,
        frequency: "7/24 Anında",
        priceEur: 35,
        pricingModel: "per_vehicle",
        whereToBuy: "Terminal çıkışındaki resmi taksi sırası veya Cabify uygulaması",
        proTip: "3-4 kişilik gruplarda kişi başı ~8.5 €'ya gelir ve Aerobús biletine çok yakın bir fiyata otel kapısına bırakır.",
      },
    ],
  },
  budapeste: {
    airportName: "Budapeşte Ferenc Liszt Havalimanı",
    airportCode: "BUD",
    distanceKm: 20,
    options: [
      {
        tier: "tasarruflu",
        mode: "🚌 200E Otobüsü + M3 Metro",
        name: "BKK Hat 200E → Kőbánya-Kispest Metro",
        durationMin: 50,
        frequency: "Her 10 dakikada bir",
        priceEur: 2.3,
        pricingModel: "per_person",
        whereToBuy: "Budapest GO uygulaması veya mor BKK bilet otomatları",
        proTip: "72 saatlik BKK ulaşım kartı (14 €) aldıysanız 200E otobüsü ve M3 metrosu bu karta tamamen DAHİLDİR, ekstra para ödemezsiniz!",
      },
      {
        tier: "dengeli",
        mode: "🚌 100E Airport Express (Direkt Merkez)",
        name: "100E Direkt Otobüs (Kálvin tér / Astoria / Deák Ferenc tér)",
        durationMin: 35,
        frequency: "Her 7–10 dakikada bir (7/24)",
        priceEur: 5.6,
        pricingModel: "per_person",
        whereToBuy: "Otobüse binerken doğrudan temassız kredi kartınızı okutarak (2.200 HUF)",
        proTip: "Aktarma yapmadan doğrudan şehir kalbine (Deák Ferenc tér) indirir.",
      },
      {
        tier: "konforlu",
        mode: "🚕 Resmi Főtaxi / Bolt Uygulaması",
        name: "Főtaxi Havalimanı Kulübesi / Bolt",
        durationMin: 28,
        frequency: "7/24 Anında",
        priceEur: 28,
        pricingModel: "per_vehicle",
        whereToBuy: "Terminal çıkışındaki resmi Főtaxi kabininden fiş alarak veya Bolt ile",
        proTip: "Macaristan'da tüm resmi sarı taksilerin kilometre ücreti devlet tarafından sabitlenmiştir.",
      },
    ],
  },
  tiflis: {
    airportName: "Tiflis Uluslararası Havalimanı",
    airportCode: "TBS",
    distanceKm: 17,
    options: [
      {
        tier: "tasarruflu",
        mode: "🚌 Belediye Otobüsü (Hat 337)",
        name: "Yeşil Belediye Otobüsü №337 (Özgürlük Meydanı)",
        durationMin: 42,
        frequency: "Her 20 dakikada bir (07:00–23:00)",
        priceEur: 0.35,
        pricingModel: "per_person",
        whereToBuy: "Otobüste temassız banka/kredi kartınızı okutarak (Sadece 1 GEL!)",
        proTip: "Avrupa'nın en ucuz havalimanı transferidir (~12 ₺). Doğrudan Avlabari ve Özgürlük Meydanı'ndan (Rustaveli) geçer.",
      },
      {
        tier: "dengeli",
        mode: "🚕 Yandex Go / Bolt (Standart Ekonomi)",
        name: "Bolt / Yandex Go Mobil Uygulama",
        durationMin: 25,
        frequency: "3 Dakikada Kapıda",
        priceEur: 9,
        pricingModel: "per_vehicle",
        whereToBuy: "Havalimanı ücretsiz Wi-Fi'sine bağlanıp Bolt veya Yandex Go üzerinden",
        proTip: "Uygulama üzerinden çağırdığınızda ~25–30 GEL (9 €) tutar; terminal içindeki taksiciler ise 80–100 GEL ister!",
      },
      {
        tier: "konforlu",
        mode: "🚘 Bolt Comfort / Özel Karşılama",
        name: "Bolt Comfort / Bene Exclusive",
        durationMin: 22,
        frequency: "7/24 Anında",
        priceEur: 14,
        pricingModel: "per_vehicle",
        whereToBuy: "Bolt uygulaması (Comfort kategorisi)",
        proTip: "Gece geç saatteki uçuşlarda 14 €'ya doğrudan otelinizin kapısına lüks araçla ulaşabilirsiniz.",
      },
    ],
  },
};

export function getAirportTransfers(city: Pick<City, "id" | "name" | "iata" | "transportEur">): CityAirportTransferGuide {
  const expanded = expandedCity(city.id);
  if (expanded) return expandedTransfers(expanded);
  if (AIRPORT_TRANSFER_MAP[city.id]) {
    return AIRPORT_TRANSFER_MAP[city.id];
  }
  const code = city.iata || "INT";
  const baseBus = Math.max(1.5, Math.round(city.transportEur * 0.7 * 10) / 10);
  const baseExpress = Math.max(4, Math.round(city.transportEur * 1.8 * 10) / 10);
  const baseTaxi = Math.max(15, Math.round(city.transportEur * 7));

  return {
    airportName: `${city.name} Uluslararası Havalimanı`,
    airportCode: code,
    distanceKm: 18,
    options: [
      {
        tier: "tasarruflu",
        mode: "🚌 Belediye Otobüsü / Metro Hattı",
        name: `${city.name} Havalimanı Belediye Hattı → Şehir Merkezi`,
        durationMin: 45,
        frequency: "Her 20–30 dakikada bir",
        priceEur: baseBus,
        pricingModel: "per_person",
        whereToBuy: "Havalimanı bilet otomatları veya temassız kredi kartı",
        proTip: "Günlük/72 saatlik şehir içi toplu taşıma kartı alırsanız havalimanı belediye hattı genellikle karta dahildir.",
      },
      {
        tier: "dengeli",
        mode: "🚆 Airport Express Tren / Resmi Shuttle",
        name: `${city.name} Airport Express Shuttle → Ana İstasyon`,
        durationMin: 28,
        frequency: "Her 15–20 dakikada bir",
        priceEur: baseExpress,
        pricingModel: "per_person",
        whereToBuy: "Geliş terminali çıkışındaki resmi gişe veya online",
        proTip: "Bavul alanı geniş ve doğrudan merkez tren garına/meydana kesintisiz gittiği için en dengeli seçenektir.",
      },
      {
        tier: "konforlu",
        mode: "🚕 Resmi Taksi / Uber / Bolt",
        name: "Mobil Uygulama (Uber/Bolt) veya Resmi Havalimanı Taksisi",
        durationMin: 22,
        frequency: "7/24 Anında",
        priceEur: baseTaxi,
        pricingModel: "per_vehicle",
        whereToBuy: "Havalimanı ücretsiz Wi-Fi ile uygulama üzerinden veya resmi taksi sırasından",
        proTip: "3 veya 4 kişi seyahat ediyorsanız araç başı ücret bölündüğünde ekspres otobüsle neredeyse aynı fiyata kapı önüne gidersiniz.",
      },
    ],
  };
}

// 3. HEDİYELİK REHBERİ & TAX-FREE VERİTABANI
const SHOPPING_MAP: Record<string, CityShoppingGuide> = {
  belgrad: {
    taxFree: {
      available: true,
      minSpendEur: 52,
      minSpendLocalLabel: "6.000 RSD (Tek mağaza, aynı gün)",
      vatRatePercent: 20,
      netRefundPercent: 11.5,
      customsTip: "Nikola Tesla Havalimanı'nda bagajınızı vermeden ÖNCE Gidiş katındaki Gümrük (Carina) ofisinde ürünlerinizi gösterip Global Blue formunu mühürletin.",
    },
    souvenirs: [
      {
        id: "plazma",
        tier: "tasarruflu",
        name: "Bambi Plazma Bisküvi & Krem (Maxi/Idea Market)",
        category: "Yerel Atıştırmalık",
        avgEur: 2.5,
        whereToBuy: "Maxi veya Idea Süpermarketleri",
        description: "Sırbistan'ın ulusal efsanesi olan fındıklı/ballı bisküvi ve sürülebilir çikolatası.",
      },
      {
        id: "ajvar",
        tier: "tasarruflu",
        name: "Ev Yapımı Köz Biber Sosu (Bakina Tajna Ajvar)",
        category: "Yöresel Gurme",
        avgEur: 4.5,
        whereToBuy: "Zeleni Venac Pazarı veya Süpermarketler",
        description: "Balkanların havyarı sayılan közlenmiş kırmızı biber ezmesi; kahvaltı ve et yanına harika gider.",
      },
      {
        id: "pirot",
        tier: "dengeli",
        name: "Geleneksel Sırp Seramik & El İşi Hediyelikler",
        category: "El Sanatları",
        avgEur: 12,
        whereToBuy: "Knez Mihailova & Skadarlija Butikleri",
        description: "Otantik Balkan motifli el boyaması kahve fincanları ve bakır cezveler.",
      },
      {
        id: "koffein",
        tier: "dengeli",
        name: "Koffein / Pržionica Özel Kavrum Çekirdek Kahve",
        category: "Üçüncü Nesil Kahve",
        avgEur: 10,
        whereToBuy: "Dorćol Kahve Kavurmacıları",
        description: "Belgrad'ın ünlü üçüncü nesil kahvecilerinden taze kavrulmuş özel harman kahve paketleri.",
      },
      {
        id: "usce-fashion",
        tier: "konforlu",
        name: "Galerija Belgrade & Ušće AVM Tax-Free Alışverişi",
        category: "Moda & Kozmetik",
        avgEur: 65,
        whereToBuy: "Galerija Belgrade (Sava Kıyısı)",
        description: "Avrupa markalarında 6.000 RSD üzeri alışverişlerde ~%11.5 Tax-Free vergi iadesi avantajı.",
      },
      {
        id: "choco-handmade",
        tier: "konforlu",
        name: "Aguara Artizan El Yapımı Sırp Çikolata Kutusu",
        category: "Gurme Hediye",
        avgEur: 22,
        whereToBuy: "Stari Grad Gurme Çikolatacıları",
        description: "Kurutulmuş erik, frambuaz ve Balkan baharatlarıyla hazırlanan ödüllü el yapımı pralin kutusu.",
      },
    ],
  },
  saraybosna: {
    taxFree: {
      available: true,
      minSpendEur: 51,
      minSpendLocalLabel: "100 KM (Tek fişte)",
      vatRatePercent: 17,
      netRefundPercent: 11.0,
      customsTip: "Saraybosna Havalimanı'nda check-in öncesi gümrük bankosuna PDV-SL-2 formunuzu ve aldığınız ürünleri gösterip onaylatın.",
    },
    souvenirs: [
      {
        id: "zlatna",
        tier: "tasarruflu",
        name: "Zlatna Džezva & Brajlović Boşnak Kahvesi",
        category: "Geleneksel Kahve",
        avgEur: 3.5,
        whereToBuy: "Bingo / Mercator Market veya Başçarşı",
        description: "Saraybosna'nın meşhur çifte kavrulmuş geleneksel kahvesi ve yanında Rahat Lokum.",
      },
      {
        id: "suho-meso",
        tier: "tasarruflu",
        name: "Vakumlu Boşnak Kuru Eti (Suho Meso) & Kaymak",
        category: "Yöresel Lezzet",
        avgEur: 8,
        whereToBuy: "Gradska Tržnica (Kapalı Pazar Yeri)",
        description: "Kayın odunu dumanında kurutulmuş helal dana kuru et; uçak için vakumlatarak alabilirsiniz.",
      },
      {
        id: "kazandziluk",
        tier: "dengeli",
        name: "Kazandžiluk El İşlemesi Bakır Cezve & Fincan Takımı",
        category: "Geleneksel Zanaat",
        avgEur: 18,
        whereToBuy: "Başçarşı Bakırcılar Çarşısı (Kazandžiluk)",
        description: "Ustaların gözünüzün önünde üzerine isminizi işlediği el dövmesi orijinal Boşnak kahve takımı.",
      },
      {
        id: "bosnian-carpet",
        tier: "dengeli",
        name: "El Dokuması Minyatür Boşnak Kilimi & Yün Çorap",
        category: "Otantik Tekstil",
        avgEur: 15,
        whereToBuy: "Gazi Hüsrev Bey Bezisteni",
        description: "Geleneksel geometrik Boşnak motifli masa örtüleri ve doğal dağ yünü ürünler.",
      },
      {
        id: "sebilj-art",
        tier: "konforlu",
        name: "Bakır Kabartma Saraybosna Sebili Tablosu",
        category: "Sanat & Koleksiyon",
        avgEur: 45,
        whereToBuy: "Morića Han & Başçarşı Sanat Atölyeleri",
        description: "Sertifikalı bakır ustalarının el işçiliğiyle yaptığı çerçeveli Saraybosna rölyef tablosu.",
      },
      {
        id: "scc-shopping",
        tier: "konforlu",
        name: "Sarajevo City Center (SCC) & BBI Mağaza Alışverişi",
        category: "Moda & Parfüm",
        avgEur: 60,
        whereToBuy: "Marijin Dvor (SCC AVM)",
        description: "100 KM üzeri alışverişlerde %11 net vergi iadesiyle kozmetik ve giyim alışverişi.",
      },
    ],
  },
  roma: {
    taxFree: {
      available: true,
      minSpendEur: 70.01,
      minSpendLocalLabel: "70,01 € (İtalya yeni düşürülmüş alt limit!)",
      vatRatePercent: 22,
      netRefundPercent: 12.5,
      customsTip: "İtalya Tax-Free alt limitini 154 €'dan 70,01 €'ya düşürdü! Fiumicino Havalimanı'nda dijital 'OTELLO' kiosklarından pasaportunuzla hızlıca onay alabilirsiniz.",
    },
    souvenirs: [
      {
        id: "tazza-doro",
        tier: "tasarruflu",
        name: "Sant'Eustachio / Tazza d'Oro Çekirdek Kahve & Pistachio Krema",
        category: "Gurme Market",
        avgEur: 6.5,
        whereToBuy: "Pantheon Çevresi veya Conad / Todis Market",
        description: "Roma'nın tarihi kahvecilerinden espresso harmanı ve süpermarketlerden %40 ucuza alınan Antep fıstığı kreması.",
      },
      {
        id: "pasta-truffle",
        tier: "tasarruflu",
        name: "Trüf Mantarlı Zeytinyağı & Bronz Kesim Makarna",
        category: "İtalyan Mutfağı",
        avgEur: 7,
        whereToBuy: "Campo de' Fiori veya Yerel Enoteca'lar",
        description: "Siyah trüf aromalı sızma zeytinyağı ve kurutulmuş Porcini mantarı paketleri.",
      },
      {
        id: "bialetti",
        tier: "dengeli",
        name: "Orijinal Bialetti Moka Pot (İtalyan Bayraklı Serisi)",
        category: "Kahve Ekipmanı",
        avgEur: 26,
        whereToBuy: "Via del Corso Bialetti Mağazası",
        description: "Evde gerçek İtalyan espressosu yapmak için ömürlük ikonik sekizgen Moka cezvesi.",
      },
      {
        id: "kiko-marvis",
        tier: "dengeli",
        name: "KIKO Milano Kozmetik & Marvis Diş Macunu Seti",
        category: "İtalyan Kozmetik",
        avgEur: 18,
        whereToBuy: "Via del Corso & İtalyan Eczaneleri",
        description: "İtalya'da Türkiye fiyatının neredeyse yarısına satılan KIKO ürünleri ve Floransa üretimi Marvis setleri.",
      },
      {
        id: "leather-bag",
        tier: "konforlu",
        name: "El Yapımı Hakiki İtalyan Deri Çanta & Kemer",
        category: "İtalyan Deri Zanaatı",
        avgEur: 85,
        whereToBuy: "Rione Monti & Via dei Coronari Deri Atölyeleri",
        description: "70 € üzeri olduğu için doğrudan Tax-Free (%12.5 vergi iadesi) kapsamına giren hakiki deri ürünler.",
      },
      {
        id: "castel-romano",
        tier: "konforlu",
        name: "Castel Romano Designer Outlet / Rinascente Alışverişi",
        category: "Lüks & Tasarım",
        avgEur: 120,
        whereToBuy: "Via del Tritone Rinascente veya Castel Romano",
        description: "İtalyan moda markalarında hem sezon indirimi hem de havalimanında nakit Tax-Free iadesi.",
      },
    ],
  },
};

export function getShoppingAndTaxFree(city: Pick<City, "id" | "name" | "country" | "currencyCode">): CityShoppingGuide {
  const expanded = expandedCity(city.id);
  if (expanded) return expandedShopping(expanded);
  if (SHOPPING_MAP[city.id]) {
    return SHOPPING_MAP[city.id];
  }

  return {
    taxFree: {
      available: true,
      minSpendEur: 75,
      minSpendLocalLabel: `~75 € (${city.currencyCode || "EUR"} karşılığı tek mağaza fişi)`,
      vatRatePercent: 20,
      netRefundPercent: 11.5,
      customsTip: `${city.name} Havalimanı'nda dönüş uçuşunda valizinizi kontuara teslim etmeden ÖNCE Tax-Free / Gümrük bankosuna uğrayıp formunuzu mühürletin.`,
    },
    souvenirs: [
      {
        id: "local-market",
        tier: "tasarruflu",
        name: `${city.name} Yerel Süpermarket Kahvesi, Çikolata & Baharatları`,
        category: "Süpermarket Keşfi",
        avgEur: 4,
        whereToBuy: "Şehir Merkezindeki Yerel Süpermarketler (Lidl / DM / Carrefour)",
        description: `Turistik dükkanlar yerine yerel halkın alışveriş yaptığı marketlerden yarı fiyatına yöresel çikolata, bisküvi ve soslar.`,
      },
      {
        id: "magnet-ceramic",
        tier: "tasarruflu",
        name: "El Boyaması Seramik Magnet & Kartpostal Seti",
        category: "Klasik Hediyelik",
        avgEur: 3.5,
        whereToBuy: "Eski Şehir Ara Sokak Tezgahları",
        description: "Ana meydanın bir arka sokağındaki atölyelerden çok daha uygun fiyata alınan el yapımı hatıralar.",
      },
      {
        id: "artisan-craft",
        tier: "dengeli",
        name: `${city.name} Geleneksel El Sanatları & Otantik Kahve/Çay Seti`,
        category: "Yöresel Zanaat",
        avgEur: 16,
        whereToBuy: "Tarihi Çarşı & Tasarım Pazarı",
        description: `${city.country} kültürüne özgü el işçiliği seramik, tekstil veya özel kavrum kahve kutuları.`,
      },
      {
        id: "local-cosmetics",
        tier: "dengeli",
        name: "Yerel Doğal Kozmetik & Eczane Markaları",
        category: "Bakım & Kozmetik",
        avgEur: 18,
        whereToBuy: "Merkez Eczaneler & Kozmetik Mağazaları",
        description: "Ülkeye özgü doğal içerikli cilt bakım kremleri, sabunlar ve parfümler.",
      },
      {
        id: "deli-hamper",
        tier: "konforlu",
        name: "Vakumlu Gurme Peynir, Sos & Şarküteri Hediye Kutusu",
        category: "Gurme Koleksiyon",
        avgEur: 38,
        whereToBuy: "Tarihi Kapalı Pazar & Gurme Şarküteriler",
        description: "Uçak bagajına uygun vakumlanmış yöresel peynirler, trüf sosları ve özel üretim lezzetler.",
      },
      {
        id: "taxfree-brand",
        tier: "konforlu",
        name: `${city.name} Tasarım Mağaza & Outlet Alışverişi (Tax-Free)`,
        category: "Moda & Tasarım",
        avgEur: 95,
        whereToBuy: "Ana Alışveriş Caddesi & Outlet Merkezleri",
        description: "Tax-Free alt limitini geçerek havalimanında ~%11.5 nakit vergi iadesi alabileceğiniz mağaza alışverişi.",
      },
    ],
  };
}

// 4. INSTAGRAM & ALTIN SAAT (GOLDEN HOUR) FOTOĞRAF NOKTALARI
const PHOTO_SPOTS_MAP: Record<string, PhotoSpot[]> = {
  belgrad: [
    {
      id: "kalemegdan-pobednik",
      name: "Kalemegdan Kalesi & Pobednik (Tuna-Sava Birleşimi)",
      bestTime: "🌇 Altın Saat / Gün Batımı",
      costEur: 0,
      angleTip: "Pobednik heykelinin solundaki taş korkuluklardan Sava ve Tuna nehirlerinin birleştiği noktayı gün batımı kızıllığında geniş açıyla çekin.",
      vibe: "Panoramik Nehir & Kale Manzarası",
      lat: 44.8231,
      lon: 20.4479,
    },
    {
      id: "gardos-tower",
      name: "Zemun Gardoš Kulesi & Kiremit Çatılar",
      bestTime: "🌇 Altın Saat / Gün Batımı",
      costEur: 2.5,
      angleTip: "Arnavut kaldırımlı dar Sinđelićeva sokağından yukarı çıkarken kuleyi kadrajın ortasına alın; tepeden kırmızı çatıları ve Tuna'yı fotoğraflayın.",
      vibe: "Avusturya-Macaristan Kasaba Dokusu",
      lat: 44.8484,
      lon: 20.4096,
    },
    {
      id: "sava-temple",
      name: "Aziz Sava Katedrali (Hram Svetog Save) & Altın Mozaik Mahzen",
      bestTime: "🌅 Sabah Erken (Kalabalıksız)",
      costEur: 0,
      angleTip: "Dış çekimde fıskiyeli havuzun yansımasını kullanın; içeride ise bir kat aşağıdaki altın varaklı yeraltı kriptasını (Crypt) mutlaka çekin.",
      vibe: "Devasa Mimari & Altın Mozaikler",
      lat: 44.7981,
      lon: 20.4685,
    },
    {
      id: "skadarlija-street",
      name: "Skadarlija Bohem Sokağı & Çiçekli Kafanalar",
      bestTime: "🌃 Mavi Saat & Gece",
      costEur: 0,
      angleTip: "Sokağın sarı sokak lambaları yandığında Tri Šešira ve Dva Jelena tabelalarının önünden hafif aşağı açıyla bohem sokak perspektifi yakalayın.",
      vibe: "Tarihi Bohem Sokak & Işıklar",
      lat: 44.8178,
      lon: 20.4646,
    },
  ],
  saraybosna: [
    {
      id: "zuta-tabija",
      name: "Sarı Tabya (Žuta Tabija) Panoramik Seyir Tepesi",
      bestTime: "🌇 Altın Saat / Gün Batımı",
      costEur: 0,
      angleTip: "Güneş vadinin arkasından batarken tüm Saraybosna minarelerini ve kırmızı çatılarını tek kareye sığdırın.",
      vibe: "360° Saraybosna Vadisi Manzarası",
      lat: 43.8617,
      lon: 18.4375,
    },
    {
      id: "sebilj-morning",
      name: "Başçarşı Sebil Meydanı & Güvercinler",
      bestTime: "🌅 Sabah Erken (Kalabalıksız)",
      costEur: 0,
      angleTip: "Sabah 08:00 civarında meydan boşken ahşap Osmanlı Sebili'ni ve havalanan güvercinleri seri çekim (burst) modunda yakalayın.",
      vibe: "İkonik Osmanlı Meydanı",
      lat: 43.8597,
      lon: 18.4313,
    },
    {
      id: "vijecnica-bridge",
      name: "Tarihi Milli Kütüphane (Vijećnica) & Шехер-Ћехајина Köprüsü",
      bestTime: "🌃 Mavi Saat & Gece",
      costEur: 5,
      angleTip: "Dış cepheyi Miljacka Nehri'nin karşı kıyısındaki taş köprüden çekin; içeride ise vitray kubbenin altından yukarıya doğru simetrik kadraj alın.",
      vibe: "Endülüs-Mağribi Mimarisi",
      lat: 43.8591,
      lon: 18.4334,
    },
    {
      id: "latin-bridge",
      name: "Latin Köprüsü & Miljacka Nehri Yansıması",
      bestTime: "☀️ Öğle Işığı",
      costEur: 0,
      angleTip: "Nehir kenarındaki taş yürüyüş yolundan kemerli köprüyü ve arkasındaki renkli Avusturya-Macaristan binalarını kadraja alın.",
      vibe: "Tarihi Taş Köprü",
      lat: 43.8576,
      lon: 18.4289,
    },
  ],
  roma: [
    {
      id: "colosseum-bridge",
      name: "Kolezyum En İyi Açı: Via Nicola Salvi Üst Terası",
      bestTime: "🌅 Sabah Erken (Kalabalıksız)",
      costEur: 0,
      angleTip: "Kalabalık alt meydan yerine Colle Oppio metro çıkışının üstündeki alçak taş duvara oturun; tüm Kolezyum tam arkanızda kusursuz çıkar!",
      vibe: "İkonik Antik Roma Kadrajı",
      lat: 41.8914,
      lon: 12.4915,
    },
    {
      id: "pincio-terrace",
      name: "Terrazza del Pincio (Piazza del Popolo Üstü)",
      bestTime: "🌇 Altın Saat / Gün Batımı",
      costEur: 0,
      angleTip: "Güneş tam Aziz Petrus Bazilikası'nın kubbesinin arkasından batarken Piazza del Popolo meydanını yukarıdan fotoğraflayın.",
      vibe: "Romantik Gün Batımı Terası",
      lat: 41.9113,
      lon: 12.4779,
    },
    {
      id: "sant-angelo-bridge",
      name: "Ponte Sant'Angelo (Melekler Köprüsü & Tiber Nehri)",
      bestTime: "🌃 Mavi Saat & Gece",
      costEur: 0,
      angleTip: "Köprünün üzerindeki Bernini melek heykellerini ön plana, ışıklandırılmış Castel Sant'Angelo kalesini arka plana alın.",
      vibe: "Barok Heykeller & Nehir",
      lat: 41.9018,
      lon: 12.4664,
    },
    {
      id: "aventino-keyhole",
      name: "Aventino Tepesi Anahtar Deliği & Portakal Bahçesi",
      bestTime: "☀️ Öğle Işığı",
      costEur: 0,
      angleTip: "Giardino degli Aranci'de çam ağaçları arasından kubbeyi çekin, hemen yanındaki Malta Şövalyeleri kapısının anahtar deliğinden Vatikan'ı kadrajlayın.",
      vibe: "Gizli Panoramik Bahçe",
      lat: 41.8829,
      lon: 12.4802,
    },
  ],
};

export function getPhotoSpots(city: Pick<City, "id" | "name" | "lat" | "lon">): PhotoSpot[] {
  const expanded = expandedCity(city.id);
  if (expanded) return expandedPhotos(expanded);
  if (PHOTO_SPOTS_MAP[city.id]) {
    return PHOTO_SPOTS_MAP[city.id];
  }
  return [
    {
      id: `${city.id}-viewpoint`,
      name: `${city.name} Tarihi Kale / Panoramik Seyir Tepesi`,
      bestTime: "🌇 Altın Saat / Gün Batımı",
      costEur: 0,
      angleTip: "Güneş batmadan 45 dakika önce tepeye çıkın; şehir silüetini ve tarihi kubbeleri sıcak yan ışıkta geniş açıyla fotoğraflayın.",
      vibe: "360° Panoramik Şehir Manzarası",
      lat: city.lat + 0.0045,
      lon: city.lon - 0.0035,
    },
    {
      id: `${city.id}-oldtown`,
      name: `${city.name} Eski Şehir Ana Meydanı & Arnavut Kaldırımlı Sokaklar`,
      bestTime: "🌅 Sabah Erken (Kalabalıksız)",
      costEur: 0,
      angleTip: "Sabah 08:00–09:00 arasında turist grupları gelmeden meydandaki tarihi cepheleri ve sokak perspektifini çekin.",
      vibe: "Tarihi Mimari & Sokak Dokusu",
      lat: city.lat + 0.0012,
      lon: city.lon + 0.0018,
    },
    {
      id: `${city.id}-bridge`,
      name: `${city.name} Tarihi Köprü & Nehir/Sahil Yansıması`,
      bestTime: "🌃 Mavi Saat & Gece",
      costEur: 0,
      angleTip: "Akşam ışıklar yeni yandığında (Mavi Saat) su kenarındaki korkuluklardan uzun pozlama veya Gece Modu ile yansımaları yakalayın.",
      vibe: "Gece Işıkları & Su Yansıması",
      lat: city.lat - 0.0028,
      lon: city.lon + 0.0031,
    },
    {
      id: `${city.id}-cafe`,
      name: `${city.name} Bohem Sanat Sokağı & Teras Kafeler`,
      bestTime: "☀️ Öğle Işığı",
      costEur: 0,
      angleTip: "Renkli bina cephelerini ve çiçekli balkonları portre (2x) modunda arka planı hafif bulanıklaştırarak çekin.",
      vibe: "Bohem & Renkli Sokaklar",
      lat: city.lat - 0.0019,
      lon: city.lon - 0.0042,
    },
  ];
}

// 5. İNTERNET (eSIM / YEREL SIM / ROAMING), MUSLUK SUYU & PRİZ REHBERİ
export function getConnectivityInfo(city: Pick<City, "id" | "name" | "country" | "visaType">): CityConnectivityGuide {
  const expanded = expandedCity(city.id);
  if (expanded) return expandedConnectivity(expanded);
  const id = city.id.toLowerCase();

  if (id === "belgrad") {
    return {
      esimName: "Airalo 'kiši' / Mobimatter Sırbistan eSIM",
      esimDataLabel: "5 GB (30 Gün)",
      esimPriceEur: 9.5,
      localSimName: "Yettel / A1 Tourist Prepaid SIM",
      localSimDataLabel: "15 GB (15 Gün)",
      localSimPriceEur: 5.5,
      whereToBuySim: "Havalimanı çıkışı veya Knez Mihailova üzerindeki Moj Kiosk büfeleri (Pasaport gerekir)",
      trRoamingDailyTry: 320,
      tapWater: {
        drinkable: true,
        statusLabel: "✅ Musluk Suyu & Sokak Çeşmeleri İçilebilir",
        detail: "Belgrad'da musluk suyu ve Knez Mihailova üzerindeki tarihi Delijska Çeşmesi'nin suyu güvenle içilebilir.",
      },
      plug: {
        types: "Tip C & Tip F (İki Yuvarlak Uçlu)",
        voltage: "230V / 50Hz",
        adapterNeeded: false,
        detail: "Türkiye'deki prizlerle %100 aynıdır; dönüştürücü adaptör taşımanıza gerek yoktur.",
      },
      essentialApps: [
        { name: "Yandex Go / CarGo", purpose: "Belgrad'da taksi çağırmak için en güvenli ve sabit fiyatlı uygulama" },
        { name: "Moovit", purpose: "Ücretsiz belediye otobüs ve tramvay saatlerini canlı takip etme" },
        { name: "Google Translate", purpose: "Sırpça Kiril alfabesi tabelalarını kamerayla anında Türkçeye çevirme" },
      ],
    };
  }

  if (id === "londra") {
    return {
      esimName: "Airalo 'Ukiyo' / BNESIM İngiltere eSIM",
      esimDataLabel: "5 GB (30 Gün)",
      esimPriceEur: 8.5,
      localSimName: "Giffgaff / Voxi / Lebara UK Tourist SIM",
      localSimDataLabel: "20 GB (30 Gün)",
      localSimPriceEur: 11.5,
      whereToBuySim: "Havalimanı WHSmith marketleri veya merkezdeki Sainsbury's / Tesco Express",
      trRoamingDailyTry: 350,
      tapWater: {
        drinkable: true,
        statusLabel: "✅ Musluk Suyu İçilebilir (Restoranlarda Ücretsiz 'Tap Water')",
        detail: "Londra'da tüm restoranlarda 'Can we have some tap water?' diyerek ücretsiz sürahi su isteyebilirsiniz.",
      },
      plug: {
        types: "Tip G (3 Köşeli İngiliz Prizi)",
        voltage: "230V / 50Hz",
        adapterNeeded: true,
        detail: "⚠️ DİKKAT: İngiltere'de 3 girişli Tip G priz kullanılır! Gitmeden önce mutlaka İngiliz priz dönüştürücü adaptör alın.",
      },
      essentialApps: [
        { name: "Citymapper", purpose: "Londra metrosu, otobüsleri ve yürüyüş rotaları için en kusursuz uygulama" },
        { name: "TfL Go", purpose: "Resmi Londra ulaşım haritası ve hat durumu" },
        { name: "Uber / Bolt", purpose: "Gece ulaşımı ve havalimanı transferi" },
      ],
    };
  }

  if (id === "tokyo") {
    return {
      esimName: "Ubigi / Airalo 'Moshi Moshi' Japonya eSIM",
      esimDataLabel: "10 GB (30 Gün)",
      esimPriceEur: 14,
      localSimName: "Sakura Mobile / BIC Camera Tourist SIM",
      localSimDataLabel: "Sınırsız / 10 GB (15 Gün)",
      localSimPriceEur: 19,
      whereToBuySim: "Narita/Haneda Havalimanı otomatları veya şehirdeki BIC Camera mağazaları",
      trRoamingDailyTry: 350,
      tapWater: {
        drinkable: true,
        statusLabel: "✅ Musluk Suyu %100 Güvenle İçilebilir",
        detail: "Japonya'da musluk suyu dünyanın en temiz sularından biridir ve tüm restoranlarda su/yeşil çay ücretsiz ikram edilir.",
      },
      plug: {
        types: "Tip A & Tip B (Yassı İki Uçlu Amerikan Tipi)",
        voltage: "100V / 50-60Hz",
        adapterNeeded: true,
        detail: "⚠️ DİKKAT: Japonya'da yassı iki uçlu (Tip A) priz ve 100V kullanılır! Yanınızda mutlaka Tip A priz dönüştürücü götürün.",
      },
      essentialApps: [
        { name: "Google Maps & Japan Travel by NAVITIME", purpose: "Tren peron numarası ve hangi vagona binileceğini gösterir" },
        { name: "Welcome Suica / Pasmo (Apple Wallet)", purpose: "Metro ve 7-Eleven marketlerde temassız ödeme" },
        { name: "GO Taxi / Uber", purpose: "Japonya'da taksi çağırma" },
      ],
    };
  }

  return {
    esimName: `Airalo / Mobimatter ${city.country} eSIM Paketi`,
    esimDataLabel: "5 GB (15–30 Gün)",
    esimPriceEur: 9,
    localSimName: `${city.country} Yerel Operatör Turist SIM Kartı`,
    localSimDataLabel: "15 GB (15 Gün)",
    localSimPriceEur: 10,
    whereToBuySim: "Şehir merkezindeki resmi operatör bayileri veya büfeler (Havalimanı gişeleri %40 daha pahalı olabilir)",
    trRoamingDailyTry: 320,
    tapWater: {
      drinkable: true,
      statusLabel: "✅ Şehir Çeşmeleri & Arıtılmış Musluk Suyu Uygun",
      detail: `${city.name} merkezindeki halka açık içme suyu çeşmelerinden mataranızı ücretsiz doldurabilirsiniz; hassas mideler için marketten 0.50 €'ya su alınabilir.`,
    },
    plug: {
      types: "Tip C & Tip F (Avrupa Standart Prizi)",
      voltage: "230V / 50Hz",
      adapterNeeded: false,
      detail: "Türkiye'deki şarj aletleri ve prizlerle %100 uyumludur; ekstra adaptör gerekmez.",
    },
    essentialApps: [
      { name: "Google Maps (Çevrimdışı Harita)", purpose: `Gitmeden önce ${city.name} haritasını çevrimdışı (offline) indirin` },
      { name: "Bolt / Uber / Yandex Go", purpose: "Taksi dolandırıcılığından korunmak ve sabit fiyat görmek için" },
      { name: "Moovit / Rome2Rio", purpose: "Otobüs, tramvay ve metro hatlarını canlı takip etmek için" },
    ],
  };
}

// 6. "ŞU AN 2 SAAT BOŞ VAKTİM VAR, NE YAPAYIM?" ANLIK ÖNERİ MOTORU
export function getSpontaneousIdeas(city: Pick<City, "id" | "name" | "lat" | "lon">): SpontaneousIdea[] {
  const expanded = expandedCity(city.id);
  if (expanded) return expandedIdeas(expanded);
  const id = city.id.toLowerCase();

  if (id === "belgrad") {
    return [
      {
        id: "bg-kahve",
        mood: "kahve",
        title: "Dorćol 'Kafeterija Magazin 1907'de 3. Nesil Kahve & Tatlı Molası",
        duration: "1.5 Saat",
        costEur: 5.5,
        neighborhood: "Dorćol / Kralja Petra",
        description: "Tarihi çok katlı bir mağaza binasında dünyanın dört bir yanından kahveleri tadıp dinlenebileceğiniz en keyifli durak.",
        lat: 44.8198,
        lon: 20.4545,
      },
      {
        id: "bg-yagmur",
        mood: "yagmur",
        title: "Nikola Tesla Müzesi'nde Canlı Yıldırım Deneyi & Sırp Ulusal Müzesi",
        duration: "2 Saat",
        costEur: 6.8,
        neighborhood: "Vračar / Trg Republike",
        description: "Yağmur başladığında kapalı alanda Tesla'nın orijinal bobinleriyle yapılan interaktif elektrik gösterisine katılın.",
        lat: 44.8051,
        lon: 20.4707,
      },
      {
        id: "bg-sokak",
        mood: "sokak-lezzeti",
        title: "Pekara Trpković'te Sıcak Boşnak Böreği veya Bucko'da Salatalı Pizza",
        duration: "45 Dakika",
        costEur: 3.5,
        neighborhood: "Slavija / Francuska",
        description: "Belgradlıların önünde sıra olduğu fırından çıtır peynirli/etli börek veya üzeri sığır salatalı meşhur dilim pizza.",
        lat: 44.8029,
        lon: 20.4662,
      },
      {
        id: "bg-manzara",
        mood: "manzara",
        title: "Sava Promenada & Beton Hala Nehir Kenarı Gün Batımı Yürüyüşü",
        duration: "1.5 Saat",
        costEur: 0,
        neighborhood: "Savamala / Nehir Kıyısı",
        description: "Kalemegdan'ın altındaki Beton Hala'dan başlayarak Sava Nehri kıyısı boyunca gün batımında tamamen ücretsiz yürüyüş.",
        lat: 44.8192,
        lon: 20.4488,
      },
      {
        id: "bg-gizli",
        mood: "gizli-kesif",
        title: "Cetinjska 15 Eski Bira Fabrikası Sanat & Kafe Avlusu",
        duration: "1.5 Saat",
        costEur: 4,
        neighborhood: "Stari Grad / Cetinjska",
        description: "Turistlerin pek bilmediği, eski bir fabrikanın sokak sanatı galerileri ve butik kafelere dönüştürüldüğü alternatif avlu.",
        lat: 44.8169,
        lon: 20.4661,
      },
    ];
  }

  return [
    {
      id: `${city.id}-kahve`,
      mood: "kahve",
      title: `${city.name} Tarihi Meydan Yan Sokağında Butik Kahve & Yöresel Tatlı Molası`,
      duration: "1.5 Saat",
      costEur: 5,
      neighborhood: "Eski Şehir Ara Sokakları",
      description: `Turistik ana meydanın bir sokak arkasındaki yerel kavurmacıda kahvenizi ve şehrin meşhur tatlısını tadarak ayaklarınızı dinlendirin.`,
      lat: city.lat + 0.0015,
      lon: city.lon - 0.0015,
    },
    {
      id: `${city.id}-yagmur`,
      mood: "yagmur",
      title: `${city.name} Tarihi Kapalı Çarşısı, Pasajlar & Ulusal Sanat Galerisi`,
      duration: "2 Saat",
      costEur: 6,
      neighborhood: "Merkez Kültür Bölgesi",
      description: `Yağmurlu veya soğuk havada tarihi kapalı pazar yerini, pasajları ve ulusal müzeyi gezerek vaktinizi verimli değerlendirin.`,
      lat: city.lat - 0.0012,
      lon: city.lon + 0.0021,
    },
    {
      id: `${city.id}-sokak`,
      mood: "sokak-lezzeti",
      title: `${city.name} Geleneksel Fırın & Sokak Lezzeti Tadım Turu`,
      duration: "1 Saat",
      costEur: 4,
      neighborhood: "Yerel Pazar Çevresi",
      description: `Yerel halkın öğle arasında tercih ettiği tarihi fırın ve sokak tezgahlarında sıcak yöresel atıştırmalıkları deneyin.`,
      lat: city.lat + 0.0022,
      lon: city.lon + 0.0014,
    },
    {
      id: `${city.id}-manzara`,
      mood: "manzara",
      title: `${city.name} Panoramik Nehir/Sahil Kordonu & Seyir Terası Yürüyüşü`,
      duration: "1.5 Saat",
      costEur: 0,
      neighborhood: "Panoramik Kordon / Tepe",
      description: `Tamamen ücretsiz olarak nehir/sahil hattında yürüyüş yapıp gün batımı ışığında şehrin silüetini izleyin.`,
      lat: city.lat + 0.0038,
      lon: city.lon - 0.0028,
    },
    {
      id: `${city.id}-gizli`,
      mood: "gizli-kesif",
      title: `${city.name} Bohem Sanat Mahallesi, Antikacılar & Gizli Avlular`,
      duration: "2 Saat",
      costEur: 0,
      neighborhood: "Bohem Sanat Mahallesi",
      description: `Klasik turist rotalarının dışına çıkarak duvar resimleriyle dolu ara sokakları, plakçıları ve gizli avluları keşfedin.`,
      lat: city.lat - 0.0025,
      lon: city.lon - 0.0032,
    },
  ];
}

// 7. "BURAYA KADAR GELMİŞKEN..." GÜNÜBİRLİK YAKIN ŞEHİR ROTALARI
const DAY_TRIPS_MAP: Record<string, NearbyDayTrip[]> = {
  belgrad: [
    {
      id: "novi-sad",
      destination: "Novi Sad & Petrovaradin Kalesi",
      badge: "🔥 En Popüler Günübirlik Rota",
      transportType: "🚆 Soko Hızlı Treni (Beograd Centar - Prokop)",
      durationOneWay: "36 Dakika",
      roundTripEur: 9.5,
      highlights: "Tuna kıyısındaki Petrovaradin Saat Kulesi, pastel renkli Özgürlük Meydanı (Trg Slobode) ve Zmaj Jovina Caddesi.",
      proTip: "Srbija Voz uygulamasından 'Soko' hızlı tren biletini online alın; sadece 36 dakikada 200 km/s hızla Novi Sad merkezine indirir!",
    },
    {
      id: "sremski-karlovci",
      destination: "Sremski Karlovci (Barok Kasaba)",
      badge: "🏛️ Karlofça Antlaşması Kasabası",
      transportType: "🚆 Bölgesel Tren veya Novi Sad Otobüsü",
      durationOneWay: "28 Dakika",
      roundTripEur: 6,
      highlights: "1699 Karlofça Antlaşması'nın imzalandığı Barış Şapeli (Kapela Mira), Dört Aslanlı Çeşme ve ünlü Kuglof kekleri.",
      proTip: "Novi Sad'a giderken aynı tren hattı üzerinde olduğu için sabah 2 saat Sremski Karlovci, öğleden sonra Novi Sad şeklinde birleştirebilirsiniz.",
    },
    {
      id: "zemun-ada",
      destination: "Zemun Gardoš & Ada Ciganlija Gölü",
      badge: "🦢 Tuna Kıyısı & Doğa",
      transportType: "🚌 Belediye Otobüsü Hat 84 / 15 (Ücretsiz)",
      durationOneWay: "20 Dakika",
      roundTripEur: 0,
      highlights: "Tuna kıyısında kuğuları besleme, balık restoranları (Šaran) ve Milenyum Kulesi.",
      proTip: "Belediye otobüsleri ücretsiz olduğu için Zeleni Venac'tan 84 nolu otobüsle 0 €'ya gidebilirsiniz.",
    },
  ],
  saraybosna: [
    {
      id: "mostar-blagaj",
      destination: "Mostar Köprüsü & Blagaj Alperenler Tekkesi",
      badge: "🌉 Mutlaka Görülmesi Gereken Rota",
      transportType: "🚆 ŽFBH Panoramik Tren",
      durationOneWay: "1 Saat 55 Dakika",
      roundTripEur: 12,
      highlights: "UNESCO mirası Mostar Köprüsü, Koski Mehmed Paşa Camii, Neretva Nehri ve Buna kaynağı kenarındaki Blagaj Tekkesi.",
      proTip: "Sabah 07:15 Saraybosna-Mostar treni Avrupa'nın en güzel manzaralı tren hatlarından biridir; gidişte sol, dönüşte sağ pencere kenarına oturun!",
    },
    {
      id: "travnik-jajce",
      destination: "Vezirler Şehri Travnik & Jajce Şelalesi",
      badge: "🏰 Osmanlı Mirası & Şelale",
      transportType: "🚌 Centrotrans Otobüs / Günübirlik Tur",
      durationOneWay: "1 Saat 30 Dakika",
      roundTripEur: 14,
      highlights: "Plava Voda (Mavi Su) kaynağı, Travnik Kalesi, Lutvina Kahvesi ve Hariš'te meşhur Travnik Ćevapi.",
      proTip: "Plava Voda kaynağının hemen yanındaki dere üstü çardaklarda közde pişmiş Boşnak kahvesi içmeden dönmeyin.",
    },
  ],
  roma: [
    {
      id: "tivoli-villas",
      destination: "Tivoli: Villa d'Este & Hadrianus Villası",
      badge: "⛲ 500 Çeşmeli Rönesans Bahçesi",
      transportType: "🚆 Trenitalia Bölgesel Tren (Roma Tiburtina)",
      durationOneWay: "45 Dakika",
      roundTripEur: 6,
      highlights: "UNESCO mirası Villa d'Este'nin su orgları ve dev şelale çeşmeleri ile İmparator Hadrianus'un antik saray kompleksi.",
      proTip: "Roma'nın sıcak ve kalabalık günlerinde su sesleri ve serin bahçeleriyle en ferahlatıcı günübirlik kaçamaktır.",
    },
    {
      id: "florence-day",
      destination: "Floransa (Rönesans'ın Kalbi)",
      badge: "🎨 Hızlı Trenle Günübirlik",
      transportType: "🚄 Frecciarossa / Italo Hızlı Tren (Roma Termini)",
      durationOneWay: "1 Saat 25 Dakika",
      roundTripEur: 38,
      highlights: "Duomo Katedrali, Ponte Vecchio Köprüsü, Uffizi ve Piazzale Michelangelo tepesi.",
      proTip: "Biletinizi Italo veya Trenitalia'dan 2 hafta önce alırsanız tek yön 16–19 €'ya düşer; sadece 85 dakikada Floransa merkezdesiniz!",
    },
    {
      id: "ostia-antica",
      destination: "Ostia Antica (Roma'nın Mini Pompeii'si)",
      badge: "🏛️ 1,5 € Metro Biletiyle Antik Şehir",
      transportType: "🚇 Metromare Treni (Piramide İstasyonu)",
      durationOneWay: "30 Dakika",
      roundTripEur: 3,
      highlights: "Antik Roma liman kenti, sağlam kalmış antik tiyatro, taban mozaikleri ve fıstık çamlı yürüyüş yolları.",
      proTip: "Normal 1.50 €'luk Roma şehir içi metro bileti (veya 72 saatlik Roma Pass) Ostia Antica treninde geçerlidir!",
    },
  ],
};

export function getNearbyDayTrips(city: Pick<City, "id" | "name" | "country">): NearbyDayTrip[] {
  const expanded = expandedCity(city.id);
  if (expanded) return expandedDayTrips(expanded);
  if (DAY_TRIPS_MAP[city.id]) {
    return DAY_TRIPS_MAP[city.id];
  }
  return [
    {
      id: `${city.id}-daytrip-1`,
      destination: `${city.name} Çevresi Tarihi Kasaba & Doğa Rotası`,
      badge: "🚆 Trenle 45 Dakika",
      transportType: "🚆 Bölgesel Tren / Ekspres Otobüs",
      durationOneWay: "45 Dakika",
      roundTripEur: 10,
      highlights: `${city.name} merkezine çok yakın korunmuş tarihi kasaba meydanı, nehir/göl kıyısı yürüyüş parkuru ve yerel çiftlik restoranları.`,
      proTip: "Merkez tren garından sabah 09:00 treniyle gidip öğleden sonra 15:00 gibi dönebilir, günü iki şehir görerek tamamlayabilirsiniz.",
    },
    {
      id: `${city.id}-daytrip-2`,
      destination: `${city.country} Komşu Kültür & Kale Şehri`,
      badge: "🏰 Günübirlik Kültür Kaçamağı",
      transportType: "🚄 Hızlı Tren / Şehirlerarası Otobüs",
      durationOneWay: "1 Saat 15 Dakika",
      roundTripEur: 16,
      highlights: "Ortaçağ kalesi, panoramik seyir terasları ve büyük şehre göre %25 daha ekonomik geleneksel lokantalar.",
      proTip: "Gidiş-dönüş (Return) bileti aynı anda gişeden aldığınızda genellikle %20 indirim uygulanır.",
    },
  ];
}
