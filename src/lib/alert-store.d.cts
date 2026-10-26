export interface StoredPriceAlert {
  id: string; userId?: string; cityId: string; cityName: string; origin: string;
  targetPriceTry: number; currentPriceTry: number; email: string; createdAt: string;
  triggered?: boolean; triggeredAt?: string; triggeredPrice?: number;
}
export interface AlertStore {
  list(ownerId: string): StoredPriceAlert[];
  save(alert: StoredPriceAlert): StoredPriceAlert;
  remove(ownerId: string, id: string): boolean;
  triggerPrices(routes: Record<string, { priceRoundTripTry: number }>): StoredPriceAlert[];
  close(): void;
}
export function createAlertStore(options: { filename: string; legacyFile: string }): AlertStore;
export function getAlertStore(root?: string): AlertStore;
