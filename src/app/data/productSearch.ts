import type { MarketId } from "../components/CartContext";
import { STORES_BY_MARKET, type MenuItem, type StoreData } from "./storeData";
import { loadOwnerCatalog } from "./ownerStoreData";
import { syntheticSeedStoreId } from "./seedStoreIds";
import { withNavTestMenus } from "./navTestMenus";
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

function mergeStoreMenus(seed: StoreData, draft: SharedDraftStore | undefined): MenuItem[] {
  const draftMenus = draftMenusToMenuItems(draft?.menus);
  if (draftMenus.length === 0) return seed.menus;
  // draft wins when present
  return draftMenus;
}

/** 시드 + 카탈로그를 합친 검색용 상점 목록 */
export function getSearchableStores(marketId: MarketId): StoreData[] {
  const catalog = loadOwnerCatalog();
  const drafts = (catalog.stores ?? []).filter((s) => (s.marketId ?? marketId) === marketId);
  const draftBySynthetic = new Map<number, SharedDraftStore>();
  const draftBySeedId = new Map<number, SharedDraftStore>();
  const draftByName = new Map<string, SharedDraftStore>();

  for (const d of drafts) {
    draftByName.set(d.name, d);
    if (typeof d.id === "number") {
      draftBySynthetic.set(d.id, d);
      // 시드 id로도 매칭 (관리자 시드 id = marketIndex*10000 + seedId)
      const seedId = d.id >= 10000 ? d.id % 10000 : d.id;
      if (seedId > 0) draftBySeedId.set(seedId, d);
    }
  }

  const seed = STORES_BY_MARKET[marketId] ?? [];
  const merged: StoreData[] = seed.map((store) => {
    const draft =
      draftBySeedId.get(store.id) ??
      draftBySynthetic.get(syntheticSeedStoreId(marketId, store.id)) ??
      draftByName.get(store.name);
    return {
      ...store,
      name: draft?.name ?? store.name,
      image: draft?.image || store.image,
      menus: withNavTestMenus(marketId, store.id, mergeStoreMenus(store, draft)),
    };
  });

  const seedIds = new Set(seed.map((s) => s.id));
  const seedSynthetic = new Set(seed.map((s) => syntheticSeedStoreId(marketId, s.id)));
  const seedNames = new Set(seed.map((s) => s.name));

  for (const d of drafts) {
    if (typeof d.id !== "number") continue;
    if (seedSynthetic.has(d.id) || seedIds.has(d.id) || seedNames.has(d.name)) continue;
    if (!d.name) continue;
    merged.push({
      id: d.id,
      name: d.name,
      category: (d.category as StoreData["category"]) || "기타·생활",
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
      menus: draftMenusToMenuItems(d.menus),
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

export function searchProducts(marketId: MarketId, query: string): ProductSearchGroup[] {
  const q = query.trim();
  if (!q) return [];

  const stores = getSearchableStores(marketId);
  const byName = new Map<string, ProductStoreOffer[]>();

  for (const store of stores) {
    for (const menu of store.menus) {
      if (scoreName(menu.name, q) < 0) continue;
      const key = menu.name.trim();
      const offer: ProductStoreOffer = {
        storeId: store.id,
        storeName: store.name,
        menuId: menu.id,
        menuName: menu.name.trim(),
        price: menu.price,
        originalPrice: menu.originalPrice,
        storeImage: store.image,
        marketId,
      };
      const list = byName.get(key) ?? [];
      list.push(offer);
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
