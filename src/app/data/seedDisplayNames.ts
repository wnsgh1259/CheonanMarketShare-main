import type { MarketId } from "../components/CartContext";
import { STORES_BY_MARKET, isPlaceholderStoreName, normalizeStoreNameKey } from "./storeData";
import { syntheticSeedStoreId } from "./seedStoreIds";

type NamedDraft = { id: number; name: string; marketId?: string };

/** 관리자가 시드 상점을 다른 상점 이름으로 바꿨는지 (바뀌면 시드 메뉴·시연 메뉴를 쓰지 않음) */
export function isSeedRenamed(seedName: string, draftName: string | undefined): boolean {
  const next = draftName?.trim() ?? "";
  if (!next || isPlaceholderStoreName(next)) return false;
  return normalizeStoreNameKey(next) !== normalizeStoreNameKey(seedName);
}

/**
 * 이 시장 시드 상점이 실제로 화면에 보이는 이름(정규화 키).
 * 등록 상점이 이 이름과 같으면 같은 상점의 중복으로 본다.
 */
export function displayedSeedNameKeys(
  marketId: MarketId,
  drafts: NamedDraft[],
  deleted?: Set<number>,
): Set<string> {
  const byId = new Map(drafts.map((d) => [d.id, d]));
  const keys = new Set<string>();
  for (const seed of STORES_BY_MARKET[marketId] ?? []) {
    const syn = syntheticSeedStoreId(marketId, seed.id);
    if (deleted?.has(syn)) continue;
    const draft = byId.get(syn);
    if (draft?.marketId && draft.marketId !== marketId) continue;
    const name = draft && isSeedRenamed(seed.name, draft.name) ? draft.name : seed.name;
    const key = normalizeStoreNameKey(name);
    if (key) keys.add(key);
  }
  return keys;
}
