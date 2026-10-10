import { useEffect, useMemo, useState } from "react";
import { TrendingDown, Navigation, Zap, MapPin, Clock, Tag, ChevronRight, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router";
import type { CartItem, MarketId } from "./CartContext";
import { MAP_CONFIGS } from "../data/storeData";
import { planRoutes, type RouteType } from "../data/routePlanner";
import { saveActiveNavRoute } from "../data/activeNavRoute";
import {
  buildTourLatLngPath,
  createRoutingContext,
  getUserLatLng,
  type LatLng,
} from "../data/walkRouting";
import { pickStoreDisplayLatLng } from "../map/storeMapPlacement";
import { getSearchableStores } from "../data/productSearch";

const ROUTE_META = {
  cheapest: {
    label: "💰",
    title: "최저가 경로",
    desc: "미지정 상품은 가장 싼 상점으로, 할인 매장 우선 방문",
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
    desc: "보행경로 기준 가장 짧은 동선",
    color: "bg-blue-600",
    border: "border-blue-600",
    lineColor: "#2563EB",
    textColor: "text-blue-600",
    light: "bg-blue-50",
    icon: Navigation,
  },
  balanced: {
    label: "⭐",
    title: "추천 경로",
    desc: "가격과 거리를 함께 고려한 밸런스",
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
  const navigate = useNavigate();
  const [selected, setSelected] = useState<RouteType>("balanced");
  const [gps, setGps] = useState<LatLng | null>(null);
  const [gpsReady, setGpsReady] = useState(false);

  const unresolvedCount = useMemo(() => items.filter((i) => i.unresolved).length, [items]);

  const [walkHydrated, setWalkHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setGpsReady(false);
    void getUserLatLng().then((pos) => {
      if (cancelled) return;
      setGps(pos);
      setGpsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!marketId) return;
    let cancelled = false;
    setWalkHydrated(false);
    void import("../data/walkPathSeed").then(({ hydrateWalkPathGraph }) =>
      hydrateWalkPathGraph(marketId).then(() => {
        if (!cancelled) setWalkHydrated(true);
      }),
    );
    return () => {
      cancelled = true;
    };
  }, [marketId]);

  const routes = useMemo(() => {
    if (!marketId || items.length === 0) return null;
    // GPS·보행경로 서버 동기화 후에도 다시 계산
    void walkHydrated;
    return planRoutes(marketId, items, { gps: gpsReady ? gps : null });
  }, [items, marketId, gps, gpsReady, walkHydrated]);

  const openRouteOnMap = () => {
    if (!marketId || !routes) return;
    const planned = routes[selected];
    const meta = ROUTE_META[selected];

    const focusPoints: LatLng[] = [];
    const stores = getSearchableStores(marketId);
    for (const item of items) {
      if (item.unresolved || !item.storeId) continue;
      const store = stores.find((s) => s.id === item.storeId);
      if (store) focusPoints.push(pickStoreDisplayLatLng(marketId, store));
    }
    for (const stop of planned.path) {
      focusPoints.push({ lat: stop.lat, lng: stop.lng });
    }

    const ctx = createRoutingContext(marketId, {
      gps: gpsReady ? gps : null,
      focusPoints: focusPoints.length > 0 ? focusPoints : undefined,
    });
    const stops = planned.path.map((s, i) => ({
      storeId: s.store.id,
      storeName: s.store.name,
      lat: s.lat,
      lng: s.lng,
      order: i + 1,
      itemNames: s.cartItems.map((c) => c.name),
    }));
    const pathLatLng = buildTourLatLngPath(
      ctx,
      stops.map((s) => ({ lat: s.lat, lng: s.lng, storeId: s.storeId })),
    );
    saveActiveNavRoute({
      marketId,
      routeType: selected,
      title: `${meta.label} ${meta.title}`,
      lineColor: meta.lineColor,
      distance: planned.distance,
      time: planned.time,
      stops,
      pathLatLng,
      startLabel: planned.startLabel,
      startSource: planned.startSource,
      savedAt: new Date().toISOString(),
    });
    navigate(`/map?market=${marketId}&navRoute=1`);
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-6 text-[#6B5142]">
        <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-200" />
        <p className="text-[13px]">상품을 담으면 경로를 추천해 드려요</p>
      </div>
    );
  }

  if (!routes) {
    return (
      <div className="text-center py-6 text-[#6B5142]">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-200" />
        <p className="text-[13px]">경로를 계산할 수 없어요</p>
        <p className="text-[11px] mt-1 text-[#9A897F]">
          상점 미지정 상품만 있고 매칭되는 상점이 없거나, 상점 정보가 부족해요
        </p>
      </div>
    );
  }

  const selectedRoute = routes[selected];
  const meta = ROUTE_META[selected];
  const mapCfg = marketId ? MAP_CONFIGS[marketId] : null;
  const usedGraph = selectedRoute.usedWalkGraph;

  return (
    <div>
      <div className="mb-3 px-3 py-2.5 bg-[#F7F5F1] rounded-lg text-[11px] text-[#6B5142] leading-relaxed">
        출발: <span className="text-[#46352C] font-medium">{selectedRoute.startLabel}</span>
        {!gpsReady
          ? " · 위치 확인 중…"
          : selectedRoute.startSource === "gps"
            ? " · GPS 기준"
            : " · GPS 없거나 멀어서 입구 기준"}
      </div>

      {!usedGraph && (
        <div className="mb-3 px-3 py-2.5 bg-amber-50 rounded-lg text-[11px] text-amber-700 leading-relaxed">
          보행경로가 아직 없어요. 직선 거리로 대략 계산합니다.
          관리자에서 보행경로를 그리면 통로 기준으로 더 정확해져요.
        </div>
      )}

      {unresolvedCount > 0 && selectedRoute.unresolvedAssigned > 0 && (
        <div className="mb-3 px-3 py-2.5 bg-sky-50 rounded-lg text-[11px] text-sky-700 leading-relaxed">
          상점 미지정 {selectedRoute.unresolvedAssigned}개 상품을 이 경로 기준으로 상점에 배정했어요.
          {selectedRoute.unresolvedSkipped > 0 &&
            ` (매칭 실패 ${selectedRoute.unresolvedSkipped}개는 제외)`}
        </div>
      )}

      <div className="space-y-2 mb-4">
        {(["cheapest", "shortest", "balanced"] as RouteType[]).map((type) => {
          const r = routes[type];
          const m = ROUTE_META[type];
          const Icon = m.icon;
          const isActive = selected === type;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setSelected(type)}
              className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                isActive ? `${m.border} bg-white` : "border-[#EDE5D8] bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`${m.color} text-white p-2 rounded-lg flex-shrink-0`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="text-[14px] text-[#46352C]">
                      {m.label} {m.title}
                    </h3>
                    {r.savings > 0 && (
                      <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full flex-shrink-0">
                        할인 {r.savings.toLocaleString()}원
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#6B5142] mb-1.5">{m.desc}</p>
                  <div className="flex gap-3 text-[12px] text-[#6B5142]">
                    <span className="text-[#46352C]">{r.totalPrice.toLocaleString()}원</span>
                    <span className="flex items-center gap-0.5">
                      <Navigation className="w-3 h-3" />
                      {r.distance}m
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />약 {r.time}분
                    </span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      {r.path.length}곳
                    </span>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isActive ? m.textColor : "text-[#9A897F]"}`} />
              </div>
            </button>
          );
        })}
      </div>

      {selected === "cheapest" && routes.cheapest.savings > 0 && (
        <div className="mb-3 px-3 py-2.5 bg-red-50 rounded-lg flex items-start gap-2">
          <Tag className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-red-600 leading-relaxed">
            할인·최저가 매장을 우선 반영한 경로예요. 할인 상품은 수량이 적을 수 있으니 일찍 방문하세요.
          </p>
        </div>
      )}
      {selected === "shortest" && (
        <div className="mb-3 px-3 py-2.5 bg-blue-50 rounded-lg flex items-start gap-2">
          <Navigation className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-blue-600 leading-relaxed">
            {usedGraph
              ? "보행경로(통로) 위에서 계산한 최단 동선이에요."
              : "거리를 최우선으로 최적화한 경로예요. 보행경로를 등록하면 통로 기준으로 더 정확해져요."}
          </p>
        </div>
      )}

      <div className="border border-[#EDE5D8] rounded-xl overflow-hidden">
        <div className={`px-4 py-2.5 ${meta.light} border-b border-[#EDE5D8] flex items-center justify-between`}>
          <span className={`text-[13px] ${meta.textColor}`}>
            {meta.label} {meta.title} 상세
          </span>
          <span className="text-[11px] text-[#6B5142]">
            {selectedRoute.distance}m · {selectedRoute.time}분
          </span>
        </div>
        <div className="p-3 space-y-0">
          <div className="flex gap-3 items-center mb-1">
            <div className="flex flex-col items-center">
              <div className="w-6 h-6 bg-[#6B5142] text-white rounded-full flex items-center justify-center text-[10px]">
                {selectedRoute.startSource === "gps" ? "나" : "출"}
              </div>
              <div className="w-px h-4 bg-[#EFE4D8] my-0.5" />
            </div>
            <span className="text-[12px] text-[#6B5142]">{selectedRoute.startLabel}에서 출발</span>
          </div>

          {selectedRoute.path.map((entry, idx) => {
            const isLast = idx === selectedRoute.path.length - 1;
            const hasDiscount = entry.discountSavings > 0;
            return (
              <div key={`${entry.store.id}-${idx}`} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-6 h-6 ${meta.color} text-white rounded-full flex items-center justify-center text-[11px] flex-shrink-0`}
                  >
                    {idx + 1}
                  </div>
                  {!isLast && <div className="w-px flex-1 bg-[#EFE4D8] my-1 min-h-[16px]" />}
                </div>
                <div className="flex-1 pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[14px] text-[#46352C]">{entry.store.name}</span>
                        {hasDiscount && (
                          <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">
                            할인
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-[#6B5142] mt-0.5">
                        <Navigation className="w-3 h-3" />
                        <span>{entry.hopDistance}m 이동</span>
                        {entry.store.location && (
                          <>
                            <span className="text-gray-200">·</span>
                            <span>{entry.store.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span className="text-[13px] text-[#46352C] flex-shrink-0">
                      {entry.basePrice.toLocaleString()}원
                    </span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {entry.cartItems.map((ci) => (
                      <span
                        key={ci.id}
                        className={`text-[11px] px-2 py-0.5 rounded-md ${
                          hasDiscount ? "bg-red-50 text-red-700" : "bg-[#F5F0E7] text-[#6B5142]"
                        }`}
                      >
                        {ci.name}
                        {ci.quantity > 1 && <span className="text-[#6B5142]"> ×{ci.quantity}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="border-t border-[#EDE5D8] px-4 py-3 flex items-center justify-between bg-[#F7F5F1]">
          <div className="text-[12px] text-[#6B5142] space-y-0.5">
            <div>
              총 {selectedRoute.path.length}개 매장 · {selectedRoute.distance}m 이동
              {usedGraph ? " (보행경로)" : " (직선 추정)"}
            </div>
            {selectedRoute.savings > 0 && (
              <div className="text-emerald-600">메뉴 할인 약 {selectedRoute.savings.toLocaleString()}원</div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[18px] text-[#46352C]">{selectedRoute.totalPrice.toLocaleString()}원</div>
            <div className="text-[11px] text-[#6B5142]">예상 합계</div>
          </div>
        </div>
      </div>

      {/* Mini schematic map */}
      <div className="mt-3 rounded-xl overflow-hidden border border-[#EDE5D8] relative" style={{ height: 160 }}>
        {mapCfg && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
            <rect x="0" y="0" width="100" height="100" fill="#F0F1F3" />
            {mapCfg.blocks.map((b, i) => (
              <rect
                key={i}
                x={b.x + 0.5}
                y={b.y + 0.5}
                width={b.w - 1}
                height={b.h - 1}
                fill={i % 3 === 0 ? "#F7F8FA" : i % 3 === 1 ? "#F0F1F3" : "#E8E9EC"}
                rx="0.5"
              />
            ))}
            {mapCfg.roads.map((d, i) => (
              <path key={i} d={d} stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
            ))}
            {selectedRoute.path.length > 0 && (
              <polyline
                points={[
                  `50,100`,
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
        <div
          className="absolute flex flex-col items-center"
          style={{ left: "50%", top: "100%", transform: "translate(-50%, -100%)" }}
        >
          <div className="w-5 h-5 bg-[#6B5142] rounded-full border-2 border-white flex items-center justify-center shadow text-[8px] text-white">
            {selectedRoute.startSource === "gps" ? "나" : "출"}
          </div>
        </div>
        {selectedRoute.path.map((entry, i) => (
          <div
            key={`${entry.store.id}-pin-${i}`}
            className="absolute flex flex-col items-center"
            style={{
              left: `${entry.store.mx}%`,
              top: `${entry.store.my}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className={`w-6 h-6 ${meta.color} text-white rounded-full flex items-center justify-center text-[10px] shadow border-2 border-white z-10 relative`}
            >
              {i + 1}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={openRouteOnMap}
        className="mt-2.5 flex items-center justify-center gap-1.5 w-full py-3 bg-[#5B4335] text-white rounded-xl text-[13px] active:bg-[#6B5142] transition-colors"
      >
        <MapPin className="w-4 h-4" />
        지도에서 경로 보기
      </button>
    </div>
  );
}
