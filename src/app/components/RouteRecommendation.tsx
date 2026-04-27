import { useState, useMemo } from "react";
import { TrendingDown, Navigation, Zap, MapPin, Clock, Tag, ChevronRight, AlertCircle } from "lucide-react";
import type { CartItem, MarketId } from "./CartContext";
import { STORES_BY_MARKET, MAP_CONFIGS, type StoreData } from "../data/storeData";
import { Link } from "react-router";

type RouteType = "cheapest" | "shortest" | "balanced";

interface CartStoreEntry {
  store: StoreData;
  cartItems: CartItem[];
  basePrice: number;       // sum of item.price * qty (already discounted if on sale)
  discountSavings: number; // extra savings possible (originalPrice - price) * qty
  hopDistance: number;     // meters from previous stop (computed per route)
}

// 1 map unit ≈ 3 metres, walk speed ≈ 70 m/min
const SCALE = 3;
const WALK_SPEED = 70;

// Market entrance: bottom-centre of map
const ENTRY = { mx: 50, my: 100 };

function dist(a: { mx: number; my: number }, b: { mx: number; my: number }) {
  return Math.sqrt((a.mx - b.mx) ** 2 + (a.my - b.my) ** 2);
}

function withHops(path: CartStoreEntry[]): CartStoreEntry[] {
  let prev: { mx: number; my: number } = ENTRY;
  return path.map((e) => {
    const hop = Math.round(dist(prev, e.store) * SCALE);
    prev = e.store;
    return { ...e, hopDistance: hop };
  });
}

function nearestNeighbor(
  entries: CartStoreEntry[],
  start: { mx: number; my: number },
): CartStoreEntry[] {
  const rem = [...entries];
  const path: CartStoreEntry[] = [];
  let cur = start;
  while (rem.length) {
    let bi = 0;
    let bd = Infinity;
    rem.forEach((e, i) => {
      const d = dist(cur, e.store);
      if (d < bd) { bd = d; bi = i; }
    });
    path.push(rem[bi]);
    cur = rem[bi].store;
    rem.splice(bi, 1);
  }
  return withHops(path);
}

function cheapestOrder(entries: CartStoreEntry[]): CartStoreEntry[] {
  // Visit discount stores first (sorted by savings desc),
  // then remaining stores via nearest-neighbour
  const withDiscount = [...entries]
    .filter((e) => e.discountSavings > 0)
    .sort((a, b) => b.discountSavings - a.discountSavings);
  const without = entries.filter((e) => e.discountSavings === 0);

  if (withDiscount.length === 0) return nearestNeighbor(entries, ENTRY);

  const lastPos = withDiscount[withDiscount.length - 1].store;
  const restPath = without.length > 0 ? nearestNeighbor(without, lastPos) : [];
  return withHops([...withDiscount, ...restPath]);
}

function balancedOrder(entries: CartStoreEntry[]): CartStoreEntry[] {
  // Weighted nearest-neighbour: prefers stores with savings nearby
  const rem = [...entries];
  const path: CartStoreEntry[] = [];
  let cur: { mx: number; my: number } = ENTRY;
  while (rem.length) {
    const maxSavings = Math.max(...rem.map((e) => e.discountSavings), 1);
    const maxD = Math.max(...rem.map((e) => dist(cur, e.store)), 1);
    let bi = 0;
    let bs = Infinity;
    rem.forEach((e, i) => {
      const nd = dist(cur, e.store) / maxD;           // 0-1
      const ns = e.discountSavings / maxSavings;       // 0-1
      const score = nd * 0.55 - ns * 0.45;            // lower is better
      if (score < bs) { bs = score; bi = i; }
    });
    path.push(rem[bi]);
    cur = rem[bi].store;
    rem.splice(bi, 1);
  }
  return withHops(path);
}

function totalMetrics(path: CartStoreEntry[]) {
  const distance = path.reduce((s, e) => s + e.hopDistance, 0);
  const time = Math.max(1, Math.ceil(distance / WALK_SPEED));
  return { distance, time };
}

// ─────────────────── Component ───────────────────

const ROUTE_META = {
  cheapest: {
    label: "💰",
    title: "최저가 경로",
    desc: "할인 매장 먼저 방문해 최대 절약",
    color: "bg-emerald-600",
    border: "border-emerald-600",
    lineColor: "#059669",
    textColor: "text-emerald-600",
    light: "bg-emerald-50",
    icon: TrendingDown,
  },
  shortest: {
    label: "🚶",
    title: "최단거리 경로",
    desc: "지리적으로 최적화된 동선",
    color: "bg-blue-600",
    border: "border-blue-600",
    lineColor: "#2563EB",
    textColor: "text-blue-600",
    light: "bg-blue-50",
    icon: Navigation,
  },
  balanced: {
    label: "⭐",
    title: "가성비 경로",
    desc: "절약과 동선의 최적 밸런스",
    color: "bg-orange-500",
    border: "border-orange-500",
    lineColor: "#F97316",
    textColor: "text-orange-500",
    light: "bg-orange-50",
    icon: Zap,
  },
} as const;

interface Props {
  items: CartItem[];
  marketId: MarketId | null;
}

export function RouteRecommendation({ items, marketId }: Props) {
  const [selected, setSelected] = useState<RouteType>("balanced");

  // Build per-store groupings
  const storeEntries = useMemo<CartStoreEntry[]>(() => {
    if (!marketId || items.length === 0) return [];
    const stores = STORES_BY_MARKET[marketId];
    const map = new Map<number, CartStoreEntry>();

    items.forEach((item) => {
      const store = stores.find((s) => s.id === item.storeId);
      if (!store) return;
      if (!map.has(item.storeId)) {
        map.set(item.storeId, { store, cartItems: [], basePrice: 0, discountSavings: 0, hopDistance: 0 });
      }
      const entry = map.get(item.storeId)!;
      entry.cartItems.push(item);
      entry.basePrice += item.price * item.quantity;

      // Check if the menu item is already discounted (has originalPrice)
      const menu = store.menus.find((m) => m.id === item.id);
      if (menu?.originalPrice) {
        entry.discountSavings += (menu.originalPrice - item.price) * item.quantity;
      }
    });

    return Array.from(map.values());
  }, [items, marketId]);

  const routes = useMemo(() => {
    if (storeEntries.length === 0) return null;

    const totalBase = storeEntries.reduce((s, e) => s + e.basePrice, 0);
    const totalSavings = storeEntries.reduce((s, e) => s + e.discountSavings, 0);

    const cpPath = cheapestOrder(storeEntries);
    const shPath = nearestNeighbor(storeEntries, ENTRY);
    const blPath = balancedOrder(storeEntries);

    const cpMetrics = totalMetrics(cpPath);
    const shMetrics = totalMetrics(shPath);
    const blMetrics = totalMetrics(blPath);

    // Savings model:
    // cheapest:  full discount savings (you hit deals while they're still available)
    // shortest:  0 savings (visiting by distance might mean you arrive too late for deals)
    // balanced:  ~65% savings (good balance)
    const blSavings = totalSavings > 0 ? Math.round(totalSavings * 0.65) : 0;

    return {
      cheapest: {
        path: cpPath,
        totalPrice: totalBase - totalSavings,
        savings: totalSavings,
        ...cpMetrics,
      },
      shortest: {
        path: shPath,
        totalPrice: totalBase,
        savings: 0,
        ...shMetrics,
      },
      balanced: {
        path: blPath,
        totalPrice: totalBase - blSavings,
        savings: blSavings,
        ...blMetrics,
      },
    };
  }, [storeEntries]);

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400">
        <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-200" />
        <p className="text-[13px]">상품을 담으면 경로를 추천해 드려요</p>
      </div>
    );
  }

  if (!routes || storeEntries.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-200" />
        <p className="text-[13px]">경로를 계산할 수 없어요</p>
      </div>
    );
  }

  const selectedRoute = routes[selected];
  const meta = ROUTE_META[selected];
  const mapCfg = marketId ? MAP_CONFIGS[marketId] : null;

  return (
    <div>
      {/* Route selector cards */}
      <div className="space-y-2 mb-4">
        {(["cheapest", "shortest", "balanced"] as RouteType[]).map((type) => {
          const r = routes[type];
          const m = ROUTE_META[type];
          const Icon = m.icon;
          const isActive = selected === type;
          return (
            <button
              key={type}
              onClick={() => setSelected(type)}
              className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                isActive ? `${m.border} bg-white` : "border-gray-100 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`${m.color} text-white p-2 rounded-lg flex-shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-[14px] text-gray-900">
                      {m.label} {m.title}
                    </h3>
                    {r.savings > 0 && (
                      <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full flex-shrink-0">
                        -{r.savings.toLocaleString()}원 절약
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mb-1.5">{m.desc}</p>
                  <div className="flex gap-3 text-[12px] text-gray-500">
                    <span className="text-gray-900">{r.totalPrice.toLocaleString()}원</span>
                    <span className="flex items-center gap-0.5">
                      <Navigation className="w-3 h-3" />{r.distance}m
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />약 {r.time}분
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />{r.path.length}곳
                    </span>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isActive ? m.textColor : "text-gray-300"}`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Special note for cheapest route */}
      {selected === "cheapest" && routes.cheapest.savings > 0 && (
        <div className="mb-3 px-3 py-2.5 bg-red-50 rounded-lg flex items-start gap-2">
          <Tag className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-600 leading-relaxed">
            마감할인 매장을 먼저 방문해 <strong>{routes.cheapest.savings.toLocaleString()}원</strong>을 절약하는 경로예요.
            할인 상품은 수량이 적을 수 있으니 일찍 방문하세요!
          </p>
        </div>
      )}
      {selected === "shortest" && routes.shortest.savings === 0 && storeEntries.some(e => e.discountSavings > 0) && (
        <div className="mb-3 px-3 py-2.5 bg-blue-50 rounded-lg flex items-start gap-2">
          <Navigation className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-600 leading-relaxed">
            거리를 최우선으로 최적화한 경로예요. 할인 상품을 먼저 챙기려면 💰 최저가 경로를 이용해보세요.
          </p>
        </div>
      )}

      {/* Step-by-step detail */}
      <div className="border border-gray-100 rounded-xl overflow-hidden">
        <div className={`px-4 py-2.5 ${meta.light} border-b border-gray-100 flex items-center justify-between`}>
          <span className={`text-[13px] ${meta.textColor}`}>{meta.label} {meta.title} 상세</span>
          <span className="text-[11px] text-gray-500">{selectedRoute.distance}m · {selectedRoute.time}분</span>
        </div>
        <div className="p-3 space-y-0">
          {/* Entry point */}
          <div className="flex gap-3 items-center mb-1">
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center text-[10px]">
                출
              </div>
              <div className="w-px h-4 bg-gray-200 my-0.5" />
            </div>
            <span className="text-[12px] text-gray-400">시장 입구 출발</span>
          </div>

          {selectedRoute.path.map((entry, idx) => {
            const isLast = idx === selectedRoute.path.length - 1;
            const hasDiscount = entry.discountSavings > 0;
            return (
              <div key={entry.store.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-6 h-6 ${meta.color} text-white rounded-full flex items-center justify-center text-[11px] flex-shrink-0`}
                  >
                    {idx + 1}
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-gray-200 my-1 min-h-[16px]" />}
                </div>
                <div className={`flex-1 pb-3 ${isLast ? "" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] text-gray-900">{entry.store.name}</span>
                        {hasDiscount && (
                          <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">
                            -{entry.discountSavings.toLocaleString()}원↓
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5">
                        <Navigation className="w-3 h-3" />
                        <span>{entry.hopDistance}m 이동</span>
                        <span className="text-gray-200">·</span>
                        <span>{entry.store.location}</span>
                      </div>
                    </div>
                    <span className="text-[13px] text-gray-900 flex-shrink-0">
                      {entry.basePrice.toLocaleString()}원
                    </span>
                  </div>
                  {/* Items to buy */}
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {entry.cartItems.map((ci) => (
                      <span
                        key={ci.id}
                        className={`text-[11px] px-2 py-0.5 rounded-md ${
                          hasDiscount ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {ci.name}
                        {ci.quantity > 1 && <span className="text-gray-400"> ×{ci.quantity}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary bar */}
        <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between bg-gray-50">
          <div className="text-[12px] text-gray-500 space-y-0.5">
            <div>총 {selectedRoute.path.length}개 매장 · {selectedRoute.distance}m 이동</div>
            {selectedRoute.savings > 0 && (
              <div className="text-emerald-600">
                최대 {selectedRoute.savings.toLocaleString()}원 절약 가능
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[18px] text-gray-900">{selectedRoute.totalPrice.toLocaleString()}원</div>
            <div className="text-[11px] text-gray-400">예상 합계</div>
          </div>
        </div>
      </div>

      {/* Mini Route Map */}
      <div className="mt-3 rounded-xl overflow-hidden border border-gray-100 relative" style={{ height: 160 }}>
        {mapCfg && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <rect x="0" y="0" width="100" height="100" fill="#F0F1F3" />
            {mapCfg.blocks.map((b, i) => (
              <rect
                key={i} x={b.x + 0.5} y={b.y + 0.5} width={b.w - 1} height={b.h - 1}
                fill={i % 3 === 0 ? "#F7F8FA" : i % 3 === 1 ? "#F0F1F3" : "#E8E9EC"} rx="0.5"
              />
            ))}
            {mapCfg.roads.map((d, i) => (
              <path key={i} d={d} stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
            ))}
            {/* Route line */}
            {selectedRoute.path.length > 0 && (
              <polyline
                points={[
                  `${ENTRY.mx},${ENTRY.my}`,
                  ...selectedRoute.path.map((e) => `${e.store.mx},${e.store.my}`),
                ].join(" ")}
                stroke={meta.lineColor}
                strokeWidth="1.8"
                fill="none"
                strokeDasharray="3 2"
                opacity="0.85"
              />
            )}
          </svg>
        )}
        {/* Entry marker */}
        <div
          className="absolute flex flex-col items-center"
          style={{ left: `${ENTRY.mx}%`, top: `${ENTRY.my}%`, transform: "translate(-50%, -100%)" }}
        >
          <div className="w-5 h-5 bg-gray-800 rounded-full border-2 border-white flex items-center justify-center shadow text-[8px] text-white">
            출
          </div>
        </div>
        {/* Store markers */}
        {selectedRoute.path.map((entry, i) => (
          <div
            key={entry.store.id}
            className="absolute flex flex-col items-center"
            style={{ left: `${entry.store.mx}%`, top: `${entry.store.my}%`, transform: "translate(-50%, -50%)" }}
          >
            <div
              className={`w-6 h-6 ${meta.color} text-white rounded-full flex items-center justify-center text-[10px] shadow border-2 border-white z-10 relative`}
            >
              {i + 1}
            </div>
            {i === 0 && (
              <div className="absolute top-7 whitespace-nowrap bg-white text-[8px] text-gray-700 px-1.5 py-0.5 rounded shadow-sm">
                {entry.store.name}
              </div>
            )}
          </div>
        ))}
      </div>

      <Link
        to="/map"
        className="mt-2.5 flex items-center justify-center gap-1.5 w-full py-3 bg-gray-100 text-gray-600 rounded-xl text-[13px] active:bg-gray-200 transition-colors"
      >
        <MapPin className="w-4 h-4" />
        지도에서 자세히 보기
      </Link>
    </div>
  );
}