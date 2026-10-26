import type { MarketId } from "../components/CartContext";
import { STORES_BY_MARKET } from "../data/storeData";
import { loadOwnerCatalog } from "../data/ownerStoreData";
import { loadAdminDeletedStoreIds } from "../data/deletedStoreIds";
import { isDemoNavStore } from "../data/navTestMenus";
import { syntheticSeedStoreId } from "../data/seedStoreIds";
import { pickStoreDisplayLatLng } from "./storeMapPlacement";

export type MarketStorePin = {
  id: number;
  name: string;
  lat: number;
  lng: number;
};

export { loadAdminDeletedStoreIds } from "../data/deletedStoreIds";

/**
 * 관리자 「등록 상점」 목록과 같은 규칙으로 상점 핀을 만든다.
 * - 시드 id(1) ↔ 관리자 합성 id(10001) 매칭
 * - 관리자에서 삭제한 상점 제외
 * - 시장이 명시된 추가 상점만 포함
 * - 카탈로그에 저장된 lat/lng(직접 찍은 위치) 우선
 */
export function getMarketStorePins(marketId: MarketId): MarketStorePin[] {
  const catalog = loadOwnerCatalog();
  const deleted = loadAdminDeletedStoreIds();
  const allDrafts = (catalog.stores ?? []).filter((s) => !deleted.has(s.id));
  // 같은 시장에 속한 초안 (이름 매칭용)
  const drafts = allDrafts.filter((s) => (s.marketId ?? marketId) === marketId);
  // 시드 id 매칭은 모든 시장에서 — 저장된 marketId가 이 시장이 아니면 이 시장 시드 상점이 아님
  const draftBySyntheticIdAll = new Map(allDrafts.map((d) => [d.id, d]));
  const draftByName = new Map(drafts.map((d) => [d.name, d]));

  const seed = STORES_BY_MARKET[marketId] ?? [];
  const usedDraftIds = new Set<number>();
  const pins: MarketStorePin[] = [];

  for (const store of seed) {
    const syntheticId = syntheticSeedStoreId(marketId, store.id);
    const demoStore = isDemoNavStore(marketId, store.id);
    // 시연 상점은 삭제돼도 핀·경로에 유지 (장바구니 검색과 동일)
    if (deleted.has(syntheticId) && !demoStore) continue;
    const byId = draftBySyntheticIdAll.get(syntheticId);
    // 관리자에서 다른 시장으로 옮긴 시드 상점은 이 시장에서 제외 (관리자 목록과 동일)
    if (byId && byId.marketId && byId.marketId !== marketId && !demoStore) continue;
    const draft = byId ?? draftByName.get(store.name);

    if (draft && typeof draft.id === "number") usedDraftIds.add(draft.id);

    // 시연 상점은 시드 좌표·이름 고정 (옛 초안 좌표에 경로가 붙는 일 방지)
    const { lat, lng } = pickStoreDisplayLatLng(marketId, store, demoStore ? null : draft);
    pins.push({
      id: store.id,
      name: demoStore ? store.name : (draft?.name ?? store.name),
      lat,
      lng,
    });
  }

  for (const draft of drafts) {
    if (typeof draft.id !== "number") continue;
    if (usedDraftIds.has(draft.id)) continue;
    // 관리자 목록은 시장이 명시된 상점만 해당 시장에 표시
    if (draft.marketId !== marketId) continue;
    const { lat, lng } = pickStoreDisplayLatLng(
      marketId,
      {
        id: draft.id,
        mx: typeof draft.mx === "number" ? draft.mx : undefined,
        my: typeof draft.my === "number" ? draft.my : undefined,
        lat: draft.lat,
        lng: draft.lng,
      },
      draft,
    );
    pins.push({
      id: draft.id,
      name: draft.name,
      lat,
      lng,
    });
  }

  return pins;
}
