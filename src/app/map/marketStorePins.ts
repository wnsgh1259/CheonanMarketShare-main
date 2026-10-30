import type { MarketId } from "../components/CartContext";
import { STORES_BY_MARKET, normalizeStoreNameKey } from "../data/storeData";
import { displayedSeedNameKeys } from "../data/seedDisplayNames";
import { loadOwnerCatalog } from "../data/ownerStoreData";
import { loadAdminDeletedStoreIds } from "../data/deletedStoreIds";
import { syntheticSeedStoreId } from "../data/seedStoreIds";
import { pickStoreDisplayLatLng, spreadOverlappingLatLngs } from "./storeMapPlacement";

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
 * - 겹치는 핀은 관리자 지도와 동일하게 살짝 벌림
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
    if (deleted.has(syntheticId)) continue;
    const byId = draftBySyntheticIdAll.get(syntheticId);
    // 관리자에서 다른 시장으로 옮긴 시드 상점은 이 시장에서 제외 (관리자 목록과 동일)
    if (byId && byId.marketId && byId.marketId !== marketId) continue;
    const draft = byId ?? draftByName.get(store.name);

    if (draft && typeof draft.id === "number") usedDraftIds.add(draft.id);

    const { lat, lng } = pickStoreDisplayLatLng(marketId, store, draft);
    pins.push({
      id: store.id,
      name: draft?.name ?? store.name,
      lat,
      lng,
    });
  }

  const seedSynthetic = new Set(seed.map((s) => syntheticSeedStoreId(marketId, s.id)));
  const seedNameKeys = displayedSeedNameKeys(marketId, allDrafts, deleted);

  for (const draft of drafts) {
    if (typeof draft.id !== "number") continue;
    if (usedDraftIds.has(draft.id)) continue;
    if (seedSynthetic.has(draft.id)) continue;
    // 관리자 목록은 시장이 명시된 상점만 해당 시장에 표시
    if (draft.marketId !== marketId) continue;
    // 시드 상점과 같은 이름이면 중복 핀으로 보고 제외 (검색·관리자 목록과 동일)
    if (seedNameKeys.has(normalizeStoreNameKey(draft.name))) continue;
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

  return spreadOverlappingLatLngs(pins, { minMeters: 12 });
}
