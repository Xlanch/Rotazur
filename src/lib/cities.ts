import type { City, Interest, Origin } from "./types";
import destinations from "./data/destinations.json";

export const ORIGINS: Origin[] = [
  { code: "IST", name: "İstanbul (IST)", factor: 1 },
  { code: "SAW", name: "İstanbul Sabiha Gökçen (SAW)", factor: 0.95 },
  { code: "ESB", name: "Ankara (ESB)", factor: 1.12 },
  { code: "ADB", name: "İzmir (ADB)", factor: 1.08 },
  { code: "AYT", name: "Antalya (AYT)", factor: 1.1 },
];

export const INTERESTS: { id: Interest; label: string; emoji: string }[] = [
  { id: "tarih", label: "Tarih", emoji: "🏛️" },
  { id: "muze", label: "Müze & Sanat", emoji: "🎨" },
  { id: "doga", label: "Doğa", emoji: "🌿" },
  { id: "yemek", label: "Yemek", emoji: "🍜" },
  { id: "alisveris", label: "Alışveriş", emoji: "🛍️" },
  { id: "gece", label: "Gece Hayatı", emoji: "🌙" },
  { id: "fotograf", label: "Fotoğraf", emoji: "📸" },
  { id: "teknoloji", label: "Teknoloji", emoji: "🤖" },
];

export const CITIES: City[] = destinations as City[];

export const getCity = (id: string) => CITIES.find((c) => c.id === id);
export const getOrigin = (code: string) => ORIGINS.find((o) => o.code === code) ?? ORIGINS[0];

export function publicCity(c: City): Omit<City, "attractions"> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { attractions, ...rest } = c;
  return rest;
}
