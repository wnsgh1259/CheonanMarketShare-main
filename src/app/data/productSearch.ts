import type { MarketId } from "../components/CartContext";
import {
  STORES_BY_MARKET,
  ensureStoreMenus,
  isPlaceholderStoreName,
  normalizeStoreCategory,
  normalizeStoreNameKey,
  type MenuItem,
  type StoreData,
} from "./storeData";
import { loadOwnerCatalog } from "./ownerStoreData";
import { syntheticSeedStoreId } from "./seedStoreIds";
import { isDemoNavStore, withNavTestMenus } from "./navTestMenus";
import { loadAdminDeletedStoreIds } from "./deletedStoreIds";
import { pickStoreDisplayLatLng } from "../map/storeMapPlacement";
import type { SharedDraftStore, SharedOwnerMenu } from "./ownerSharedStore";

export type ProductStoreOffer = {
  storeId: number;
  storeName: string;
  menuId: string;
  menuName: string;
  price: number;
  originalPrice?: number;
  storeImage: string;
  marketId: MarketId;
};

export type ProductSearchGroup = {
  productName: string;
  offers: ProductStoreOffer[];
  minPrice: number;
  maxPrice: number;
};

function normalizeName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function draftMenusToMenuItems(menus: SharedOwnerMenu[] | undefined): MenuItem[] {
  if (!menus?.length) return [];
  const seen = new Set<string>();
  return menus.map((m, index) => {
    let id = String(m.id);
    if (seen.has(id)) id = `${m.id}-${index}`;
    seen.add(id);
    return {
      id,
      name: m.name,
      price: Number(m.price) || 0,
    };
  });
}

function resolvedDraftName(draftName: string | undefined, fallback: string): string {
  const t = draftName?.trim() ?? "";
  if (!t || isPlaceholderStoreName(t)) return fallback;
  return t;
}

function mergeStoreMenus(seed: StoreData, draft: SharedDraftStore | undefined): MenuItem[] {
  const displayName = resolvedDraftName(draft?.name, seed.name);
  const category = normalizeStoreCategory(draft?.category || seed.category);
  const draftMenus = draftMenusToMenuItems(draft?.menus);
  // 상점명과 안 맞는 메뉴(예: 떡볶이집에 순대국밥)는 ensureStoreMenus가 이름 기준으로 교체
  return ensureStoreMenus(
    displayName,
    category,
    draftMenus.length >= 3 ? draftMenus : seed.menus,
    `ps-${seed.id}`,
  );
}

/** 시드 + 카탈로그를 합친 검색용 상점 목록 */
export function getSearchableStores(marketId: MarketId): StoreData[] {
  const catalog = loadOwnerCatalog();
  const deleted = loadAdminDeletedStoreIds();
  const drafts = (catalog.stores ?? []).filter(
    (s) => (s.marketId ?? marketId) === marketId && !deleted.has(s.id),
  );
  const draftBySynthetic = new Map<number, SharedDraftStore>();
  const draftBySeedId = new Map<number, SharedDraftStore>();
  const draftByName = new Map<string, SharedDraftStore>();

  for (const d of drafts) {
    if (!isPlaceholderStoreName(d.name)) draftByName.set(d.name, d);
    if (typeof d.id === "number") {
      draftBySynthetic.set(d.id, d);
      // 시드 id로도 매칭 (관리자 시드 id = marketIndex*10000 + seedId)
      const seedId = d.id >= 10000 ? d.id % 10000 : d.id;
      if (seedId > 0) draftBySeedId.set(seedId, d);
    }
  }

  const seed = STORES_BY_MARKET[marketId] ?? [];
  const merged: StoreData[] = [];
  for (const store of seed) {
    const syntheticId = syntheticSeedStoreId(marketId, store.id);
    const demoStore = isDemoNavStore(marketId, store.id);
    // 시연 상점은 삭제 목록에 있어도 검색·경로에 남겨 사과 등이 안 뜨는 일을 막음
    if (deleted.has(syntheticId) && !demoStore) continue;
    const draft =
      draftBySeedId.get(store.id) ??
      draftBySynthetic.get(syntheticId) ??
      draftByName.get(store.name);
    if (demoStore) {
      const pos = pickStoreDisplayLatLng(marketId, store, null);
      merged.push({
        ...store,
        // 시나리오용 상점명·메뉴·좌표는 시드 고정
        lat: pos.lat,
        lng: pos.lng,
        image: draft?.image || store.image,
        menus: withNavTestMenus(
          marketId,
          store.id,
          ensureStoreMenus(store.name, store.category, store.menus, `ps-${store.id}`),
        ),
      });
      continue;
    }
    merged.push({
      ...store,
      name: resolvedDraftName(draft?.name, store.name),
      image: draft?.image || store.image,
      menus: withNavTestMenus(marketId, store.id, mergeStoreMenus(store, draft)),
    });
  }

  const seedIds = new Set(seed.map((s) => s.id));
  const seedSynthetic = new Set(seed.map((s) => syntheticSeedStoreId(marketId, s.id)));
  const seedNames = new Set(seed.map((s) => normalizeStoreNameKey(s.name)));

  for (const d of drafts) {
    if (typeof d.id !== "number") continue;
    if (seedSynthetic.has(d.id) || seedIds.has(d.id) || seedNames.has(normalizeStoreNameKey(d.name))) continue;
    // 테스트용 이름(1, 2, 트라이 등)은 상품 검색에 노출하지 않음
    if (isPlaceholderStoreName(d.name)) continue;
    const category = normalizeStoreCategory(d.category);
    merged.push({
      id: d.id,
      name: d.name,
      category,
      location: d.location || "",
      hours: d.hours || "",
      phone: d.phone || "",
      rating: 0,
      bookmark: false,
      image: d.image || "https://images.unsplash.com/photo-1594021113115-f1b48e63ef06?w=400",
      mx: 50,
      my: 50,
      lat: d.lat,
      lng: d.lng,
      description: d.description || "",
      menus: ensureStoreMenus(d.name, category, draftMenusToMenuItems(d.menus), `ps-d${d.id}`),
    });
  }

  return merged;
}

function scoreName(menuName: string, query: string): number {
  const n = normalizeName(menuName);
  const q = normalizeName(query);
  if (!q) return -1;
  if (n === q) return 300;
  if (n.startsWith(q)) return 200;
  if (n.includes(q)) return 100;
  // token match
  const tokens = q.split(" ").filter(Boolean);
  if (tokens.length > 1 && tokens.every((t) => n.includes(t))) return 80;
  return -1;
}

/** 시연용 대표 상품 — 검색 시 상점별 가격 비교가 한 그룹으로 묶이게 */
const DEMO_CANONICAL: Array<{ canonical: string; pattern: RegExp }> = [
  { canonical: "사과", pattern: /사과/ },
  { canonical: "삼겹살", pattern: /삼겹/ },
  { canonical: "대파", pattern: /대파/ },
];

function canonicalGroupName(menuName: string, query: string): string {
  const q = query.trim();
  for (const row of DEMO_CANONICAL) {
    if (row.pattern.test(q) && row.pattern.test(menuName)) return row.canonical;
  }
  return menuName.trim();
}

export function searchProducts(marketId: MarketId, query: string): ProductSearchGroup[] {
  const q = query.trim();
  if (!q) return [];

  const stores = getSearchableStores(marketId);
  const byName = new Map<string, ProductStoreOffer[]>();

  for (const store of stores) {
    for (const menu of store.menus) {
      if (scoreName(menu.name, q) < 0) continue;
      const key = canonicalGroupName(menu.name, q);
      const offer: ProductStoreOffer = {
        storeId: store.id,
        storeName: store.name,
        menuId: menu.id,
        menuName: key,
        price: menu.price,
        originalPrice: menu.originalPrice,
        storeImage: store.image,
        marketId,
      };
      const list = byName.get(key) ?? [];
      // 같은 상점·같은 대표상품은 가장 싼 메뉴만 남김
      const existingIdx = list.findIndex((o) => o.storeId === store.id);
      if (existingIdx >= 0) {
        if (offer.price < list[existingIdx].price) list[existingIdx] = offer;
      } else {
        list.push(offer);
      }
      byName.set(key, list);
    }
  }

  const groups: ProductSearchGroup[] = [];
  for (const [productName, offers] of byName) {
    const sorted = [...offers].sort((a, b) => a.price - b.price);
    groups.push({
      productName,
      offers: sorted,
      minPrice: sorted[0]?.price ?? 0,
      maxPrice: sorted[sorted.length - 1]?.price ?? 0,
    });
  }

  groups.sort((a, b) => {
    const sa = scoreName(a.productName, q);
    const sb = scoreName(b.productName, q);
    if (sb !== sa) return sb - sa;
    return a.minPrice - b.minPrice;
  });

  return groups;
}

export function unresolvedCartItemId(marketId: MarketId, productName: string) {
  return `unresolved:${marketId}:${normalizeName(productName)}`;
}
