import type { MarketId } from "../components/CartContext";
import type { StoreData } from "../data/storeData";

export const MARKET_VIEW_CONFIG: Record<
  MarketId,
  {
    center: { lat: number; lng: number };
    zoom: number;
    fillColor: string;
    areaPaths: Array<Array<{ lat: number; lng: number }>>;
  }
> = {
  jungang: {
    center: { lat: 36.802220, lng: 127.149411 },
    zoom: 15.4,
    fillColor: "#2563EB",
    areaPaths: [
      [
        { lat: 36.804099, lng: 127.148671 },
        { lat: 36.804099, lng: 127.149905 },
        { lat: 36.800137, lng: 127.149905 },
        { lat: 36.800137, lng: 127.148671 },
      ],
      [
        { lat: 36.803683, lng: 127.149905 },
        { lat: 36.803683, lng: 127.150225 },
        { lat: 36.803487, lng: 127.150225 },
        { lat: 36.803487, lng: 127.149905 },
      ],
      [
        { lat: 36.803035, lng: 127.149905 },
        { lat: 36.803035, lng: 127.150314 },
        { lat: 36.802786, lng: 127.150314 },
        { lat: 36.802786, lng: 127.149905 },
      ],
    ],
  },
  byeongcheon: {
    center: { lat: 36.810152, lng: 127.149018 },
    zoom: 17,
    fillColor: "#16A34A",
    areaPaths: [
      [
        { lat: 36.809302, lng: 127.148552 },
        { lat: 36.810976, lng: 127.149064 },
        { lat: 36.810871, lng: 127.149528 },
        { lat: 36.809180, lng: 127.148898 },
      ],
    ],
  },
  seonghwan: {
    center: { lat: 36.918910, lng: 127.130431 },
    zoom: 17,
    fillColor: "#EA580C",
    areaPaths: [
      [
        { lat: 36.918485, lng: 127.130249 },
        { lat: 36.918721, lng: 127.129787 },
        { lat: 36.919403, lng: 127.130168 },
        { lat: 36.918936, lng: 127.131198 },
      ],
    ],
  },
};

export function toStoreLatLng(center: { lat: number; lng: number }, mx: number, my: number) {
  const latSpan = 0.003;
  const lngSpan = 0.0035;
  return {
    lat: center.lat + (50 - my) * (latSpan / 100),
    lng: center.lng + (mx - 50) * (lngSpan / 100),
  };
}

function pointInMarketRing(lat: number, lng: number, ring: Array<{ lat: number; lng: number }>): boolean {
  if (ring.length < 3) return false;
  const x = lng;
  const y = lat;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i].lng;
    const yi = ring[i].lat;
    const xj = ring[j].lng;
    const yj = ring[j].lat;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function isLatLngInsideMarketArea(marketId: MarketId, lat: number, lng: number): boolean {
  return MARKET_VIEW_CONFIG[marketId].areaPaths.some((path) => pointInMarketRing(lat, lng, path));
}

/** 관리자 시드 id(10001 등)와 메인 지도 시드 id(1)가 달라도 같은 나선 보정을 쓰도록 */
function spiralAnchorStoreId(storeId: number): number {
  if (storeId >= 10000) return storeId % 10000 || storeId;
  return storeId;
}

export type StorePlacementPin = Pick<StoreData, "id" | "mx" | "my"> & { lat?: number; lng?: number };

export type StoreDraftLatLng = { lat?: number; lng?: number };

/**
 * 지도에 찍을 좌표.
 * - 저장된 초안(override) 또는 상점에 직접 붙은 lat·lng가 있으면 **그대로 사용**한다.
 *   (사장님이 찍은 핀이 폴리곤 경계 밖으로 분류돼도 무시되면 안 됨)
 * - 좌표가 없을 때만 mx/my·시장 안 나선 보정으로 계산한다.
 */
export function pickStoreDisplayLatLng(
  marketId: MarketId,
  store: StorePlacementPin,
  override?: StoreDraftLatLng | null,
): { lat: number; lng: number } {
  const view = MARKET_VIEW_CONFIG[marketId];

  const usablePair = (lat: number, lng: number) =>
    Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

  if (
    override &&
    typeof override.lat === "number" &&
    typeof override.lng === "number" &&
    usablePair(override.lat, override.lng)
  ) {
    return { lat: override.lat, lng: override.lng };
  }

  if (typeof store.lat === "number" && typeof store.lng === "number" && usablePair(store.lat, store.lng)) {
    return { lat: store.lat, lng: store.lng };
  }

  const fromMxMy = toStoreLatLng(view.center, store.mx, store.my);
  if (isLatLngInsideMarketArea(marketId, fromMxMy.lat, fromMxMy.lng)) {
    return fromMxMy;
  }

  const golden = 2.39996322972865332;
  const sid = spiralAnchorStoreId(store.id);
  const angle = ((sid * golden) % (2 * Math.PI)) + marketId.charCodeAt(0) * 0.02;
  let r = 0.00009 * (1 + (sid % 5));
  for (let attempt = 0; attempt < 14; attempt++) {
    const lat = view.center.lat + Math.cos(angle) * r * 0.55;
    const lng = view.center.lng + Math.sin(angle) * r;
    if (isLatLngInsideMarketArea(marketId, lat, lng)) return { lat, lng };
    r *= 0.62;
  }
  return { lat: view.center.lat, lng: view.center.lng };
}
