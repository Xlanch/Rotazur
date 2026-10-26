/**
 * Tüm 26 şehir için HTTP 200 doğrulanmış, yüksek çözünürlüklü, kesintisiz CDN şehir görselleri.
 * Wikipedia API hız sınırı (HTTP 429) veya ağ engellerinden etkilenmeden anında yüklenir.
 */
import expandedImages from "../data/city-images.json";

export const CITY_IMAGE_MAP: Record<string, string> = {
  // Şehir ID'leri ile eşleşme
  belgrad: "https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?auto=format&fit=crop&w=1200&q=80",
  saraybosna: "https://images.unsplash.com/photo-1569388330292-79cc1ec67270?auto=format&fit=crop&w=1200&q=80",
  kotor: "https://images.unsplash.com/photo-1555990793-da11153b2473?auto=format&fit=crop&w=1200&q=80",
  uskup: "https://images.unsplash.com/photo-1590422749897-47036da0b0ff?auto=format&fit=crop&w=1200&q=80",
  tiflis: "https://images.unsplash.com/photo-1565008576549-57569a49371d?auto=format&fit=crop&w=1200&q=80",
  baku: "https://images.unsplash.com/photo-1596306499317-8490232098fa?auto=format&fit=crop&w=1200&q=80",
  budapeste: "https://images.unsplash.com/photo-1549877452-9c387954fbc2?auto=format&fit=crop&w=1200&q=80",
  prag: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=1200&q=80",
  roma: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80",
  barselona: "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=80",
  paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
  amsterdam: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=1200&q=80",
  atina: "https://images.unsplash.com/photo-1555993539-1732b0258235?auto=format&fit=crop&w=1200&q=80",
  viyana: "https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=1200&q=80",
  bangkok: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80",
  tokyo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80",
  tiran: "https://images.unsplash.com/photo-1623167278440-fd212b72e1bd?auto=format&fit=crop&w=1200&q=80",
  batum: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
  "sarm-el-seyh": "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
  semerkant: "https://images.unsplash.com/photo-1580974852861-c381510bc98a?auto=format&fit=crop&w=1200&q=80",
  kisinev: "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80",
  londra: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80",
  berlin: "https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1200&q=80",
  lizbon: "https://images.unsplash.com/photo-1548707309-dcebeab9ea9b?auto=format&fit=crop&w=1200&q=80",
  bali: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
  dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",

  // Wikipedia başlıkları ile eşleşme
  Belgrade: "https://images.unsplash.com/photo-1587974928442-77dc3e0dba72?auto=format&fit=crop&w=1200&q=80",
  Sarajevo: "https://images.unsplash.com/photo-1569388330292-79cc1ec67270?auto=format&fit=crop&w=1200&q=80",
  Kotor: "https://images.unsplash.com/photo-1555990793-da11153b2473?auto=format&fit=crop&w=1200&q=80",
  Skopje: "https://images.unsplash.com/photo-1590422749897-47036da0b0ff?auto=format&fit=crop&w=1200&q=80",
  Tbilisi: "https://images.unsplash.com/photo-1565008576549-57569a49371d?auto=format&fit=crop&w=1200&q=80",
  Baku: "https://images.unsplash.com/photo-1596306499317-8490232098fa?auto=format&fit=crop&w=1200&q=80",
  Budapest: "https://images.unsplash.com/photo-1549877452-9c387954fbc2?auto=format&fit=crop&w=1200&q=80",
  Prague: "https://images.unsplash.com/photo-1519677100203-a0e668c92439?auto=format&fit=crop&w=1200&q=80",
  Rome: "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80",
  Barcelona: "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=80",
  Paris: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
  Amsterdam: "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=1200&q=80",
  Athens: "https://images.unsplash.com/photo-1555993539-1732b0258235?auto=format&fit=crop&w=1200&q=80",
  Vienna: "https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=1200&q=80",
  Bangkok: "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80",
  Tokyo: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=1200&q=80",
  Tirana: "https://images.unsplash.com/photo-1623167278440-fd212b72e1bd?auto=format&fit=crop&w=1200&q=80",
  Batumi: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80",
  Sharm_El_Sheikh: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1200&q=80",
  Samarkand: "https://images.unsplash.com/photo-1580974852861-c381510bc98a?auto=format&fit=crop&w=1200&q=80",
  "Chișinău": "https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80",
  London: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80",
  Berlin: "https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1200&q=80",
  Lisbon: "https://images.unsplash.com/photo-1548707309-dcebeab9ea9b?auto=format&fit=crop&w=1200&q=80",
  Bali: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
  Dubai: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
};

export const DEFAULT_CITY_IMAGE =
  "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=1200&q=80";

for (const [id, image] of Object.entries(expandedImages)) {
  CITY_IMAGE_MAP[id] = image.url;
  CITY_IMAGE_MAP[image.wiki] = image.url;
}

export async function getCityImage(keyOrWiki: string): Promise<string> {
  return cityImageUrl(keyOrWiki);
}

export function cityImageUrl(key: string): string {
  return Object.hasOwn(CITY_IMAGE_MAP, key) ? CITY_IMAGE_MAP[key] : DEFAULT_CITY_IMAGE;
}
