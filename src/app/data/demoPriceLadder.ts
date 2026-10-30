import type { MarketId } from "../components/CartContext";
import { MARKET_VIEW_CONFIG } from "../map/storeMapPlacement";
import { isNavTestMenusEnabled } from "./navTestMenus";
import type { StoreData } from "./storeData";
import { haversineMeters, loadWalkPathGraphLocal } from "./walkPathGraph";
import { findDefaultEntranceNode } from "./walkRouting";

/**
 * 시연 상품 가격 사다리.
 * 상점 위치를 어디로 옮겨도 「입구에서 가까울수록 비싸고, 멀수록 싸게」 가격을 다시 매겨
 * 최저가(먼 곳) · 최단거리(가까운 곳) · 추천(중간)이 항상 서로 다르게 나오게 한다.
 */
type LadderRow = { pattern: RegExp; nearPrice: number; farPrice: number };

const DEMO_LADDER: Partial<Record<MarketId, LadderRow[]>> = {
  byeongcheon: [
    { pattern: /사과/, nearPrice: 9200, farPrice: 6200 },
    { pattern: /대파/, nearPrice: 3800, farPrice: 1600 },
    { pattern: /삼겹/, nearPrice: 14800, farPrice: 10500 },
  ],
};

function demoStartPoint(marketId: MarketId) {
  const graph = loadWalkPathGraphLocal(marketId);
  const node = graph.nodes.length > 0 ? findDefaultEntranceNode(graph) : null;
  if (node) return { lat: node.lat, lng: node.lng };
  const c = MARKET_VIEW_CONFIG[marketId].center;
  return { lat: c.lat - 0.00035, lng: c.lng };
}

const roundTo100 = (n: number) => Math.round(n / 100) * 100;

export function applyDemoPriceLadder<T extends StoreData>(marketId: MarketId, stores: T[]): T[] {
  const ladder = DEMO_LADDER[marketId];
  if (!ladder?.length || !isNavTestMenusEnabled()) return stores;

  const start = demoStartPoint(marketId);
  const distById = new Map(
    stores.map((s) => [
      s.id,
      Number.isFinite(s.lat) && Number.isFinite(s.lng) ? haversineMeters(start, { lat: s.lat, lng: s.lng }) : Infinity,
    ]),
  );

  // 상품별: 파는 상점을 입구 거리순으로 세워 가까운 곳부터 비싼 가격
  const priceByStore = ladder.map((row) => {
    const sellers = stores
      .filter((s) => s.menus.some((m) => row.pattern.test(m.name)))
      .sort((a, b) => (distById.get(a.id) ?? 0) - (distById.get(b.id) ?? 0));
    const map = new Map<number, number>();
    const n = sellers.length;
    sellers.forEach((s, i) => {
      const t = n <= 1 ? 0 : i / (n - 1);
      map.set(s.id, roundTo100(row.nearPrice + (row.farPrice - row.nearPrice) * t));
    });
    return { row, map };
  });

  return stores.map((store) => {
    let changed = false;
    const menus = store.menus.map((menu) => {
      for (const { row, map } of priceByStore) {
        if (!row.pattern.test(menu.name)) continue;
        const price = map.get(store.id);
        if (price == null) continue;
        changed = true;
        return { ...menu, price, originalPrice: undefined, discount: undefined };
      }
      return menu;
    });
    return changed ? { ...store, menus } : store;
  });
}
