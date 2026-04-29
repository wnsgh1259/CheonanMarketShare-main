import type { MarketId } from "../components/CartContext";

/** Admin/지도 시드 상점 id와 동일한 순서 (`AdminPage` dummyStores와 맞춤) */
export const SEED_MARKET_ORDER: MarketId[] = ["jungang", "byeongcheon", "seonghwan"];

/** `storeData` 시장 내 상점 id를 관리자 초안 상점 id로 변환 */
export function syntheticSeedStoreId(marketId: MarketId, seedStoreId: number): number {
  const idx = SEED_MARKET_ORDER.indexOf(marketId);
  if (idx < 0) return seedStoreId;
  return idx * 10000 + seedStoreId;
}
