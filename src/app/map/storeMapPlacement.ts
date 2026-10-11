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

export type StorePlacementPin = Pick<StoreData, "id"> & {
  mx?: number;
  my?: number;
  lat?: number;
  lng?: number;
};

export type StoreDraftLatLng = { lat?: number; lng?: number };

/** 대략적인 거리(m). 시드 좌표가 시장에서 너무 멀면 잘못된 데이터로 본다. */
function roughMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = (a.lat - b.lat) * 111_320;
  const dLng = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

/** 시장 안이거나, 중심에서 약 400m 이내면 유효한 위치로 본다 */
export function isLatLngNearMarket(marketId: MarketId, lat: number, lng: number): boolean {
  if (isLatLngInsideMarketArea(marketId, lat, lng)) return true;
  return roughMeters(MARKET_VIEW_CONFIG[marketId].center, { lat, lng }) <= 400;
}

function spiralLatLng(marketId: MarketId, storeId: number): { lat: number; lng: number } {
  const view = MARKET_VIEW_CONFIG[marketId];
  const golden = 2.39996322972865332;
  const sid = spiralAnchorStoreId(storeId);
  const angle = ((sid * golden) % (2 * Math.PI)) + marketId.charCodeAt(0) * 0.02;
  let r = 0.00009 * (1 + (sid % 5));
  for (let attempt = 0; attempt < 14; attempt++) {
    const lat = view.center.lat + Math.cos(angle) * r * 0.55;
    const lng = view.center.lng + Math.sin(angle) * r;
    if (isLatLngInsideMarketArea(marketId, lat, lng)) return { lat, lng };
    r *= 0.62;
  }
  return {
    lat: view.center.lat + Math.cos(angle) * 0.00012,
    lng: view.center.lng + Math.sin(angle) * 0.00018,
  };
}

/**
 * 같은 좌표에 쌓인 핀을 살짝 펼쳐 개수가 보이게 한다.
 * (위치 미지정 상점이 한 점에 겹치는 경우 대비)
 */
export function spreadOverlappingLatLngs<T extends { id: number; lat: number; lng: number }>(
  items: T[],
  opts?: { minMeters?: number },
): T[] {
  const minMeters = opts?.minMeters ?? 10;
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = `${item.lat.toFixed(5)},${item.lng.toFixed(5)}`;
    const list = groups.get(key);
    if (list) list.push(item);
    else groups.set(key, [item]);
  }

  const moved = new Map<number, T>();
  for (const group of groups.values()) {
    if (group.length === 1) {
      moved.set(group[0].id, group[0]);
      continue;
    }
    group.forEach((item, i) => {
      const angle = (2 * Math.PI * i) / group.length + i * 0.15;
      const ring = 1 + Math.floor(i / Math.max(6, group.length));
      const meters = minMeters * ring;
      const dLat = (Math.cos(angle) * meters) / 111_320;
      const dLng =
        (Math.sin(angle) * meters) / (111_320 * Math.cos((item.lat * Math.PI) / 180));
      moved.set(item.id, { ...item, lat: item.lat + dLat, lng: item.lng + dLng });
    });
  }

  return items.map((item) => moved.get(item.id) ?? item);
}

/**
 * 지도에 찍을 좌표.
 * - 관리자/사장님이 저장한 초안(override) lat·lng는 시장 근처일 때 사용
 * - 시드 lat·lng는 시장 근처일 때만 사용
 * - mx/my가 있으면 그걸로 보정 (미배치 상점의 기본 50,50 강제 사용 금지)
 * - 없으면 상점 id별 나선 배치 (한 점에 몰리지 않음)
 */
export function pickStoreDisplayLatLng(
  marketId: MarketId,
  store: StorePlacementPin,
  override?: StoreDraftLatLng | null,
): { lat: number; lng: number } {
  const view = MARKET_VIEW_CONFIG[marketId];

  const usablePair = (lat: number, lng: number) =>
    Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0);

  // 초안에 복사된 잘못된 시드 좌표(시장에서 멀리)는 무시. 실제 맵에서 찍은 위치만 통과.
  if (
    override &&
    typeof override.lat === "number" &&
    typeof override.lng === "number" &&
    usablePair(override.lat, override.lng) &&
    isLatLngNearMarket(marketId, override.lat, override.lng)
  ) {
    return { lat: override.lat, lng: override.lng };
  }

  if (typeof store.lat === "number" && typeof store.lng === "number" && usablePair(store.lat, store.lng)) {
    // 잘못된 시드 좌표(시장에서 수백 m 이상)는 무시하고 mx/my로 보정
    if (isLatLngNearMarket(marketId, store.lat, store.lng)) {
      return { lat: store.lat, lng: store.lng };
    }
  }

  if (typeof store.mx === "number" && typeof store.my === "number") {
    const fromMxMy = toStoreLatLng(view.center, store.mx, store.my);
    if (isLatLngInsideMarketArea(marketId, fromMxMy.lat, fromMxMy.lng)) {
      return fromMxMy;
    }
    // 폴리곤 밖이어도 중심 근처면 mx/my 결과를 사용 (영역이 아주 좁을 때)
    if (roughMeters(view.center, fromMxMy) <= 400) {
      return fromMxMy;
    }
  }

  return spiralLatLng(marketId, store.id);
}
