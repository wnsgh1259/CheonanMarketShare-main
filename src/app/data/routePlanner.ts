import type { CartItem, MarketId } from "../components/CartContext";
import { pickStoreDisplayLatLng } from "../map/storeMapPlacement";
import { getSearchableStores, searchProducts } from "./productSearch";
import type { StoreData } from "./storeData";
import {
  createRoutingContext,
  distanceFromEntrance,
  routeDistanceMeters,
  walkMinutes,
  type LatLng,
  type RoutingContext,
  type StartSource,
} from "./walkRouting";

export type RouteType = "cheapest" | "shortest" | "balanced";

export type PlannedStop = {
  store: StoreData;
  lat: number;
  lng: number;
  cartItems: CartItem[];
  basePrice: number;
  discountSavings: number;
  hopDistance: number;
};

export type PlannedRoute = {
  type: RouteType;
  path: PlannedStop[];
  totalPrice: number;
  savings: number;
  distance: number;
  time: number;
  usedWalkGraph: boolean;
  unresolvedAssigned: number;
  unresolvedSkipped: number;
  startSource: StartSource;
  startLabel: string;
};

function storePos(marketId: MarketId, store: StoreData) {
  const { lat, lng } = pickStoreDisplayLatLng(marketId, store);
  return { lat, lng, storeId: store.id };
}

function cloneItemToStore(item: CartItem, store: StoreData, menuId: string, price: number): CartItem {
  return {
    ...item,
    id: menuId,
    storeId: store.id,
    storeName: store.name,
    price,
    unresolved: false,
    image: item.image || store.image,
  };
}

type OfferPick = { store: StoreData; menuId: string; price: number; originalPrice?: number };

function offersForUnresolved(marketId: MarketId, item: CartItem): OfferPick[] {
  const groups = searchProducts(marketId, item.name);
  const exact = groups.find((g) => g.productName.trim() === item.name.trim()) ?? groups[0];
  if (!exact) return [];
  const stores = getSearchableStores(marketId);
  const byId = new Map(stores.map((s) => [s.id, s]));
  return exact.offers
    .map((o) => {
      const store = byId.get(o.storeId);
      if (!store) return null;
      return {
        store,
        menuId: o.menuId,
        price: o.price,
        originalPrice: o.originalPrice,
      } satisfies OfferPick;
    })
    .filter((x): x is OfferPick => x != null);
}

function mergeIntoBuckets(
  marketId: MarketId,
  resolvedItems: CartItem[],
): Map<number, { store: StoreData; items: CartItem[] }> {
  const stores = getSearchableStores(marketId);
  const byId = new Map(stores.map((s) => [s.id, s]));
  const buckets = new Map<number, { store: StoreData; items: CartItem[] }>();

  for (const item of resolvedItems) {
    if (item.unresolved || !item.storeId) continue;
    const store = byId.get(item.storeId);
    if (!store) continue;
    if (!buckets.has(store.id)) buckets.set(store.id, { store, items: [] });
    buckets.get(store.id)!.items.push(item);
  }
  return buckets;
}

function entryMetrics(
  marketId: MarketId,
  store: StoreData,
  cartItems: CartItem[],
): Omit<PlannedStop, "hopDistance" | "lat" | "lng"> & { lat: number; lng: number } {
  const { lat, lng } = pickStoreDisplayLatLng(marketId, store);
  let basePrice = 0;
  let discountSavings = 0;
  for (const ci of cartItems) {
    basePrice += ci.price * ci.quantity;
    const menu = store.menus.find((m) => m.id === ci.id || m.name.trim() === ci.name.trim());
    if (menu?.originalPrice && menu.originalPrice > ci.price) {
      discountSavings += (menu.originalPrice - ci.price) * ci.quantity;
    }
  }
  return { store, cartItems, basePrice, discountSavings, lat, lng };
}

type Pos = { lat: number; lng: number; storeId?: number };

function nearestNeighborOrder(
  ctx: RoutingContext,
  entries: Array<Omit<PlannedStop, "hopDistance">>,
): PlannedStop[] {
  if (entries.length === 0) return [];
  const rem = [...entries];
  const path: PlannedStop[] = [];
  let cur: Pos = { lat: ctx.entrance.lat, lng: ctx.entrance.lng };

  while (rem.length) {
    let bi = 0;
    let bd = Infinity;
    rem.forEach((e, i) => {
      const d = routeDistanceMeters(ctx, cur, {
        lat: e.lat,
        lng: e.lng,
        storeId: e.store.id,
      });
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    const next = rem[bi];
    path.push({ ...next, hopDistance: Math.round(bd) });
    cur = { lat: next.lat, lng: next.lng, storeId: next.store.id };
    rem.splice(bi, 1);
  }
  return path;
}

function savingsFirstThenNn(
  ctx: RoutingContext,
  entries: Array<Omit<PlannedStop, "hopDistance">>,
): PlannedStop[] {
  const withDiscount = [...entries]
    .filter((e) => e.discountSavings > 0)
    .sort((a, b) => b.discountSavings - a.discountSavings);
  const without = entries.filter((e) => e.discountSavings === 0);
  if (withDiscount.length === 0) return nearestNeighborOrder(ctx, entries);

  const head = nearestNeighborOrder(ctx, withDiscount);
  if (without.length === 0) return head;

  const last = head[head.length - 1];
  const rem = [...without];
  const restPath: PlannedStop[] = [];
  let cur: Pos = { lat: last.lat, lng: last.lng, storeId: last.store.id };
  while (rem.length) {
    let bi = 0;
    let bd = Infinity;
    rem.forEach((e, i) => {
      const d = routeDistanceMeters(ctx, cur, { lat: e.lat, lng: e.lng, storeId: e.store.id });
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    const next = rem[bi];
    restPath.push({ ...next, hopDistance: Math.round(bd) });
    cur = { lat: next.lat, lng: next.lng, storeId: next.store.id };
    rem.splice(bi, 1);
  }
  return [...head, ...restPath];
}

function balancedOrder(
  ctx: RoutingContext,
  entries: Array<Omit<PlannedStop, "hopDistance">>,
): PlannedStop[] {
  const rem = [...entries];
  const path: PlannedStop[] = [];
  let cur: Pos = {
    lat: ctx.entrance.lat,
    lng: ctx.entrance.lng,
  };

  while (rem.length) {
    const dists = rem.map((e) =>
      routeDistanceMeters(ctx, cur, {
        lat: e.lat,
        lng: e.lng,
        storeId: e.store.id,
      }),
    );
    const maxD = Math.max(...dists, 1);
    const maxS = Math.max(...rem.map((e) => e.discountSavings), 1);
    let bi = 0;
    let best = Infinity;
    rem.forEach((e, i) => {
      const nd = dists[i] / maxD;
      const ns = e.discountSavings / maxS;
      const score = nd * 0.55 - ns * 0.45;
      if (score < best) {
        best = score;
        bi = i;
      }
    });
    const next = rem[bi];
    path.push({ ...next, hopDistance: Math.round(dists[bi]) });
    cur = { lat: next.lat, lng: next.lng, storeId: next.store.id };
    rem.splice(bi, 1);
  }
  return path;
}

function tourLength(
  ctx: RoutingContext,
  storeIds: number[],
  storesById: Map<number, StoreData>,
  marketId: MarketId,
): number {
  let cur: Pos = { lat: ctx.entrance.lat, lng: ctx.entrance.lng };
  let total = 0;
  const rem = [...storeIds];
  while (rem.length) {
    let bi = 0;
    let bd = Infinity;
    rem.forEach((id, i) => {
      const s = storesById.get(id)!;
      const p = storePos(marketId, s);
      const d = routeDistanceMeters(ctx, cur, p);
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    const sid = rem[bi];
    const s = storesById.get(sid)!;
    const p = storePos(marketId, s);
    total += bd;
    cur = p;
    rem.splice(bi, 1);
  }
  return total;
}

type AssignmentResult = {
  items: CartItem[];
  assigned: number;
  skipped: number;
};

/** 최저가: 각 미지정 상품을 가장 싼 상점에 배정 */
function assignCheapest(marketId: MarketId, items: CartItem[]): AssignmentResult {
  const out: CartItem[] = [];
  let assigned = 0;
  let skipped = 0;
  for (const item of items) {
    if (!item.unresolved) {
      out.push(item);
      continue;
    }
    const offers = offersForUnresolved(marketId, item);
    if (offers.length === 0) {
      skipped += 1;
      continue;
    }
    offers.sort((a, b) => a.price - b.price);
    const best = offers[0];
    out.push(cloneItemToStore(item, best.store, best.menuId, best.price));
    assigned += 1;
  }
  return { items: out, assigned, skipped };
}

/** 최단: 고정 상점 + 미지정 후보를 탐욕적으로 총 투어 길이 최소가 되게 배정 */
function assignShortest(marketId: MarketId, items: CartItem[], ctx: RoutingContext): AssignmentResult {
  const fixed = items.filter((i) => !i.unresolved);
  const unresolved = items.filter((i) => i.unresolved);
  const stores = getSearchableStores(marketId);
  const storesById = new Map(stores.map((s) => [s.id, s]));

  const chosenStoreIds = new Set(fixed.map((i) => i.storeId).filter((id) => id > 0));
  const out: CartItem[] = [...fixed];
  let assigned = 0;
  let skipped = 0;

  // fewer options first
  const sorted = [...unresolved].sort(
    (a, b) => offersForUnresolved(marketId, a).length - offersForUnresolved(marketId, b).length,
  );

  for (const item of sorted) {
    const offers = offersForUnresolved(marketId, item);
    if (offers.length === 0) {
      skipped += 1;
      continue;
    }
    let bestOffer = offers[0];
    let bestLen = Infinity;
    for (const offer of offers) {
      const nextIds = new Set(chosenStoreIds);
      nextIds.add(offer.store.id);
      const len = tourLength(ctx, [...nextIds], storesById, marketId);
      // slight preference for already-visited stores (len equal)
      const preferSame = chosenStoreIds.has(offer.store.id) ? -1 : 0;
      if (len + preferSame < bestLen) {
        bestLen = len + preferSame;
        bestOffer = offer;
      }
    }
    chosenStoreIds.add(bestOffer.store.id);
    out.push(cloneItemToStore(item, bestOffer.store, bestOffer.menuId, bestOffer.price));
    assigned += 1;
  }
  return { items: out, assigned, skipped };
}

/** 추천(밸런스): 가격·입구거리 가중 */
function assignBalanced(marketId: MarketId, items: CartItem[], ctx: RoutingContext): AssignmentResult {
  const out: CartItem[] = [];
  let assigned = 0;
  let skipped = 0;
  for (const item of items) {
    if (!item.unresolved) {
      out.push(item);
      continue;
    }
    const offers = offersForUnresolved(marketId, item);
    if (offers.length === 0) {
      skipped += 1;
      continue;
    }
    const prices = offers.map((o) => o.price);
    const dists = offers.map((o) =>
      distanceFromEntrance(ctx, storePos(marketId, o.store)),
    );
    const maxP = Math.max(...prices, 1);
    const maxD = Math.max(...dists, 1);
    let best = offers[0];
    let bestScore = Infinity;
    offers.forEach((o, i) => {
      const score = (prices[i] / maxP) * 0.5 + (dists[i] / maxD) * 0.5;
      if (score < bestScore) {
        bestScore = score;
        best = o;
      }
    });
    out.push(cloneItemToStore(item, best.store, best.menuId, best.price));
    assigned += 1;
  }
  return { items: out, assigned, skipped };
}

function buildStops(
  marketId: MarketId,
  items: CartItem[],
): Array<Omit<PlannedStop, "hopDistance">> {
  const buckets = mergeIntoBuckets(marketId, items);
  return [...buckets.values()].map(({ store, items: cartItems }) =>
    entryMetrics(marketId, store, cartItems),
  );
}

export type PlanRoutesOptions = {
  gps?: LatLng | null;
};

export function planRoutes(
  marketId: MarketId,
  items: CartItem[],
  opts?: PlanRoutesOptions,
): Record<RouteType, PlannedRoute> | null {
  if (items.length === 0) return null;

  // 가까운 입구 판정용: 이미 상점이 정해진 아이템 좌표
  const focusPoints: LatLng[] = [];
  const stores = getSearchableStores(marketId);
  for (const item of items) {
    if (item.unresolved || !item.storeId) continue;
    const store = stores.find((s) => s.id === item.storeId);
    if (!store) continue;
    focusPoints.push(pickStoreDisplayLatLng(marketId, store));
  }

  const ctx = createRoutingContext(marketId, {
    gps: opts?.gps,
    focusPoints: focusPoints.length > 0 ? focusPoints : undefined,
  });

  const cheapAssign = assignCheapest(marketId, items);
  const shortAssign = assignShortest(marketId, items, ctx);
  const balAssign = assignBalanced(marketId, items, ctx);

  const cheapStops = buildStops(marketId, cheapAssign.items);
  const shortStops = buildStops(marketId, shortAssign.items);
  const balStops = buildStops(marketId, balAssign.items);

  if (cheapStops.length === 0 && shortStops.length === 0 && balStops.length === 0) {
    return null;
  }

  const cheapPath = savingsFirstThenNn(ctx, cheapStops);
  const shortPath = nearestNeighborOrder(ctx, shortStops);
  const balPath = balancedOrder(ctx, balStops);

  const pack = (
    type: RouteType,
    path: PlannedStop[],
    assign: AssignmentResult,
  ): PlannedRoute => {
    const distance = Math.round(path.reduce((s, e) => s + e.hopDistance, 0));
    const totalBase = path.reduce((s, e) => s + e.basePrice, 0);
    const totalSavings = path.reduce((s, e) => s + e.discountSavings, 0);
    const savings =
      type === "cheapest" ? totalSavings : type === "balanced" ? Math.round(totalSavings * 0.65) : 0;
    return {
      type,
      path,
      totalPrice: totalBase,
      savings,
      distance,
      time: walkMinutes(distance),
      usedWalkGraph: ctx.hasGraph,
      unresolvedAssigned: assign.assigned,
      unresolvedSkipped: assign.skipped,
      startSource: ctx.startSource,
      startLabel: ctx.startLabel,
    };
  };

  return {
    cheapest: pack("cheapest", cheapPath, cheapAssign),
    shortest: pack("shortest", shortPath, shortAssign),
    balanced: pack("balanced", balPath, balAssign),
  };
}
