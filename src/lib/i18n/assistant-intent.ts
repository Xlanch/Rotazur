/** Small, local intent router; no message or personal itinerary is sent to a translation/AI service. */
const TOPICS: [string, RegExp][] = [
  ['havalimanı', /havaliman|ulaşım|metro|taksi|airport|transfer|transport|flughafen|аэропорт|транспорт|机场|交通|aeropuerto|transporte|aéroport|مطار|نقل/iu],
  ['yağmur', /yağmur|hava|kapalı|soğuk|rain|weather|regen|wetter|дожд|погод|雨|天气|lluvia|clima|pluie|météo|مطر|طقس/iu],
  ['yemek', /yemek|restoran|ne yenir|ucuz|lezzet|restaurant|food|meal|essen|ресторан|еда|питан|餐|吃|美食|restaurante|comida|repas|مطعم|طعام|وجبة/iu],
  ['para', /para|döviz|bahşiş|currency|exchange|atm|money|währung|geld|wechsel|валют|деньг|货币|汇率|dinero|divisa|moneda|change|argent|devise|عملة|صراف|مال/iu],
  ['müze', /müze|bilet|şehir kart|ücretsiz|museum|ticket|city pass|музе|билет|博物馆|门票|museo|entrada|musée|billet|متحف|تذكرة/iu],
  ['otel', /otel|konaklama|nerede kal|hotel|stay|accommodation|übernacht|unterkunft|отел|прожив|酒店|住宿|alojamiento|hébergement|hôtel|فندق|إقامة/iu],
  ['gece', /gece|güvenli|akşam|eğlence|night|evening|safe|nacht|abend|sicher|ноч|вечер|безопас|夜|安全|noche|segur|soir|nuit|sécur|ليل|مساء|آمن/iu],
];
export function assistantIntent(question: string): string {
  return TOPICS.find(([, pattern]) => pattern.test(question))?.[0] || question;
}
