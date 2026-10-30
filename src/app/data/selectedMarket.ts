import type { MarketId } from "../components/CartContext";

/** 지도·장바구니가 함께 쓰는 마지막 선택 시장 */
const SELECTED_MARKET_KEY = "selected-market-v1";

export function isMarketId(value: unknown): value is MarketId {
  return value === "jungang" || value === "byeongcheon" || value === "seonghwan";
}

export function loadSelectedMarket(): MarketId | null {
  try {
    const raw = localStorage.getItem(SELECTED_MARKET_KEY);
    return isMarketId(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function saveSelectedMarket(marketId: MarketId) {
  try {
    localStorage.setItem(SELECTED_MARKET_KEY, marketId);
  } catch {
    /* ignore */
  }
}
